import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { Tuteliq } from '../src/client.js';
import { TimeoutError, ServerError, VerificationLimitError } from '../src/errors.js';
import {
    DocumentType,
    VerificationMode,
    ChipPolicy,
    VerificationCheck,
    DocumentEvidence,
    VerificationSessionStatus,
    WebhookEventType,
} from '../src/constants.js';
import { verifyWebhookSignature } from '../src/webhooks.js';
import type { VerificationSessionResult, WebhookPayload } from '../src/types/index.js';

const API_BASE_URL = 'https://api.tuteliq.ai';

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

function sentBody(fetchSpy: ReturnType<typeof vi.spyOn>, call = 0): Record<string, unknown> {
    return JSON.parse((fetchSpy.mock.calls[call][1] as RequestInit).body as string);
}

const createdSession = {
    session_id: 'sess_example_1',
    mobile_url: 'https://verify.tuteliq.ai/age/?session=sess_example_1&token=tok_example',
    expires_at: 1787253193747,
    mode: 'age',
    verification_mode: 'full',
    chip_policy: 'instead_of_photo',
    recommended_image_width: 3264,
};

describe('verification constants', () => {
    it('DocumentType sends the national ID value the API accepts', () => {
        expect(DocumentType.NATIONAL_ID).toBe('national_id');
        // Kept for existing callers; it now sends the accepted value.
        expect(DocumentType.ID_CARD).toBe('national_id');
        expect([...new Set(Object.values(DocumentType))].sort()).toEqual(['drivers_license', 'national_id', 'passport']);
    });

    it('session status includes document_required', () => {
        expect(VerificationSessionStatus.DOCUMENT_REQUIRED).toBe('document_required');
    });

    it('exposes chip policy, check and document evidence values', () => {
        expect(Object.values(ChipPolicy)).toEqual(['optional', 'required', 'instead_of_photo']);
        expect(Object.values(VerificationCheck)).toEqual(['full', 'liveness_only']);
        expect(Object.values(DocumentEvidence)).toEqual(['photo', 'chip', 'photo_and_chip']);
    });

    it('webhook events include verification and CSAM events', () => {
        expect(WebhookEventType.VERIFICATION_COMPLETED).toBe('verification.completed');
        expect(WebhookEventType.MINOR_DETECTED).toBe('minor.detected');
        expect(WebhookEventType.CSAM_DETECTED).toBe('csam.detected');
        expect(WebhookEventType.CSAM_CRITICAL).toBe('csam.critical');
    });
});

describe('createVerificationSession', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sends DocumentType.ID_CARD as national_id', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(createdSession));

        await client.createVerificationSession({ mode: VerificationMode.IDENTITY, document_type: DocumentType.ID_CARD });

        expect(sentBody(fetchSpy).document_type).toBe('national_id');
    });

    it('sends chip_policy and returns it', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(createdSession));

        const session = await client.createVerificationSession({
            mode: VerificationMode.AGE,
            chip_policy: ChipPolicy.INSTEAD_OF_PHOTO,
        });

        expect(sentBody(fetchSpy).chip_policy).toBe('instead_of_photo');
        expect(session.chip_policy).toBe('instead_of_photo');
        expect(session.verification_mode).toBe('full');
    });

    it('does not send fields the API does not accept', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(createdSession));

        await client.createVerificationSession({
            mode: VerificationMode.AGE,
            redirect_url: 'https://example.com/done',
            external_id: 'ext_example',
            customer_id: 'cust_example',
            metadata: { source: 'onboarding' },
        });

        expect(sentBody(fetchSpy)).toEqual({ mode: 'age' });
    });

    it('is not retried after a timeout, so a lost response cannot create a second session', async () => {
        const client = new Tuteliq('test-api-key', { retries: 3, retryDelay: 1 });
        const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
        const fetchSpy = vi.spyOn(global, 'fetch')
            .mockRejectedValueOnce(abort)
            .mockResolvedValue(mockFetchResponse(createdSession));

        await expect(client.createVerificationSession({ mode: VerificationMode.AGE })).rejects.toThrow(TimeoutError);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('is not retried after a server error', async () => {
        const client = new Tuteliq('test-api-key', { retries: 3, retryDelay: 1 });
        const fetchSpy = vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce(mockFetchResponse(
                { error: { code: 'VERIFY_11015', message: 'The verification allowance could not be checked.' } },
                { ok: false, status: 503 },
            ))
            .mockResolvedValue(mockFetchResponse(createdSession));

        await expect(client.createVerificationSession({ mode: VerificationMode.AGE })).rejects.toThrow(ServerError);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('surfaces an exhausted verification allowance with its details', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const details = {
            reason: 'verification_limit_reached',
            period: '2026-11',
            next_period_start: '2026-12-01T00:00:00.000Z',
            included_per_month: 500,
            buy_credits_url: 'https://tuteliq.ai/dashboard/billing',
        };
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(
            { error: { code: 'VERIFY_11014', message: 'Your monthly verification allowance is used up.', details, request_id: 'req_example' } },
            { ok: false, status: 402 },
        ));

        const error = await client.createVerificationSession({ mode: VerificationMode.AGE }).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(VerificationLimitError);
        const limit = error as VerificationLimitError;
        expect(limit.statusCode).toBe(402);
        expect(limit.code).toBe('VERIFY_11014');
        expect(limit.requestId).toBe('req_example');
        expect(limit.limitDetails).toEqual(details);
    });
});

