import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { ValidationError, TuteliqError } from '../src/errors.js';

function mockFetchResponse(data: unknown, options: { ok?: boolean; status?: number } = {}) {
    const { ok = true, status = 200 } = options;
    return {
        ok,
        status,
        json: async () => data,
        headers: { get: () => null },
    } as Response;
}

function bodySentIn(fetchSpy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
    return JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
}

describe('verifyImageMatch', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const response = {
        schema_version: '1.0',
        checks_run: ['face_match', 'age'],
        face_match: { matched: true, similarity: 0.91 },
        age: { estimated_age: 30, confidence: 0.98 },
        credits_used: 3,
        processing_ms: 420,
        external_id: 'ext-1',
    };

    it('posts JSON to /api/v1/verify-image-match with images base64-encoded', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(response));
        const image = Buffer.from([1, 2, 3, 4]);
        const reference = new Uint8Array([5, 6, 7]);

        const result = await client.verifyImageMatch({
            image,
            referenceImage: reference,
            checks: ['face_match', 'age'],
            external_id: 'ext-1',
            customer_id: 'cust-1',
            metadata: { source: 'test' },
            incident_moderation_enabled: false,
        });

        expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/verify-image-match');
        expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('POST');
        expect(bodySentIn(fetchSpy)).toEqual({
            image: Buffer.from([1, 2, 3, 4]).toString('base64'),
            reference_image: Buffer.from([5, 6, 7]).toString('base64'),
            checks: ['face_match', 'age'],
            external_id: 'ext-1',
            customer_id: 'cust-1',
            metadata: { source: 'test' },
            incident_moderation_enabled: false,
        });
        expect(result).toEqual(response);
    });

    it('passes a base64 string through unchanged and omits unset fields', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(response));
        await client.verifyImageMatch({ image: 'AQIDBA==' });
        expect(bodySentIn(fetchSpy)).toEqual({ image: 'AQIDBA==' });
    });

    it('rejects a missing image before calling the API', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch');
        await expect(client.verifyImageMatch({ image: '' })).rejects.toThrow(ValidationError);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('getSafetyClassification', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const classification = {
        date: '2026-11-07',
        score: 88,
        band: 'leading',
        insufficient_data: false,
        reason: null,
        period: 'all_time',
        components: [{ key: 'reviewCoverage', label: 'Review coverage', points: 30, max: 30, tip: null }],
        evidence: {
            incident_count: 120,
            reviewed_count: 118,
            median_review_minutes: 14,
            oldest_open_days: 0,
            modalities_live: ['text'],
            applicable_modalities: ['text'],
            connected_platforms: 1,
            calculated_at: '2026-11-07T02:15:00.000Z',
        },
        calculated_at: '2026-11-07T02:15:00.000Z',
        updated_at: '2026-11-07T02:15:01.000Z',
        disclaimer: 'Operational classification, not a certification.',
    };

    it('GETs /api/v1/safety-classification and returns the stored classification', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(classification));
        const result = await client.getSafetyClassification();

        expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/safety-classification');
        expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('GET');
        expect(result).toEqual({ exists: true, classification });
    });

    it('keeps a null score as null when data is insufficient', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({
            ...classification, score: null, band: null, insufficient_data: true, reason: 'Not enough incidents yet.',
        }));
        const result = await client.getSafetyClassification();

        expect(result.exists).toBe(true);
        if (result.exists) {
            expect(result.classification.score).toBeNull();
            expect(result.classification.insufficient_data).toBe(true);
        }
    });

    it('answers exists: false on 404, never a zero score', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(
            { error: 'no_classification', message: 'No safety classification exists for this account yet.' },
            { ok: false, status: 404 },
        ));
        const result = await client.getSafetyClassification();

        expect(result).toEqual({ exists: false });
    });

    it('still throws on other errors', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(
            { error: { code: 'AUTH_1001', message: 'Invalid API key' } },
            { ok: false, status: 401 },
        ));
        await expect(client.getSafetyClassification()).rejects.toThrow(TuteliqError);
    });
});
