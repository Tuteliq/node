/**
 * Webhook signature verification.
 *
 * Every delivery carries
 *
 *   X-Tuteliq-Signature-V2: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, `${t}.${rawBody}`)>
 *
 * The timestamp is inside the signed string, so a captured delivery cannot be
 * given a fresh one. Uses Web Crypto, so it runs in Node 18+, browsers and
 * edge runtimes.
 */

export interface VerifyWebhookSignatureOptions {
    /** Maximum age (or clock skew ahead) of a delivery, in seconds. Default 300. */
    toleranceSeconds?: number;
    /** Current time in epoch milliseconds. Defaults to `Date.now()`; for tests. */
    now?: number;
}

const DEFAULT_TOLERANCE_SECONDS = 300;
const SIGNATURE_HEX = /^[0-9a-f]{64}$/i;

interface ParsedSignatureHeader {
    timestamp: number;
    signatures: string[];
}

function parseSignatureHeader(header: string): ParsedSignatureHeader | null {
    let timestamp: number | null = null;
    const signatures: string[] = [];

    for (const part of header.split(',')) {
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        if (key === 't' && /^\d+$/.test(value)) timestamp = Number(value);
        if (key === 'v1' && SIGNATURE_HEX.test(value)) signatures.push(value);
    }

    if (timestamp === null || signatures.length === 0) return null;
    return { timestamp, signatures };
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

async function getSubtle(): Promise<SubtleCrypto> {
    if (globalThis.crypto?.subtle) return globalThis.crypto.subtle;
    // Node 18 does not expose Web Crypto as a global.
    const { webcrypto } = await import('node:crypto');
    return webcrypto.subtle as SubtleCrypto;
}

function signedBytes(timestamp: number, rawBody: string | Uint8Array): Uint8Array<ArrayBuffer> {
    const encoder = new TextEncoder();
    const prefix = encoder.encode(`${timestamp}.`);
    const body = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody;
    const out = new Uint8Array(prefix.length + body.length);
    out.set(prefix, 0);
    out.set(body, prefix.length);
    return out;
}

/**
 * Verify the `X-Tuteliq-Signature-V2` header of a webhook delivery.
 *
 * Pass the raw request body exactly as received (before any JSON parsing),
 * the header value, and the webhook's signing secret. Resolves `true` only
 * when the signature matches and the timestamp is within the tolerance
 * window. The comparison is constant-time. For full replay protection, also
 * drop deliveries whose payload `id` you have already processed.
 *
 * @example
 * ```typescript
 * import { verifyWebhookSignature, type WebhookPayload } from '@tuteliq/sdk'
 *
 * app.post('/webhooks/tuteliq', express.raw({ type: 'application/json' }), async (req, res) => {
 *   const ok = await verifyWebhookSignature(
 *     req.body,
 *     req.get('X-Tuteliq-Signature-V2'),
 *     process.env.TUTELIQ_WEBHOOK_SECRET!,
 *   )
 *   if (!ok) return res.status(400).end()
 *   const payload: WebhookPayload = JSON.parse(req.body.toString('utf8'))
 *   // ...
 *   res.status(200).end()
 * })
 * ```
 */
export async function verifyWebhookSignature(
    rawBody: string | Uint8Array,
    header: string | string[] | null | undefined,
    secret: string,
    options: VerifyWebhookSignatureOptions = {}
): Promise<boolean> {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value || !secret) return false;

    const parsed = parseSignatureHeader(value);
    if (!parsed) return false;

    const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
    const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
    if (Math.abs(nowSeconds - parsed.timestamp) > tolerance) return false;

    const subtle = await getSubtle();
    const key = await subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );
    const data = signedBytes(parsed.timestamp, rawBody);

    // subtle.verify compares in constant time.
    for (const signature of parsed.signatures) {
        if (await subtle.verify('HMAC', key, hexToBytes(signature), data)) return true;
    }
    return false;
}