describe('getVerificationSession', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the served result, including the one-time document fields', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const served = {
            session_id: 'sess_example_1',
            status: 'completed',
            result: {
                status: 'verified',
                age: 34,
                age_range: null,
                is_minor: false,
                document_evidence: 'photo_and_chip',
                face_match: { matched: true, confidence: 0.97 },
                liveness: { valid: true },
                date_of_birth: '1992-04-01',
                failure_reasons: null,
                document: {
                    ocr_confidence: 91,
                    first_name: 'Alex',
                    last_name: 'Example',
                    document_type: 'passport',
                    chip_verified: true,
                    chip_issuer_trusted: true,
                    national_id: null,
                },
            },
            verification_mode: 'full',
            document_evidence: 'photo_and_chip',
            step_progress: 'done',
            chip_policy: 'optional',
            capture: null,
            created_at: 1787253000000,
            expires_at: 1787253900000,
        };
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(served));

        const status: VerificationSessionResult = await client.getVerificationSession('sess_example_1');

        expect(status.created_at).toBe(1787253000000);
        expect(status.verification_mode).toBe(VerificationCheck.FULL);
        expect(status.document_evidence).toBe(DocumentEvidence.PHOTO_AND_CHIP);
        expect(status.result?.document?.chip_verified).toBe(true);
        expect(status.result?.document?.last_name).toBe('Example');
    });
});

describe('getVerificationConfig', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('hits GET /api/v1/verify/age/config with country and region', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ mode: 'liveness_only', age_threshold: 18, country: 'US', market: 'US' }),
        );

        const config = await client.getVerificationConfig({ country: 'US', region: 'CA' });

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/v1/verify/age/config?country=US&region=CA`);
        expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('GET');
        expect(config.mode).toBe(VerificationCheck.LIVENESS_ONLY);
        expect(config.age_threshold).toBe(18);
    });

    it('sends no query string without arguments', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ mode: 'full', age_threshold: 18 }),
        );

        await client.getVerificationConfig();

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/v1/verify/age/config`);
    });
});

