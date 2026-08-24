import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { ValidationError } from '../src/errors.js';

function mockFetchResponse(data: unknown, options: { ok?: boolean; status?: number } = {}) {
    const { ok = true, status = 200 } = options;
    return {
        ok,
        status,
        json: async () => data,
        headers: { get: () => null },
    } as unknown as Response;
}

/** The shape POST /api/v1/batch/analyze actually returns. */
function apiBatchResponse(items: Array<{ id: string; type: string; success?: boolean }>) {
    return {
        results: items.map(i => ({
            id: i.id,
            type: i.type,
            success: i.success ?? true,
            ...(i.success === false
                ? { error: 'analysis failed', error_code: 'SVC_4001' }
                : { result: { severity: 'low' }, credits_used: 2 }),
        })),
        summary: {
            total: items.length,
            successful: items.filter(i => i.success !== false).length,
            failed: items.filter(i => i.success === false).length,
            processingTimeMs: 412,
            total_credits_used: 2 * items.filter(i => i.success !== false).length,
        },
    };
}

function bodyOf(fetchSpy: ReturnType<typeof vi.spyOn>): any {
    return JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
}

describe('Tuteliq.batch', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // -------------------------------------------------------------------
    // Request shape — the API requires { id, type, data }
    // -------------------------------------------------------------------

    it('sends every item as { id, type, data }', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([{ id: 'item-0', type: 'bullying' }])),
        );

        await client.batch({ items: [{ type: 'bullying', content: 'you are a loser' }] });

        const body = bodyOf(fetchSpy);
        expect(Object.keys(body.items[0]).sort()).toEqual(['data', 'id', 'type']);
        expect(body.items[0].data.text).toBe('you are a loser');
        // The old shape put `text` on the item itself and sent no id at all,
        // which the route rejected outright.
        expect(body.items[0].content).toBeUndefined();
        expect(body.items[0].text).toBeUndefined();
    });

    it('generates a positional id when the caller does not supply one', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([
                { id: 'item-0', type: 'bullying' },
                { id: 'item-1', type: 'unsafe' },
            ])),
        );

        await client.batch({
            items: [
                { type: 'bullying', content: 'a' },
                { type: 'unsafe', content: 'b' },
            ],
        });

        expect(bodyOf(fetchSpy).items.map((i: any) => i.id)).toEqual(['item-0', 'item-1']);
    });

    it('uses the caller id when supplied and keeps external_id separate', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([{ id: 'msg-42', type: 'bullying' }])),
        );

        const result = await client.batch({
            items: [{ id: 'msg-42', type: 'bullying', content: 'a', external_id: 'crm-999' }],
        });

        const body = bodyOf(fetchSpy);
        expect(body.items[0].id).toBe('msg-42');
        // external_id is the caller's own record id; it is not the batch id and
        // is not sent as one.
        expect(body.items[0].external_id).toBeUndefined();
        expect(result.results[0].id).toBe('msg-42');
        expect(result.results[0].external_id).toBe('crm-999');
    });

    it('sends parallel at the top level, not nested under options', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([{ id: 'item-0', type: 'bullying' }])),
        );

        await client.batch({ items: [{ type: 'bullying', content: 'a' }], parallel: false });

        const body = bodyOf(fetchSpy);
        expect(body.parallel).toBe(false);
        expect(body.options).toBeUndefined();
    });

    // -------------------------------------------------------------------
    // Per-type payloads
    // -------------------------------------------------------------------

    it('maps grooming messages to sender_role/text under data', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([{ id: 'item-0', type: 'grooming' }])),
        );

        await client.batch({
            items: [{
                type: 'grooming',
                childAge: 12,
                messages: [
                    { role: 'adult', content: 'what school do you go to?' },
                    { role: 'child', content: 'why?' },
                ],
            }],
        });

        const data = bodyOf(fetchSpy).items[0].data;
        expect(data.messages).toEqual([
            { sender_role: 'adult', text: 'what school do you go to?' },
            { sender_role: 'child', text: 'why?' },
        ]);
        expect(data.context.child_age).toBe(12);
    });

    it('maps emotions messages to sender/text, not sender_role', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([{ id: 'item-0', type: 'emotions' }])),
        );

        await client.batch({
            items: [{ type: 'emotions', messages: [{ sender: 'alex', content: 'i feel awful' }] }],
        });

        expect(bodyOf(fetchSpy).items[0].data.messages).toEqual([
            { sender: 'alex', text: 'i feel awful' },
        ]);
    });

    it('wraps a bare emotions content into a one-message conversation', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([{ id: 'item-0', type: 'emotions' }])),
        );

        await client.batch({ items: [{ type: 'emotions', content: 'i feel awful' }] });

        // The endpoint is message-based and would otherwise see no messages.
        expect(bodyOf(fetchSpy).items[0].data.messages).toEqual([
            { sender: 'user', text: 'i feel awful' },
        ]);
    });

    it('accepts the fraud and extended detection types', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([
                { id: 'item-0', type: 'romance_scam' },
                { id: 'item-1', type: 'radicalisation' },
            ])),
        );

        await client.batch({
            items: [
                { type: 'romance_scam', content: 'send me an itunes card my love' },
                { type: 'radicalisation', content: 'they are not like us' },
            ],
        });

        expect(bodyOf(fetchSpy).items.map((i: any) => i.type)).toEqual([
            'romance_scam',
            'radicalisation',
        ]);
    });

    // -------------------------------------------------------------------
    // Response normalisation
    // -------------------------------------------------------------------

    it('restores index, processing_time_ms and credits from the API response', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([
                { id: 'item-0', type: 'bullying' },
                { id: 'item-1', type: 'unsafe', success: false },
            ])),
        );

        const result = await client.batch({
            items: [
                { type: 'bullying', content: 'a' },
                { type: 'unsafe', content: 'b' },
            ],
        });

        expect(result.results.map(r => r.index)).toEqual([0, 1]);
        expect(result.results[0].credits_used).toBe(2);
        expect(result.results[1].success).toBe(false);
        expect(result.results[1].error).toBe('analysis failed');
        // summary.processingTimeMs on the wire, processing_time_ms in the SDK.
        expect(result.processing_time_ms).toBe(412);
        expect(result.summary.total_credits_used).toBe(2);
    });

    it('maps results back by id even when the API reorders them', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(apiBatchResponse([
                { id: 'b', type: 'unsafe' },
                { id: 'a', type: 'bullying' },
            ])),
        );

        const result = await client.batch({
            items: [
                { id: 'a', type: 'bullying', content: 'a', external_id: 'ext-a' },
                { id: 'b', type: 'unsafe', content: 'b', external_id: 'ext-b' },
            ],
        });

        expect(result.results.map(r => [r.id, r.index, r.external_id])).toEqual([
            ['b', 1, 'ext-b'],
            ['a', 0, 'ext-a'],
        ]);
    });

    // -------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------

    it('rejects an empty batch', async () => {
        await expect(client.batch({ items: [] })).rejects.toThrow(ValidationError);
    });

    it('rejects more than 50 items', async () => {
        const items = Array.from({ length: 51 }, (_, i) => ({
            type: 'bullying' as const,
            content: `msg ${i}`,
        }));
        await expect(client.batch({ items })).rejects.toThrow(ValidationError);
    });
});

