import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { WebhookEventType } from '../src/constants.js';

// return_incident_ids asks the API for the ids of the incidents a request
// recorded, so an integration can close them from its own tool.

function json(data: unknown): Response {
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
const bodySentIn = (spy: ReturnType<typeof vi.spyOn>, call = 0) => JSON.parse(spy.mock.calls[call][1]?.body as string);

describe('return_incident_ids', () => {
    let client: Tuteliq;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
        fetchSpy = vi.spyOn(global, 'fetch');
    });
    afterEach(() => vi.restoreAllMocks());

    it('is sent on text detections only when asked, and the ids come back on the result', async () => {
        fetchSpy.mockImplementation(async () => json({ unsafe: true, risk_score: 0.9, incident_ids: ['inc-1'] }));
        const result = await client.detectUnsafe({ content: 'invented', return_incident_ids: true });
        expect(bodySentIn(fetchSpy).return_incident_ids).toBe(true);
        expect(result.incident_ids).toEqual(['inc-1']);

        await client.detectBullying({ content: 'invented' });
        expect('return_incident_ids' in bodySentIn(fetchSpy, 1)).toBe(false);

        await client.detectSocialEngineering({ content: 'invented', return_incident_ids: true });
        expect(bodySentIn(fetchSpy, 2).return_incident_ids).toBe(true);
    });

    it('analyze forwards it to both detections and returns every id', async () => {
        fetchSpy
            .mockResolvedValueOnce(json({ is_bullying: true, risk_score: 0.8, incident_ids: ['b-1'] }))
            .mockResolvedValueOnce(json({ unsafe: true, categories: ['violence'], risk_score: 0.9, incident_ids: ['u-1'] }));
        const result = await client.analyze({ content: 'invented', return_incident_ids: true });
        expect(bodySentIn(fetchSpy, 0).return_incident_ids).toBe(true);
        expect(bodySentIn(fetchSpy, 1).return_incident_ids).toBe(true);
        expect(result.incident_ids?.sort()).toEqual(['b-1', 'u-1']);
    });

    it('analyze leaves the field out when not asked', async () => {
        fetchSpy.mockImplementation(async () => json({ is_bullying: false, unsafe: false, risk_score: 0 }));
        const result = await client.analyze({ content: 'invented' });
        expect(result.incident_ids).toBeUndefined();
    });

    it('is sent on image analysis as a form field', async () => {
        fetchSpy.mockResolvedValue(json({ overall_risk_score: 0.9, incident_ids: ['v-1'] }));
        const result = await client.analyzeImage({ file: Buffer.from('x'), filename: 'a.png', return_incident_ids: true });
        expect((fetchSpy.mock.calls[0][1]?.body as FormData).get('return_incident_ids')).toBe('true');
        expect(result.incident_ids).toEqual(['v-1']);
    });
});

describe('incident.status_changed', () => {
    it('is a webhook event type', () => {
        expect(WebhookEventType.INCIDENT_STATUS_CHANGED).toBe('incident.status_changed');
    });
});
