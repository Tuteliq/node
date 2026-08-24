import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import type { BullyingResult, GroomingResult, DetectionResult } from '../src/types/index.js';

/**
 * Conversation-level fields (`trajectory_risk`, `trajectory`, `severity_series`).
 *
 * These arrive alongside `continuation_token` on the endpoints that maintain
 * continuation state. Nothing in the client projects those responses down, so
 * the risk is not that a field is transformed — it is that a future refactor
 * introduces a projection and silently drops them. These tests assert the whole
 * response survives the client, using the exact shape the reviewer's escalation
 * produced: a benign final message (`risk_score` 0.10) inside a conversation the
 * API scores at 0.74.
 */

function mockFetchResponse(data: unknown, options: { ok?: boolean; status?: number } = {}) {
    const { ok = true, status = 200 } = options;
    return {
        ok,
        status,
        json: async () => data,
        headers: { get: () => null },
    } as unknown as Response;
}

/** Turn 6 of the reviewer's six-turn bullying escalation: "see you tomorrow :)". */
const benignTurnAfterEscalation = {
    is_bullying: false,
    bullying_type: [],
    confidence: 0.91,
    severity: 'low',
    rationale: 'A friendly sign-off with no hostile content.',
    recommended_action: 'monitor',
    risk_score: 0.1,
    language: 'en',
    language_status: 'stable',
    credits_used: 1,
    continuation_token: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
    continuation_expires_at: '2026-08-21T19:13:13.747Z',
    state_source: 'token',
    trajectory_risk: 0.74,
    trajectory: 'rising',
    severity_series: [0.05, 0.1, 0.65, 0.05, 0.75, 0.1],
};

describe('conversation-level fields on detectBullying', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('surfaces trajectory_risk, trajectory and severity_series', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(benignTurnAfterEscalation),
        );

        const result = await client.detectBullying({
            content: 'see you tomorrow :)',
            continuationToken: 'prior-token',
        });

        expect(result.trajectory_risk).toBe(0.74);
        expect(result.trajectory).toBe('rising');
        expect(result.severity_series).toEqual([0.05, 0.1, 0.65, 0.05, 0.75, 0.1]);
    });

    it('keeps trajectory_risk distinct from risk_score', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse(benignTurnAfterEscalation),
        );

        const result = await client.detectBullying({ content: 'see you tomorrow :)' });

        // The reported defect in one line: the message is benign, the
        // conversation is not, and both numbers have to reach the caller.
        expect(result.risk_score).toBe(0.1);
        expect(result.trajectory_risk).toBeGreaterThan(result.risk_score);
    });

    it('omits them on the first turn of a fresh conversation', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({
                ...benignTurnAfterEscalation,
                state_source: 'fresh',
                trajectory_risk: undefined,
                trajectory: undefined,
                severity_series: undefined,
            }),
        );

        const result = await client.detectBullying({ content: 'hi' });

        expect(result.trajectory_risk).toBeUndefined();
        expect(result.trajectory).toBeUndefined();
        expect(result.severity_series).toBeUndefined();
        // The token still comes back — only the conversation-level view waits
        // for a second turn.
        expect(result.continuation_token).toBe('eyJhbGciOiJIUzI1NiJ9.payload.sig');
    });
});

describe('conversation-level fields on detectGrooming', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('survives the messages/context reshaping detectGrooming does on the way out', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({
                grooming_risk: 'low',
                confidence: 0.8,
                flags: [],
                risk_score: 0.12,
                recommended_action: 'monitor',
                continuation_token: 'tok',
                continuation_expires_at: '2026-08-21T19:13:13.747Z',
                state_source: 'token',
                trajectory_risk: 0.68,
                trajectory: 'stable',
                severity_series: [0.7, 0.6, 0.12],
            }),
        );

        const result = await client.detectGrooming({
            messages: [{ role: 'adult', content: 'how was school' }],
            childAge: 12,
            continuationToken: 'prior-token',
        });

        expect(result.trajectory_risk).toBe(0.68);
        expect(result.trajectory).toBe('stable');
        expect(result.severity_series).toEqual([0.7, 0.6, 0.12]);
    });
});

