import { describe, it, expect, vi, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';

// ---------------------------------------------------------------------------
// buildDetectionBody's handling of includeEvidence/verdictOnly, on the
// unified detection endpoints (fraud + safety-extended). Two bugs found
// while auditing this after the API-side verdict_only/rationale fix
// (Tuteliq/api PR #109):
//
// 1. `if (input.includeEvidence) options.include_evidence = true` only
//    handled the truthy case, so an explicit `includeEvidence: false` was
//    silently dropped and never reached the API at all — the caller's
//    choice to exclude evidence was ignored.
// 2. The SDK never wired `verdictOnly` to `includeEvidence` at all. The API
//    now infers `include_evidence: false` from `verdict_only: true` when
//    `include_evidence` isn't explicitly set, so the fix here is simply to
//    NOT send an explicit `include_evidence` when the caller didn't ask for
//    one — letting the server's inference apply — rather than duplicating
//    that inference client-side.
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

describe('buildDetectionBody — includeEvidence / verdictOnly forwarding', () => {
    let client: Tuteliq;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sends nothing for options when neither is set (server applies its own default)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ endpoint: 'romance-scam', detected: false, severity: 0, level: 'none', categories: [], recommended_action: 'none', rationale: '' }),
        );
        await client.detectRomanceScam({ content: 'hello' });
        const body = bodySentIn(fetchSpy);
        expect(body.options).toBeUndefined();
        expect(body.include_evidence).toBeUndefined();
    });

    it('forwards includeEvidence: true explicitly', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ endpoint: 'romance-scam', detected: false, severity: 0, level: 'none', categories: [], recommended_action: 'none', rationale: '' }),
        );
        await client.detectRomanceScam({ content: 'hello', includeEvidence: true });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).include_evidence).toBe(true);
        expect(body.include_evidence).toBe(true);
    });

    it('forwards includeEvidence: false explicitly (previously silently dropped)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ endpoint: 'romance-scam', detected: false, severity: 0, level: 'none', categories: [], recommended_action: 'none', rationale: '' }),
        );
        await client.detectRomanceScam({ content: 'hello', includeEvidence: false });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).include_evidence).toBe(false);
        expect(body.include_evidence).toBe(false);
    });

    it('forwards verdictOnly without forcing an explicit include_evidence, so the server can infer false', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ endpoint: 'romance-scam', detected: false, severity: 0, level: 'none', categories: [], recommended_action: 'none', rationale: '' }),
        );
        await client.detectRomanceScam({ content: 'hello', verdictOnly: true });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).verdict_only).toBe(true);
        expect((body.options as Record<string, unknown>).include_evidence).toBeUndefined();
    });

    it('verdictOnly + explicit includeEvidence:true sends both, letting the server honour the explicit value', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ endpoint: 'romance-scam', detected: false, severity: 0, level: 'none', categories: [], recommended_action: 'none', rationale: '' }),
        );
        await client.detectRomanceScam({ content: 'hello', verdictOnly: true, includeEvidence: true });
        const body = bodySentIn(fetchSpy);
        expect((body.options as Record<string, unknown>).verdict_only).toBe(true);
        expect((body.options as Record<string, unknown>).include_evidence).toBe(true);
    });
});
