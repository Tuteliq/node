import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { ValidationError } from '../src/errors.js';

function mockFetchResponse(data: unknown) {
    return {
        ok: true,
        status: 200,
        json: async () => data,
        headers: { get: () => null },
    } as unknown as Response;
}

function sentBody(spy: ReturnType<typeof vi.spyOn>, call = 0): Record<string, any> {
    return JSON.parse((spy.mock.calls[call][1] as RequestInit).body as string);
}

/**
 * Request bugs in the text detection methods: each of these sent a field the
 * API does not read, or could not send one it does.
 */
describe('Text detection request bugs', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('analyzeEmotions', () => {
        it('sends the declared age as context.age_group, the only key the route reads', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
            await client.analyzeEmotions({ content: 'hello', context: { ageGroup: '11-13', platform: 'MyApp' } });
            expect(sentBody(spy).context).toEqual({ age_group: '11-13' });
        });

        it('omits context when no age group is declared', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
            await client.analyzeEmotions({ content: 'hello', context: 'MyApp' });
            expect(sentBody(spy).context).toBeUndefined();
        });

        it('forwards incident_moderation_enabled', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
            await client.analyzeEmotions({ content: 'hello', incident_moderation_enabled: false });
            expect(sentBody(spy).incident_moderation_enabled).toBe(false);
        });

        it('batch emotions items send context.age_group too', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ results: [] }));
            await client.batch({ items: [{ type: 'emotions', content: 'hello', context: { ageGroup: '14-17' } }] });
            expect(sentBody(spy).items[0].data.context).toEqual({ age_group: '14-17' });
        });
    });

    describe('getActionPlan', () => {
        it('rejects an audience the API does not accept before sending', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
            await expect(
                client.getActionPlan({ situation: 'Someone is spreading rumours', audience: 'educator' as any }),
            ).rejects.toThrow(ValidationError);
            expect(spy).not.toHaveBeenCalled();
        });

        it('returns approx_reading_level, and keeps reading_level populated from it', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ audience: 'parent', steps: ['a'], tone: 'calm', approx_reading_level: 'grade 6' }),
            );
            const plan = await client.getActionPlan({ situation: 'Someone is spreading rumours' });
            expect(plan.approx_reading_level).toBe('grade 6');
            expect(plan.reading_level).toBe('grade 6');
        });
    });

    describe('generateReport', () => {
        it('sends conversation_id and timestamp_range in meta, and nothing the route drops', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
            await client.generateReport({
                messages: [{ sender: 'a', content: 'hi' }],
                childAge: 12,
                conversationId: 'conv-1',
                timestampRange: ['2026-11-01T10:00:00Z', '2026-11-01T11:00:00Z'],
                incident: { type: 'bullying', notes: 'n' },
            });
            expect(sentBody(spy).meta).toEqual({
                child_age: 12,
                conversation_id: 'conv-1',
                timestamp_range: ['2026-11-01T10:00:00Z', '2026-11-01T11:00:00Z'],
            });
        });
    });

    describe('analyseMulti', () => {
        it('forwards flagProfanity and flagRiskTerms as options', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ results: [], summary: {} }));
            await client.analyseMulti({
                content: 'hello',
                detections: ['bullying', 'unsafe'],
                flagProfanity: true,
                flagRiskTerms: false,
            });
            expect(sentBody(spy).options).toEqual({ flag_profanity: true, flag_risk_terms: false });
        });

        it('does not send verdict_only, which the multi route does not accept', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ results: [], summary: {} }));
            await client.analyseMulti({ content: 'hello', detections: ['bullying'], verdictOnly: true });
            expect(sentBody(spy).options).toBeUndefined();
        });
    });

    describe('context', () => {
        it('translates the declared participants and setting to snake_case on the wire', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
            await client.detectBullying({
                content: 'hello',
                context: {
                    platform: 'MyApp',
                    sender: { role: 'adult', ageGroup: '25-34' },
                    recipients: [{ role: 'child', ageGroup: '11-13', relationshipToSender: 'child_of_sender' }],
                    conversationType: 'family',
                    minorDisclosureCheck: true,
                } as any,
            });
            expect(sentBody(spy).context).toEqual({
                platform: 'MyApp - Node SDK',
                sender: { role: 'adult', age_group: '25-34' },
                recipients: [{ role: 'child', age_group: '11-13', relationship_to_sender: 'child_of_sender' }],
                conversation_type: 'family',
                minor_disclosure_check: true,
            });
        });

        it('translates authorRole for distress signals', async () => {
            const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
            await client.detectDistressSignals({ content: 'hello', context: { authorRole: 'responder' } as any });
            expect(sentBody(spy).context).toEqual({ platform: 'Node SDK', author_role: 'responder' });
        });
    });

    describe('batch', () => {
        it('keeps the per-item error_code the API returns', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({
                    results: [{ id: 'item-0', type: 'bullying', success: false, error: 'Unsupported language', error_code: 'ANALYSIS_6009' }],
                    summary: { total: 1, successful: 0, failed: 1, processingTimeMs: 5 },
                }),
            );
            const result = await client.batch({ items: [{ type: 'bullying', content: 'hello' }] });
            expect((result.results[0] as any).error_code).toBe('ANALYSIS_6009');
        });
    });
});