describe('getVerification', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('hits GET /api/v1/verify/{id}', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({
            verification_id: 'vrf_example',
            status: 'verified',
            age: 30,
            is_minor: false,
            ocr_confidence: 88,
            face_matched: true,
            face_confidence: 0.95,
            liveness_valid: true,
            failure_reasons: [],
            created_at: '2026-11-01T10:00:00.000Z',
        }));

        const result = await client.getVerification('vrf_example');

        expect(fetchSpy.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/v1/verify/vrf_example`);
        expect(result.ocr_confidence).toBe(88);
    });

    it('requires an ID', async () => {
        const client = new Tuteliq('test-api-key', { retries: 0 });
        await expect(client.getVerification('')).rejects.toThrow('Verification ID is required');
    });
});

describe('verifyWebhookSignature', () => {
    const secret = 'whsec_test_example_secret';
    const body = '{"id":"00000000-0000-4000-8000-000000000001","event":"verification.completed"}';
    const t = 1786000000;
    // Computed independently: hex HMAC-SHA256(secret, `${t}.${body}`).
    const knownV1 = '1e2bc5967c6151f8609014ae84da2bcc8e2946368ba3a190393dfc651da8dd58';
    const now = t * 1000;

    // The same construction the API uses to sign each delivery.
    function sign(payload: string, at: number, key = secret): string {
        const v1 = createHmac('sha256', key).update(`${at}.${payload}`).digest('hex');
        return `t=${at},v1=${v1}`;
    }

    it('accepts a known vector', async () => {
        expect(sign(body, t)).toBe(`t=${t},v1=${knownV1}`);
        await expect(verifyWebhookSignature(body, `t=${t},v1=${knownV1}`, secret, { now })).resolves.toBe(true);
    });

    it('accepts the raw body as bytes', async () => {
        const bytes = new TextEncoder().encode(body);
        await expect(verifyWebhookSignature(bytes, sign(body, t), secret, { now })).resolves.toBe(true);
    });

    it('accepts a header given as an array, as some frameworks pass repeated headers', async () => {
        await expect(verifyWebhookSignature(body, [sign(body, t)], secret, { now })).resolves.toBe(true);
    });

    it('rejects a modified body', async () => {
        await expect(verifyWebhookSignature(body.replace('verification', 'minor'), sign(body, t), secret, { now })).resolves.toBe(false);
    });

    it('rejects the wrong secret', async () => {
        await expect(verifyWebhookSignature(body, sign(body, t, 'whsec_other'), secret, { now })).resolves.toBe(false);
    });

    it('rejects a timestamp swapped onto a captured signature', async () => {
        const v1 = sign(body, t).split(',')[1];
        await expect(verifyWebhookSignature(body, `t=${t + 60},${v1}`, secret, { now })).resolves.toBe(false);
    });

    it('rejects a delivery outside the tolerance window, in either direction', async () => {
        await expect(verifyWebhookSignature(body, sign(body, t - 301), secret, { now })).resolves.toBe(false);
        await expect(verifyWebhookSignature(body, sign(body, t + 301), secret, { now })).resolves.toBe(false);
        await expect(verifyWebhookSignature(body, sign(body, t - 300), secret, { now })).resolves.toBe(true);
    });

    it('honours a custom tolerance', async () => {
        await expect(verifyWebhookSignature(body, sign(body, t - 30), secret, { now, toleranceSeconds: 10 })).resolves.toBe(false);
        await expect(verifyWebhookSignature(body, sign(body, t - 30), secret, { now, toleranceSeconds: 60 })).resolves.toBe(true);
    });

    it('defaults the clock to the current time', async () => {
        const at = Math.floor(Date.now() / 1000);
        await expect(verifyWebhookSignature(body, sign(body, at), secret)).resolves.toBe(true);
    });

    it.each([
        ['missing header', undefined],
        ['empty header', ''],
        ['no timestamp', `v1=${knownV1}`],
        ['no signature', `t=${t}`],
        ['non-numeric timestamp', `t=abc,v1=${knownV1}`],
        ['non-hex signature', `t=${t},v1=${'z'.repeat(64)}`],
        ['short signature', `t=${t},v1=${knownV1.slice(0, 62)}`],
        ['legacy body-only signature', createHmac('sha256', secret).update(body).digest('hex')],
    ])('rejects a malformed header (%s)', async (_label, header) => {
        await expect(verifyWebhookSignature(body, header, secret, { now })).resolves.toBe(false);
    });

    it('rejects an empty secret', async () => {
        await expect(verifyWebhookSignature(body, sign(body, t, ''), '', { now })).resolves.toBe(false);
    });

    it('types a verification delivery', () => {
        const payload: WebhookPayload = {
            id: '00000000-0000-4000-8000-000000000001',
            event: WebhookEventType.VERIFICATION_COMPLETED,
            timestamp: '2026-11-01T10:00:00.000Z',
            data: {
                type: 'age_verification',
                severity: 'low',
                riskScore: 0.1,
                summary: 'Verification verified',
                verification: {
                    status: 'verified',
                    verification_mode: 'liveness_only',
                    age: 31,
                    age_range: { low: 27, high: 35 },
                    is_minor: false,
                    date_of_birth: null,
                    document: null,
                    face_match: null,
                    liveness: { valid: true },
                    failure_reasons: null,
                },
            },
        };
        expect(payload.data.verification?.age_range?.low).toBe(27);
    });
});
