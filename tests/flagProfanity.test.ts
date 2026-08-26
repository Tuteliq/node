import { describe, it, expect, vi, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';

// ---------------------------------------------------------------------------
// flagProfanity was added to the API's DetectBullyingInput/DetectUnsafeInput
// (options.flag_profanity) and BullyingResult/UnsafeResult (profanity field)
// but never made it into the SDK's types or request-building — a client
// testing default_flag_profanity through the SDK saw no way to override it
// per-request and no `profanity` field on the typed result, even though the
// API supported both. Mirrors verdictOnlyIncludeEvidence.test.ts's pattern:
// assert on the actual request body sent to fetch, not just the TS types.
//
// Explicit true/false must both reach the API (not just truthy `true`) --
// the server's precedence is "explicit per-request value always wins over
// the account's default_flag_profanity setting", so an explicit `false`
// has to be distinguishable from "not sent at all".
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

const imageResponse = {
    vision: {
        extracted_text: 'some text',
        visual_categories: [],
        visual_severity: 'low',
        visual_confidence: 0.9,
        visual_description: 'a screenshot',
        contains_text: true,
        contains_faces: false,
    },
    overall_risk_score: 0.1,
    overall_severity: 'low',
    detected: false,
    confidence: 0.9,
    recommended_action: 'none',
    rationale: 'Safe',
};

const videoResponse = {
    frames_analyzed: 3,
    duration_seconds: 15,
    frame_results: [],
    categories: [],
    overall_risk_score: 0.1,
    overall_severity: 'low',
    detected: false,
    confidence: 0.9,
    recommended_action: 'none',
    rationale: 'Safe',
};

describe('flagProfanity forwarding', () => {
    let client: Tuteliq;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('detectBullying: sends nothing when flagProfanity is not set (server applies the account default)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'hello' });
        const body = bodySentIn(fetchSpy);
        expect(body.options).toBeUndefined();
    });

    it('detectBullying: forwards flagProfanity: true as options.flag_profanity', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'fucks sake', flagProfanity: true });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_profanity).toBe(true);
    });

    it('detectBullying: forwards an explicit flagProfanity: false (does not drop it like the includeEvidence bug did)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'hello', flagProfanity: false });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_profanity).toBe(false);
    });

    it('detectBullying: types and passes through the profanity field on the result', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ ...bullyingResponse, profanity: { detected: true, matches: ['fuck'] } }),
        );
        const result = await client.detectBullying({ content: 'fucks sake', flagProfanity: true });
        expect(result.profanity).toEqual({ detected: true, matches: ['fuck'] });
        // Additive only -- untouched by the profanity match.
        expect(result.is_bullying).toBe(false);
        expect(result.recommended_action).toBe('none');
    });

    it('detectUnsafe: forwards flagProfanity: true as options.flag_profanity', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(unsafeResponse));
        await client.detectUnsafe({ content: 'fucks sake', flagProfanity: true });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_profanity).toBe(true);
    });

    it('detectUnsafe: forwards an explicit flagProfanity: false', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(unsafeResponse));
        await client.detectUnsafe({ content: 'hello', flagProfanity: false });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).flag_profanity).toBe(false);
    });

    it('detectUnsafe: types and passes through the profanity field on the result', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ ...unsafeResponse, profanity: { detected: true, matches: ['fuck'] } }),
        );
        const result = await client.detectUnsafe({ content: 'fucks sake', flagProfanity: true });
        expect(result.profanity).toEqual({ detected: true, matches: ['fuck'] });
        expect(result.unsafe).toBe(false);
        expect(result.recommended_action).toBe('none');
    });

    it('detectBullying: coexists correctly with other options (supportThreshold, verdictOnly)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(bullyingResponse));
        await client.detectBullying({ content: 'hello', flagProfanity: true, verdictOnly: true, supportThreshold: 'high' });
        const body = bodySentIn(fetchSpy);
        const options = body.options as Record<string, unknown>;
        expect(options.flag_profanity).toBe(true);
        expect(options.verdict_only).toBe(true);
        expect(options.support_threshold).toBe('high');
    });

    // -------------------------------------------------------------------------
    // analyzeImage -- multipart/form-data request, not a JSON body, so
    // flag_profanity is asserted on the FormData sent to fetch rather than a
    // parsed JSON body.
    // -------------------------------------------------------------------------

    it('analyzeImage: sends nothing when flagProfanity is not set (server applies the account default)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(imageResponse));
        await client.analyzeImage({ file: Buffer.from('fake image'), filename: 'screenshot.png' });
        const body = fetchSpy.mock.calls[0][1]?.body as FormData;
        expect(body.get('flag_profanity')).toBeNull();
    });

    it('analyzeImage: forwards flagProfanity: true as flag_profanity', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(imageResponse));
        await client.analyzeImage({ file: Buffer.from('fake image'), filename: 'screenshot.png', flagProfanity: true });
        const body = fetchSpy.mock.calls[0][1]?.body as FormData;
        expect(body.get('flag_profanity')).toBe('true');
    });

    it('analyzeImage: forwards an explicit flagProfanity: false (does not drop it)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(imageResponse));
        await client.analyzeImage({ file: Buffer.from('fake image'), filename: 'screenshot.png', flagProfanity: false });
        const body = fetchSpy.mock.calls[0][1]?.body as FormData;
        expect(body.get('flag_profanity')).toBe('false');
    });

    it('analyzeImage: types and passes through the profanity field on the result', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ ...imageResponse, profanity: { detected: true, matches: ['fuck'] } }),
        );
        const result = await client.analyzeImage({ file: Buffer.from('fake image'), filename: 'screenshot.png', flagProfanity: true });
        expect(result.profanity).toEqual({ detected: true, matches: ['fuck'] });
        // Additive only -- untouched by the profanity match.
        expect(result.detected).toBe(false);
        expect(result.recommended_action).toBe('none');
    });

    // -------------------------------------------------------------------------
    // analyzeVideo -- same shape as analyzeImage's flag_profanity forwarding,
    // but over OCR text aggregated across every frame that has any. Closes
    // the evasion path opened by shipping profanity on image alone: burn the
    // same text into a video frame instead of a still and it would otherwise
    // never reach the word list.
    // -------------------------------------------------------------------------

    it('analyzeVideo: sends nothing when flagProfanity is not set (server applies the account default)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(videoResponse));
        await client.analyzeVideo({ file: Buffer.from('fake video'), filename: 'clip.mp4' });
        const body = fetchSpy.mock.calls[0][1]?.body as FormData;
        expect(body.get('flag_profanity')).toBeNull();
    });

    it('analyzeVideo: forwards flagProfanity: true as flag_profanity', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(videoResponse));
        await client.analyzeVideo({ file: Buffer.from('fake video'), filename: 'clip.mp4', flagProfanity: true });
        const body = fetchSpy.mock.calls[0][1]?.body as FormData;
        expect(body.get('flag_profanity')).toBe('true');
    });

    it('analyzeVideo: forwards an explicit flagProfanity: false (does not drop it)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(videoResponse));
        await client.analyzeVideo({ file: Buffer.from('fake video'), filename: 'clip.mp4', flagProfanity: false });
        const body = fetchSpy.mock.calls[0][1]?.body as FormData;
        expect(body.get('flag_profanity')).toBe('false');
    });

    it('analyzeVideo: types and passes through the profanity field on the result', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ ...videoResponse, profanity: { detected: true, matches: ['fuck'] } }),
        );
        const result = await client.analyzeVideo({ file: Buffer.from('fake video'), filename: 'clip.mp4', flagProfanity: true });
        expect(result.profanity).toEqual({ detected: true, matches: ['fuck'] });
        // Additive only -- untouched by the profanity match.
        expect(result.detected).toBe(false);
        expect(result.recommended_action).toBe('none');
    });

    // -------------------------------------------------------------------------
    // analyze() -- same gap verdictOnly had (accepted on AnalyzeInput, never
    // forwarded to the detectBullying/detectUnsafe calls it fans out to).
    // Account default still applied without this, so it never blocked anyone,
    // but per-request override wasn't reachable through analyze().
    // -------------------------------------------------------------------------

    it('analyze(): forwards flagProfanity to both detectBullying and detectUnsafe', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(bullyingResponse));

        await client.analyze({ content: 'fucks sake', flagProfanity: true });

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        for (const call of fetchSpy.mock.calls) {
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect((body.options as Record<string, unknown>).flag_profanity).toBe(true);
        }
    });

    it('analyze(): forwards an explicit flagProfanity: false to both detectors', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(bullyingResponse));

        await client.analyze({ content: 'hello', flagProfanity: false });

        for (const call of fetchSpy.mock.calls) {
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect((body.options as Record<string, unknown>).flag_profanity).toBe(false);
        }
    });

    it('analyze(): sends nothing when flagProfanity is not set (server applies the account default)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse(bullyingResponse));

        await client.analyze({ content: 'hello' });

        for (const call of fetchSpy.mock.calls) {
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect(body.options).toBeUndefined();
        }
    });

    it('analyze(): result.bullying/result.unsafe carry the profanity field through', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValue(
            mockFetchResponse({ ...bullyingResponse, profanity: { detected: true, matches: ['fuck'] } }),
        );

        const result = await client.analyze({ content: 'fucks sake', flagProfanity: true });

        expect(result.bullying?.profanity).toEqual({ detected: true, matches: ['fuck'] });
        expect(result.unsafe?.profanity).toEqual({ detected: true, matches: ['fuck'] });
    });
});