describe('conversation-level fields on the unified detection endpoints', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('reaches the caller from detectCoerciveControl', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({
                endpoint: 'coercive-control',
                detected: false,
                level: 'low',
                confidence: 0.7,
                risk_score: 0.09,
                categories: [],
                recommended_action: 'monitor',
                language: 'en',
                language_status: 'stable',
                continuation_token: 'tok',
                state_source: 'token',
                trajectory_risk: 0.61,
                trajectory: 'declining',
                severity_series: [0.8, 0.4, 0.09],
            }),
        );

        const result = await client.detectCoerciveControl({
            content: 'ok love you',
            continuationToken: 'prior-token',
        });

        expect(result.trajectory_risk).toBe(0.61);
        expect(result.trajectory).toBe('declining');
        expect(result.severity_series).toEqual([0.8, 0.4, 0.09]);
    });
});

describe('response projection', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('detectBullying returns the API body untouched, so no field can be dropped', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(
            mockFetchResponse({ ...benignTurnAfterEscalation, a_field_the_sdk_has_never_heard_of: 1 }),
        );

        const result = await client.detectBullying({ content: 'see you tomorrow :)' }) as Record<string, unknown>;

        expect(result.a_field_the_sdk_has_never_heard_of).toBe(1);
    });

    it('analyze() nests the full bullying sub-result, trajectory included', async () => {
        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce(mockFetchResponse(benignTurnAfterEscalation))
            .mockResolvedValueOnce(mockFetchResponse({
                unsafe: false,
                categories: [],
                confidence: 0.9,
                severity: 'low',
                risk_score: 0.02,
                recommended_action: 'none',
            }));

        const result = await client.analyze({ content: 'see you tomorrow :)' });

        expect(result.bullying?.trajectory_risk).toBe(0.74);
        // Documented limitation: the combined top-level risk_score is the max of
        // the per-message scores and does not consider trajectory, because
        // analyze() has no way to accept a continuation_token in the first
        // place. Read result.bullying.trajectory_risk, or call detectBullying.
        expect(result.risk_score).toBe(0.1);
    });
});

describe('analyze() incident_moderation_enabled', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('forwards the flag to both detectors instead of only echoing it', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')
            .mockResolvedValue(mockFetchResponse(benignTurnAfterEscalation));

        const result = await client.analyze({
            content: 'see you tomorrow :)',
            incident_moderation_enabled: false,
        });

        // Previously: the result said `false` while both sub-calls went out
        // without the flag, so incidents were persisted anyway.
        for (const call of fetchSpy.mock.calls) {
            const body = JSON.parse((call[1] as RequestInit).body as string);
            expect(body.incident_moderation_enabled).toBe(false);
        }
        expect(result.incident_moderation_enabled).toBe(false);
    });
});

// Type-level assertions: these only need to compile.
describe('types', () => {
    it('declares the fields on every result type that carries continuation_token', () => {
        const bullying: BullyingResult = {
            is_bullying: false,
            bullying_type: [],
            confidence: 0.9,
            severity: 'low',
            recommended_action: 'monitor',
            risk_score: 0.1,
            trajectory_risk: 0.74,
            trajectory: 'rising',
            severity_series: [0.05, 0.75, 0.1],
        };
        const grooming: GroomingResult = {
            grooming_risk: 'low',
            confidence: 0.8,
            flags: [],
            risk_score: 0.12,
            recommended_action: 'monitor',
            trajectory_risk: 0.68,
            trajectory: 'declining',
            severity_series: [0.7, 0.12],
        };
        const detection: DetectionResult = {
            endpoint: 'coercive-control',
            detected: false,
            level: 'low',
            confidence: 0.7,
            risk_score: 0.09,
            categories: [],
            recommended_action: 'monitor',
            language: 'en',
            language_status: 'stable',
            trajectory_risk: 0.61,
            trajectory: 'none',
            severity_series: [0.8, 0.09],
        };

        expect([bullying.trajectory, grooming.trajectory, detection.trajectory])
            .toEqual(['rising', 'declining', 'none']);
    });
});
