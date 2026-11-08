import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { ValidationError } from '../src/errors.js';
import { CONVERSATION_TYPES, Detection } from '../src/constants.js';
import type {
    AnalyseMultiResult,
    BullyingResult,
    CoerciveControlResult,
    DetectionName,
    GroomingResult,
    NicknameResult,
} from '../src/index.js';

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

describe('Text detection: request fields', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('detectBullying sends attestation and message_id at the top level', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
        await client.detectBullying({ content: 'hello', attestation: true, messageId: 'm-1' });
        const body = sentBody(spy);
        expect(body.attestation).toBe(true);
        expect(body.message_id).toBe('m-1');
    });

    it('forwards an explicit attestation: false', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
        await client.detectUnsafe({ content: 'hello', attestation: false });
        expect(sentBody(spy).attestation).toBe(false);
    });

    it('omits attestation and message_id when not set', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
        await client.detectBullying({ content: 'hello' });
        const body = sentBody(spy);
        expect(body).not.toHaveProperty('attestation');
        expect(body).not.toHaveProperty('message_id');
    });

    it('detectUnsafe sends new_conversation with the continuation token', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
        await client.detectUnsafe({ content: 'hello', continuationToken: 'tok', newConversation: true, messageId: 'm-2' });
        const body = sentBody(spy);
        expect(body.continuation_token).toBe('tok');
        expect(body.new_conversation).toBe(true);
        expect(body.message_id).toBe('m-2');
    });

    it('detectGrooming sends include_relationship_frame, attestation, message_id and translated participants', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
        await client.detectGrooming({
            messages: [{ role: 'adult', content: 'hi' }],
            childAge: 12,
            includeRelationshipFrame: true,
            attestation: true,
            messageId: 'm-3',
            context: { sender: { role: 'adult' }, conversationType: 'gaming_chat' },
        });
        const body = sentBody(spy);
        expect(body.options).toEqual({ include_relationship_frame: true });
        expect(body.attestation).toBe(true);
        expect(body.message_id).toBe('m-3');
        expect(body.context).toEqual({
            child_age: 12,
            platform: 'Node SDK',
            sender: { role: 'adult' },
            conversation_type: 'gaming_chat',
        });
    });

    it('unified detectors send attestation, message_id and the declared context', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({}));
        await client.detectCoerciveControl({
            content: 'hello',
            attestation: true,
            messageId: 'm-4',
            context: { minorDisclosureCheck: false, recipients: [{ relationshipToSender: 'peer' }] },
        });
        expect(sentBody(spy)).toEqual({
            text: 'hello',
            context: {
                platform: 'Node SDK',
                minor_disclosure_check: false,
                recipients: [{ relationship_to_sender: 'peer' }],
            },
            attestation: true,
            message_id: 'm-4',
        });
    });

    it('batch items translate the declared context like the single-item methods', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ results: [] }));
        await client.batch({
            items: [{ type: 'bullying', content: 'hello', context: { conversationType: 'education' } }],
        });
        expect(sentBody(spy).items[0].data.context).toEqual({
            platform: 'Node SDK',
            conversation_type: 'education',
        });
    });

    it('updateDetectionSettings forwards default_conversation_type', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ success: true, settings: {}, message: '' }));
        await client.updateDetectionSettings({ default_conversation_type: 'gaming_chat' });
        expect(sentBody(spy)).toEqual({ default_conversation_type: 'gaming_chat' });
    });
});

