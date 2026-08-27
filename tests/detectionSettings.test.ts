import { describe, it, expect, vi, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';

// ---------------------------------------------------------------------------
// default_flag_profanity / default_flag_risk_terms existed on the API's
// GET/PUT /settings/detection since PR #149, but DetectionSettings and
// UpdateDetectionSettingsInput never declared them -- a caller could not set
// either default without an `as any` cast, and getDetectionSettings()'s
// return type hid them even though the raw JSON carried them through
// updateDetectionSettings/requestWithRetry's untyped passthrough.
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

describe('detection settings: default_flag_profanity / default_flag_risk_terms', () => {
    let client: Tuteliq;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('updateDetectionSettings: forwards default_flag_profanity and default_flag_risk_terms in the request body', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({
            success: true,
            settings: { default_flag_profanity: true, default_flag_risk_terms: true },
            message: 'Detection settings updated. Changes apply immediately to all API calls.',
        }));

        await client.updateDetectionSettings({ default_flag_profanity: true, default_flag_risk_terms: true });

        const body = bodySentIn(fetchSpy);
        expect(body.default_flag_profanity).toBe(true);
        expect(body.default_flag_risk_terms).toBe(true);
    });

    it('updateDetectionSettings: forwards an explicit false for either default (does not drop it)', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({
            success: true,
            settings: {},
            message: 'ok',
        }));

        await client.updateDetectionSettings({ default_flag_profanity: false, default_flag_risk_terms: false });

        const body = bodySentIn(fetchSpy);
        expect(body.default_flag_profanity).toBe(false);
        expect(body.default_flag_risk_terms).toBe(false);
    });

    it('updateDetectionSettings: coexists correctly with enabled_endpoints/default_context', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({
            success: true,
            settings: {},
            message: 'ok',
        }));

        await client.updateDetectionSettings({
            disabled_endpoints: ['gambling-harm'],
            default_context: { platform: 'discord' },
            default_flag_profanity: true,
        });

        const body = bodySentIn(fetchSpy);
        expect(body.disabled_endpoints).toEqual(['gambling-harm']);
        expect((body.default_context as Record<string, unknown>).platform).toBe('discord');
        expect(body.default_flag_profanity).toBe(true);
    });

    it('getDetectionSettings: types default_flag_profanity/default_flag_risk_terms on the result', async () => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({
            enabled_endpoints: [],
            disabled_endpoints: [],
            available_endpoints: ['bullying', 'unsafe'],
            default_flag_profanity: true,
            default_flag_risk_terms: false,
        }));

        const settings = await client.getDetectionSettings();
        expect(settings.default_flag_profanity).toBe(true);
        expect(settings.default_flag_risk_terms).toBe(false);
    });
});