describe('Tuteliq detection endpoints — continuation token', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('forwards continuationToken on the unified detection endpoints', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ detected: false, severity: 0.1, risk_score: 0.1, categories: [] }),
        );

        await client.detectCoerciveControl({ content: 'hello', continuationToken: 'tok-abc' });

        const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
        expect(body.continuation_token).toBe('tok-abc');
    });

    it('forwards resetConversation', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ detected: false, severity: 0.1, risk_score: 0.1, categories: [] }),
        );

        await client.detectDistressSignals({ content: 'hello', resetConversation: true });

        const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
        expect(body.reset_conversation).toBe(true);
    });

    it('omits both when not supplied', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ detected: false, severity: 0.1, risk_score: 0.1, categories: [] }),
        );

        await client.detectAppFraud({ content: 'hello' });

        const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
        expect('continuation_token' in body).toBe(false);
        expect('reset_conversation' in body).toBe(false);
    });
});

describe('Tuteliq.createVerificationSession', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('passes through recommended_image_width and verification_mode', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({
                session_id: 'sess-1',
                mobile_url: 'https://verify.tuteliq.ai/age/?session=sess-1&token=t',
                expires_at: 1787253193747,
                mode: 'age',
                verification_mode: 'document_and_selfie',
                recommended_image_width: 3264,
            }),
        );

        const session = await client.createVerificationSession({ mode: 'age' });

        expect(session.url).toContain('/age/?session=sess-1');
        expect(session.recommended_image_width).toBe(3264);
        expect(session.verification_mode).toBe('document_and_selfie');
    });
});