describe('detectNickname', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const reading: NicknameResult = {
        signal: 'none',
        categories: [],
        parts: [{ text: 'player', reading: 'ordinary', category: null }],
        rationale: 'An ordinary gaming name.',
        recommendation: 'allow',
        recommendation_detail: 'No change needed.',
        confidence: 0.9,
        language: 'en',
        strictness: 'balanced',
        reading_complete: true,
        credits_used: 1,
    };

    it('POSTs the name, strictness and snake_case context, with no platform', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(reading));
        const result = await client.detectNickname({
            name: 'xX_player_Xx',
            strictness: 'cautious',
            context: {
                language: 'en',
                ageGroup: '11-13',
                conversationType: 'gaming_chat',
                platformReserved: ['Support', 'Admin'],
            },
        });
        expect(spy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/safety/nickname');
        expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST');
        expect(sentBody(spy)).toEqual({
            name: 'xX_player_Xx',
            strictness: 'cautious',
            context: {
                language: 'en',
                age_group: '11-13',
                conversation_type: 'gaming_chat',
                platform_reserved: ['Support', 'Admin'],
            },
        });
        expect(result.recommendation).toBe('allow');
        expect(result.reading_complete).toBe(true);
    });

    it('sends only the name when nothing else is given', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(reading));
        await client.detectNickname({ name: 'sam', context: {} });
        expect(sentBody(spy)).toEqual({ name: 'sam' });
    });

    it('rejects an empty name', async () => {
        await expect(client.detectNickname({ name: '   ' })).rejects.toThrow(ValidationError);
    });

    it('rejects a name longer than 64 characters', async () => {
        await expect(client.detectNickname({ name: 'a'.repeat(65) })).rejects.toThrow(ValidationError);
    });
});

describe('Text detection: results and constants', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('passes the shared and endpoint-specific result fields through', async () => {
        const wire = {
            endpoint: 'coercive-control',
            detected: false,
            severity: 0.2,
            confidence: 0.8,
            risk_score: 0.2,
            level: 'low',
            categories: [],
            recommended_action: 'monitor',
            language: 'en',
            language_status: 'stable',
            conversation_type_in_effect: 'family',
            conversation_type_source: 'account_default',
            attestation: null,
            attestation_reason: 'nothing_detected',
            speaker_role: 'experiencing',
            disclosure_capped: true,
            disclosure_capped_reason: 'Describes their own experience.',
        };
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
        const result: CoerciveControlResult = await client.detectCoerciveControl({ content: 'hello' });
        expect(result.disclosure_capped).toBe(true);
        expect(result.speaker_role).toBe('experiencing');
        expect(result.conversation_type_source).toBe('account_default');
        expect(result.attestation_reason).toBe('nothing_detected');
    });

    it('types the reported-bullying and grooming status fields', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ is_bullying: false, bullying_type: [], bullying_reported: true, bullying_reported_by: 'bystander', recommended_action: 'flag_for_review' }),
        );
        const bullying: BullyingResult = await client.detectBullying({ content: 'hello' });
        expect(bullying.bullying_reported_by).toBe('bystander');

        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ grooming_risk: 'none', flags: [], analysis_status: 'engine_error', recommended_action: 'flag_for_review' }),
        );
        const grooming: GroomingResult = await client.detectGrooming({ messages: [{ role: 'adult', content: 'hi' }] });
        expect(grooming.analysis_status).toBe('engine_error');
    });

    it('analyseMulti returns the summary status fields and support', async () => {
        const wire: AnalyseMultiResult = {
            results: [],
            summary: {
                total_endpoints: 2,
                detected_count: 0,
                highest_risk: { endpoint: 'bullying', risk_score: 0.4, close_calls: [{ endpoint: 'unsafe', risk_score: 0.38 }] },
                overall_risk_level: 'low',
                total_credits_used: 2,
                analysis_status: 'partial',
                recommended_action: 'flag_for_review',
                failed_endpoints: [{ endpoint: 'unsafe', code: 'ANALYSIS_6000', error: 'Analysis failed' }],
            },
            support: { helplines: [] },
        };
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
        const result = await client.analyseMulti({ content: 'hello', detections: ['bullying', Detection.UNSAFE] });
        expect(result.summary.analysis_status).toBe('partial');
        expect(result.summary.highest_risk.close_calls).toHaveLength(1);
        expect(result.summary.failed_endpoints?.[0].endpoint).toBe('unsafe');
        expect(result.support).toEqual({ helplines: [] });
    });

    it('Detection lists every endpoint analyseMulti accepts', () => {
        const names: DetectionName[] = Object.values(Detection);
        expect(names).toEqual(expect.arrayContaining(['distress-signals', 'tfgbv', 'synthetic-content']));
        expect(names).toHaveLength(14);
    });

    it('CONVERSATION_TYPES lists the 24 declared settings', () => {
        expect(CONVERSATION_TYPES).toHaveLength(24);
        expect(CONVERSATION_TYPES).toContain('gaming_chat');
        expect(CONVERSATION_TYPES).toContain('support_disclosure');
    });
});
