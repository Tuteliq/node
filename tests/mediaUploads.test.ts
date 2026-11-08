import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';

// ---------------------------------------------------------------------------
// Form fields on the multipart media endpoints. Asserted on the FormData sent
// to fetch, since these routes take multipart/form-data, not a JSON body.
// ---------------------------------------------------------------------------

function mockFetchResponse(data: unknown) {
    return {
        ok: true,
        status: 200,
        json: async () => data,
        headers: { get: () => null },
    } as Response;
}

function formSentIn(fetchSpy: ReturnType<typeof vi.spyOn>): FormData {
    return fetchSpy.mock.calls[0][1]?.body as FormData;
}

const file = Buffer.from('fake bytes');

describe('media upload form fields', () => {
    let client: Tuteliq;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockFetchResponse({}));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('incident_moderation_enabled', () => {
        const cases: Array<[string, (value: boolean) => Promise<unknown>]> = [
            ['analyzeVoice', (v) => client.analyzeVoice({ file, filename: 'a.mp3', incident_moderation_enabled: v })],
            ['analyzeImage', (v) => client.analyzeImage({ file, filename: 'a.png', incident_moderation_enabled: v })],
            ['analyzeVideo', (v) => client.analyzeVideo({ file, filename: 'a.mp4', incident_moderation_enabled: v })],
            ['analyzeDocument', (v) => client.analyzeDocument({ file, filename: 'a.pdf', incident_moderation_enabled: v })],
        ];

        for (const [name, call] of cases) {
            it(`${name}: forwards an explicit false`, async () => {
                await call(false);
                expect(formSentIn(fetchSpy).get('incident_moderation_enabled')).toBe('false');
            });

            it(`${name}: forwards true`, async () => {
                await call(true);
                expect(formSentIn(fetchSpy).get('incident_moderation_enabled')).toBe('true');
            });
        }

        it('sends nothing when not set (the account setting applies)', async () => {
            await client.analyzeImage({ file, filename: 'a.png' });
            expect(formSentIn(fetchSpy).get('incident_moderation_enabled')).toBeNull();
        });
    });

    describe('flagRiskTerms on image and video', () => {
        it('analyzeImage: sends nothing when not set', async () => {
            await client.analyzeImage({ file, filename: 'a.png' });
            expect(formSentIn(fetchSpy).get('flag_risk_terms')).toBeNull();
        });

        it('analyzeImage: forwards true and an explicit false', async () => {
            await client.analyzeImage({ file, filename: 'a.png', flagRiskTerms: true });
            expect(formSentIn(fetchSpy).get('flag_risk_terms')).toBe('true');
            fetchSpy.mockClear();
            await client.analyzeImage({ file, filename: 'a.png', flagRiskTerms: false });
            expect(formSentIn(fetchSpy).get('flag_risk_terms')).toBe('false');
        });

        it('analyzeVideo: forwards true and an explicit false', async () => {
            await client.analyzeVideo({ file, filename: 'a.mp4', flagRiskTerms: true });
            expect(formSentIn(fetchSpy).get('flag_risk_terms')).toBe('true');
            fetchSpy.mockClear();
            await client.analyzeVideo({ file, filename: 'a.mp4', flagRiskTerms: false });
            expect(formSentIn(fetchSpy).get('flag_risk_terms')).toBe('false');
        });

        it('analyzeImage: passes the risk_terms result through', async () => {
            const riskTerms = { detected: true, matches: [{ term: 'example', category: 'drug' }] };
            fetchSpy.mockResolvedValueOnce(mockFetchResponse({ risk_terms: riskTerms }));
            const result = await client.analyzeImage({ file, filename: 'a.png', flagRiskTerms: true });
            expect(result.risk_terms).toEqual(riskTerms);
        });
    });

    describe('analyzeVideo options', () => {
        it('forwards analysisType and maxFrames', async () => {
            await client.analyzeVideo({ file, filename: 'a.mp4', analysisType: 'unsafe', maxFrames: 15 });
            const form = formSentIn(fetchSpy);
            expect(form.get('analysis_type')).toBe('unsafe');
            expect(form.get('max_frames')).toBe('15');
        });

        it('sends neither when not set', async () => {
            await client.analyzeVideo({ file, filename: 'a.mp4' });
            const form = formSentIn(fetchSpy);
            expect(form.get('analysis_type')).toBeNull();
            expect(form.get('max_frames')).toBeNull();
        });
    });

    describe('analyzeDocument', () => {
        it('forwards splitBySender for a screenshot', async () => {
            await client.analyzeDocument({ file, filename: 'chat.png', splitBySender: true });
            const form = formSentIn(fetchSpy);
            expect(form.get('split_by_sender')).toBe('true');
            expect((form.get('file') as Blob).type).toBe('image/png');
        });

        it('sends no split_by_sender when not set', async () => {
            await client.analyzeDocument({ file, filename: 'report.pdf' });
            expect(formSentIn(fetchSpy).get('split_by_sender')).toBeNull();
        });
    });

    describe('fileId on synthetic media', () => {
        it('detectSyntheticImage forwards file_id', async () => {
            await client.detectSyntheticImage({ file, filename: 'a.jpg', fileId: 'img-1' });
            expect(formSentIn(fetchSpy).get('file_id')).toBe('img-1');
        });

        it('detectSyntheticAudio forwards file_id', async () => {
            await client.detectSyntheticAudio({ file, filename: 'a.mp3', fileId: 'aud-1' });
            expect(formSentIn(fetchSpy).get('file_id')).toBe('aud-1');
        });

        it('detectSyntheticVideo forwards file_id', async () => {
            await client.detectSyntheticVideo({ file, filename: 'a.mp4', fileId: 'vid-1' });
            expect(formSentIn(fetchSpy).get('file_id')).toBe('vid-1');
        });
    });
});
