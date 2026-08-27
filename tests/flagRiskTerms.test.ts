import { describe, it, expect, vi, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';

// ---------------------------------------------------------------------------
// flagRiskTerms mirrors flagProfanity (flagProfanity.test.ts): the API's
// options.flag_risk_terms / default_flag_risk_terms and the `risk_terms`
// result field existed on DetectBullyingInput/DetectUnsafeInput and
// BullyingResult/UnsafeResult server-side, but never made it into the SDK's
// types or request-building. Same explicit-true/false-must-both-reach-the-API
// requirement as flagProfanity: an explicit `false` must be distinguishable
// from "not sent at all", since the server's precedence is
// "explicit per-request value always wins over the account default".
// ---------------------------------------------------------------------------

function mockFetchResponse(data: unknown) {
    return {
        ok: true,
        status: 200,
        json: async () => data,
        headers: { get: () => null },
    } as Response;
}

function bodySentIn(fetchSpy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    return JSON.parse(init.body as string);
}

const bullyingResponse = {
    is_bullying: false,
    bullying_type: [],
    confidence: 0.9,
    severity: 'low',
    recommended_action: 'none',
    risk_score: 0.1,
};

const unsafeResponse = {
    unsafe: false,
    categories: [],
    severity: 'low',
    confidence: 0.9,
    risk_score: 0.1,
    recommended_action: 'none',
};

describe('flagRiskTerms forwarding', () => {
    let client: Tuteliq;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('detectBullying: sends nothing when flagRiskTerms is not set (server applies the account default)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'hello' });
        const body = bodySentIn(fetchSpy);
        expect(body.options).toBeUndefined();
    });

    it('detectBullying: forwards flagRiskTerms: true as options.flag_risk_terms', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'you should just kill yourself', flagRiskTerms: true });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_risk_terms).toBe(true);
    });

    it('detectBullying: forwards an explicit flagRiskTerms: false (does not drop it)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'hello', flagRiskTerms: false });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_risk_terms).toBe(false);
    });

    it('detectBullying: types and passes through the risk_terms field on the result', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ ...bullyingResponse, risk_terms: { detected: true, matches: [{ term: 'kill', category: 'violence' }] } }),
        );
        const result = await client.detectBullying({ content: 'kill', flagRiskTerms: true });
        expect(result.risk_terms).toEqual({ detected: true, matches: [{ term: 'kill', category: 'violence' }] });
        // Additive only -- untouched by the risk-term match.
        expect(result.is_bullying).toBe(false);
        expect(result.recommended_action).toBe('none');
    });

    it('detectUnsafe: forwards flagRiskTerms: true as options.flag_risk_terms', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(unsafeResponse));
        await client.detectUnsafe({ content: 'cocaine', flagRiskTerms: true });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_risk_terms).toBe(true);
    });

    it('detectUnsafe: forwards an explicit flagRiskTerms: false', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(unsafeResponse));
        await client.detectUnsafe({ content: 'hello', flagRiskTerms: false });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_risk_terms).toBe(false);
    });

    it('detectUnsafe: types and passes through the risk_terms field on the result', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ ...unsafeResponse, risk_terms: { detected: true, matches: [{ term: 'cocaine', category: 'drug' }] } }),
        );
        const result = await client.detectUnsafe({ content: 'cocaine', flagRiskTerms: true });
        expect(result.risk_terms).toEqual({ detected: true, matches: [{ term: 'cocaine', category: 'drug' }] });
        expect(result.unsafe).toBe(false);
        expect(result.recommended_action).toBe('none');
    });

    it('detectBullying: coexists correctly with flagProfanity and other options', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'hello', flagRiskTerms: true, flagProfanity: true, verdictOnly: true });
        const body = bodySentIn(fetchSpy);
        const options = body.options as Record<string, unknown>;
        expect(options.flag_risk_terms).toBe(true);
        expect(options.flag_profanity).toBe(true);
        expect(options.verdict_only).toBe(true);
    });

    // -------------------------------------------------------------------------
    // analyze() -- same gap flagProfanity had before it: accepted on
    // AnalyzeInput but never forwarded to the detectBullying/detectUnsafe
    // calls it fans out to.
    // -------------------------------------------------------------------------

    it('analyze(): forwards flagRiskTerms to both detectBullying and detectUnsafe', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(bullyingResponse));

        await client.analyze({ content: 'kill', flagRiskTerms: true });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        for (const call of fetchSpy.mock.calls) {
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect((body.options as Record<string, unknown>).flag_risk_terms).toBe(true);
        }
    });

    it('analyze(): forwards an explicit flagRiskTerms: false to both detectors', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(bullyingResponse));

        await client.analyze({ content: 'hello', flagRiskTerms: false });

        for (const call of fetchSpy.mock.calls) {
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect((body.options as Record<string, unknown>).flag_risk_terms).toBe(false);
        }
    });

    it('analyze(): sends nothing when flagRiskTerms is not set (server applies the account default)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(bullyingResponse));

        await client.analyze({ content: 'hello' });

        for (const call of fetchSpy.mock.calls) {
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect(body.options).toBeUndefined();
        }
    });

    it('analyze(): result.bullying/result.unsafe carry the risk_terms field through', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValue(
            mockFetchResponse({ ...bullyingResponse, risk_terms: { detected: true, matches: [{ term: 'kill', category: 'violence' }] } }),
        );

        const result = await client.analyze({ content: 'kill', flagRiskTerms: true });

        expect(result.bullying?.risk_terms).toEqual({ detected: true, matches: [{ term: 'kill', category: 'violence' }] });
        expect(result.unsafe?.risk_terms).toEqual({ detected: true, matches: [{ term: 'kill', category: 'violence' }] });
    });
});
