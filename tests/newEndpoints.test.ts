import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { ValidationError, NotFoundError } from '../src/errors.js';

function mockFetchResponse(data: unknown, options: { ok?: boolean; status?: number; headers?: Record<string, string> } = {}) {
    const { ok = true, status = 200, headers = {} } = options;
    return {
        ok,
        status,
        json: async () => data,
        headers: {
            get: (name: string) => headers[name.toLowerCase()] || null,
        },
    } as Response;
}

describe('Tuteliq — new endpoints sync', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ---------------------------------------------------------------------
    // Distress signals + TFGBV — wire-up tests (previously missing methods)
    // ---------------------------------------------------------------------

    describe('detectDistressSignals', () => {
        it('hits POST /api/v1/safety/distress-signals', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ detected: false, severity: 0.1, risk_score: 0.1, categories: [], evidence: [], rationale: '' }),
            );
            await client.detectDistressSignals({ content: 'hello' });
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/safety/distress-signals');
        });

        it('validates content', async () => {
            await expect(client.detectDistressSignals({ content: '' as any })).rejects.toThrow(ValidationError);
        });
    });

    describe('detectTFGBV', () => {
        it('hits POST /api/v1/safety/tfgbv', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ detected: false, severity: 0.1, risk_score: 0.1, categories: [], evidence: [], rationale: '' }),
            );
            await client.detectTFGBV({ content: 'hello' });
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/safety/tfgbv');
        });
    });

    // ---------------------------------------------------------------------
    // Customer encryption keys (#35)
    // ---------------------------------------------------------------------

    describe('registerEncryptionKey', () => {
        it('POSTs the algorithm + PEM to /account/encryption-key', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({
                    algorithm: 'RSA-OAEP-2048',
                    public_key_pem: '-----BEGIN PUBLIC KEY-----\nFAKE\n-----END PUBLIC KEY-----',
                    key_fingerprint: 'abcd1234',
                    registered_at: '2026-05-27T00:00:00Z',
                }),
            );
            const result = await client.registerEncryptionKey({
                algorithm: 'RSA-OAEP-2048',
                public_key_pem: '-----BEGIN PUBLIC KEY-----\nFAKE\n-----END PUBLIC KEY-----',
            });
            const call = fetchSpy.mock.calls[0];
            expect(call[0]).toBe('https://api.tuteliq.ai/api/v1/account/encryption-key');
            expect((call[1] as RequestInit).method).toBe('POST');
            expect(JSON.parse((call[1] as RequestInit).body as string).algorithm).toBe('RSA-OAEP-2048');
            expect(result.key_fingerprint).toBe('abcd1234');
        });
    });

    describe('getEncryptionKey', () => {
        it('returns the key when registered', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({
                    algorithm: 'RSA-OAEP-4096',
                    public_key_pem: 'PEM',
                    key_fingerprint: 'ff00',
                    registered_at: '2026-05-27T00:00:00Z',
                }),
            );
            const key = await client.getEncryptionKey();
            expect(key?.algorithm).toBe('RSA-OAEP-4096');
        });

        it('returns null when no key is registered (404)', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse(
                    { error: { code: 'NF_5001', message: 'No customer encryption key registered' } },
                    { ok: false, status: 404 },
                ),
            );
            const key = await client.getEncryptionKey();
            expect(key).toBeNull();
        });

        it('rethrows non-404 errors', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse(
                    { error: { code: 'SVC_4001', message: 'boom' } },
                    { ok: false, status: 500 },
                ),
            );
            await expect(client.getEncryptionKey()).rejects.not.toBeInstanceOf(NotFoundError);
        });
    });

    describe('revokeEncryptionKey', () => {
        it('DELETEs the endpoint', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ ok: true }),
            );
            const result = await client.revokeEncryptionKey();
            expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE');
            expect(result.ok).toBe(true);
        });
    });

    // ---------------------------------------------------------------------
    // Audit receipts (#33)
    // ---------------------------------------------------------------------

    describe('getAuditReceipt', () => {
        it('GETs /audit/receipts/:request_id with URL-encoded id', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({
                    payload: { v: 1, request_id: 'req_abc', timestamp: 't', endpoint: '/foo', decision: 'verified', deployer: 'dep', retention_class: 'limited-risk' },
                    signature: { algorithm: 'KMS_EC_P256_SHA256', key_id: 'k', signature: 'sig', signed_at: 't' },
                    canonical: '{}',
                }),
            );
            const r = await client.getAuditReceipt('req_abc/with slashes');
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/audit/receipts/req_abc%2Fwith%20slashes');
            expect(r.payload.request_id).toBe('req_abc');
        });

        it('rejects empty request_id', async () => {
            await expect(client.getAuditReceipt('')).rejects.toThrow(ValidationError);
        });
    });

    // ---------------------------------------------------------------------
    // Moderator review (#24)
    // ---------------------------------------------------------------------

    describe('reviewIncident', () => {
        it('POSTs to /incidents/:id/review with the action + reason_code', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({
                    incident_id: 'inc_1',
                    original: { risk_category: 'grooming', risk_level: 'high' },
                    revised: { risk_category: 'grooming', risk_level: 'moderate' },
                    audit_receipt: { request_id: 'req_x', timestamp: 't', signature: 'sig' },
                }),
            );
            const r = await client.reviewIncident('inc_1', {
                action: 'downgrade',
                reason_code: 'insufficient_severity',
                new_risk_level: 'moderate',
            });
            const call = fetchSpy.mock.calls[0];
            expect(call[0]).toBe('https://api.tuteliq.ai/api/v1/incidents/inc_1/review');
            expect((call[1] as RequestInit).method).toBe('POST');
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect(body.action).toBe('downgrade');
            expect(body.reason_code).toBe('insufficient_severity');
            expect(r.revised.risk_level).toBe('moderate');
        });

        it('rejects empty incident_id', async () => {
            await expect(
                client.reviewIncident('', { action: 'confirm', reason_code: 'confirmed_accurate' }),
            ).rejects.toThrow(ValidationError);
        });

        it('rejects action=reclassify without new_risk_category', async () => {
            await expect(
                client.reviewIncident('inc_1', { action: 'reclassify', reason_code: 'incorrect_category' }),
            ).rejects.toThrow(/new_risk_category/);
        });
    });
});
