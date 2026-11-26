import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { ValidationError } from '../src/errors.js';
import type { ActionPlanResult } from '../src/types/guidance.js';

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

const PLAN = { audience: 'parent', steps: ['a'], tone: 'calm' };

describe('getActionPlan country and general guidance', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sends country in the request body', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(PLAN));
        await client.getActionPlan({ situation: 'Someone is spreading rumours', country: 'SE' });
        expect(sentBody(spy).country).toBe('SE');
    });

    it('omits country when it is not set, so the account country applies', async () => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(PLAN));
        await client.getActionPlan({ situation: 'Someone is spreading rumours' });
        expect('country' in sentBody(spy)).toBe(false);
    });

    it.each(['SWE', 'S', '12', 'S1', ''])('rejects country %j before sending', async (country) => {
        const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(PLAN));
        await expect(
            client.getActionPlan({ situation: 'Someone is spreading rumours', country }),
        ).rejects.toThrow(ValidationError);
        expect(spy).not.toHaveBeenCalled();
    });

    it('returns general_guidance when the API sets it', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ ...PLAN, general_guidance: true }));
        const plan: ActionPlanResult = await client.getActionPlan({ situation: 'Someone is spreading rumours' });
        const general: boolean | undefined = plan.general_guidance;
        expect(general).toBe(true);
    });

    it('leaves general_guidance undefined for a tailored plan', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(PLAN));
        const plan = await client.getActionPlan({ situation: 'Someone is spreading rumours' });
        expect(plan.general_guidance).toBeUndefined();
    });
});
