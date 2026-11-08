import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket as ServerSocket, type RawData } from 'ws';
import { createVoiceStream } from '../src/voice-stream.js';
import type { VoiceStreamSession } from '../src/types/voice-stream.js';

// ---------------------------------------------------------------------------
// The voice stream is tested against a local WebSocketServer. `ws` is mocked
// with a subclass that records the URL the SDK asked for and then dials the
// local server on the same path, so no test ever reaches the network.
//
// The local server behaves like the API: it authenticates first, sends
// `ready`, and only then listens for messages. Anything the client sends
// before `ready` is recorded as dropped, because the API never sees it.
// ---------------------------------------------------------------------------

const requestedUrls: string[] = [];
let localPort = 0;

vi.mock('ws', async (importOriginal) => {
    const real = await importOriginal<typeof import('ws')>();
    class RedirectingWebSocket extends real.WebSocket {
        constructor(address: string, options?: import('ws').ClientOptions) {
            requestedUrls.push(address);
            const target = new URL(address);
            super(`ws://127.0.0.1:${localPort}${target.pathname}${target.search}`, options);
        }
    }
    return { ...real, default: RedirectingWebSocket, WebSocket: RedirectingWebSocket };
});

interface Received {
    path: string | undefined;
    authorization: string | undefined;
    beforeReady: RawData[];
    afterReady: Array<{ data: RawData; isBinary: boolean }>;
    socket: ServerSocket;
}

let server: WebSocketServer;
let connections: Received[] = [];

beforeAll(async () => {
    server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    localPort = (server.address() as AddressInfo).port;

    server.on('connection', (socket: ServerSocket, request: IncomingMessage) => {
        const received: Received = {
            path: request.url,
            authorization: request.headers.authorization,
            beforeReady: [],
            afterReady: [],
            socket,
        };
        connections.push(received);

        const early = (data: RawData) => received.beforeReady.push(data);
        socket.on('message', early);

        // Simulated async authentication, then ready.
        setTimeout(() => {
            socket.off('message', early);
            socket.on('message', (data: RawData, isBinary: boolean) => {
                received.afterReady.push({ data, isBinary });
                if (!isBinary) {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'config') {
                        socket.send(JSON.stringify({ type: 'config_updated', config: {} }));
                    }
                }
            });
            socket.send(JSON.stringify({
                type: 'ready',
                session_id: 'vs_test',
                config: { interval_seconds: 10, analysis_types: ['all'], enable_video: false, frame_interval_seconds: 5 },
            }));
        }, 30);
    });
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

let session: VoiceStreamSession | null = null;

afterEach(() => {
    session?.close();
    session = null;
    connections = [];
    requestedUrls.length = 0;
});

function waitFor(condition: () => boolean, timeoutMs = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
            if (condition()) return resolve();
            if (Date.now() - started > timeoutMs) return reject(new Error('timed out waiting for condition'));
            setTimeout(tick, 5);
        };
        tick();
    });
}

function jsonMessages(received: Received): Array<Record<string, unknown>> {
    return received.afterReady
        .filter((m) => !m.isBinary)
        .map((m) => JSON.parse(m.data.toString()));
}

describe('voice stream', () => {
    it('connects to the path the API serves, with Bearer auth', async () => {
        const onReady = vi.fn();
        session = createVoiceStream('test-api-key', undefined, { onReady });
        await waitFor(() => onReady.mock.calls.length === 1);

        expect(requestedUrls).toEqual(['wss://api.tuteliq.ai/api/v1/safety/voice/stream']);
        expect(connections[0].path).toBe('/api/v1/safety/voice/stream');
        expect(connections[0].authorization).toBe('Bearer test-api-key');
    });

    it('sends the initial config after ready, so the API does not drop it', async () => {
        const onConfigUpdated = vi.fn();
        session = createVoiceStream('test-api-key', { intervalSeconds: 15 }, { onConfigUpdated });
        await waitFor(() => onConfigUpdated.mock.calls.length === 1);

        expect(connections[0].beforeReady).toHaveLength(0);
        expect(jsonMessages(connections[0])[0]).toMatchObject({ type: 'config', interval_seconds: 15 });
    });

    it('sends context in the wire format the API reads', async () => {
        const onConfigUpdated = vi.fn();
        session = createVoiceStream('test-api-key', {
            analysisTypes: ['all'],
            enableVideo: true,
            frameIntervalSeconds: 6,
            context: { language: 'en', ageGroup: '10-12', childAge: 11, platform: 'MyApp' },
        }, { onConfigUpdated });
        await waitFor(() => onConfigUpdated.mock.calls.length === 1);

        const config = jsonMessages(connections[0])[0];
        expect(config).toEqual({
            type: 'config',
            analysis_types: ['all'],
            enable_video: true,
            frame_interval_seconds: 6,
            context: { language: 'en', age_group: '10-12', child_age: 11, platform: 'MyApp - Node SDK' },
        });
    });

    it('attributes the platform even when no context is given', async () => {
        const onConfigUpdated = vi.fn();
        session = createVoiceStream('test-api-key', { intervalSeconds: 10 }, { onConfigUpdated });
        await waitFor(() => onConfigUpdated.mock.calls.length === 1);

        expect(jsonMessages(connections[0])[0].context).toEqual({ platform: 'Node SDK' });
    });

    it('updateConfig maps context the same way and leaves context out when not given', async () => {
        const onReady = vi.fn();
        const onConfigUpdated = vi.fn();
        session = createVoiceStream('test-api-key', undefined, { onReady, onConfigUpdated });
        await waitFor(() => onReady.mock.calls.length === 1);

        session.updateConfig({ context: { ageGroup: '13-15', platform: 'MyApp' } });
        session.updateConfig({ intervalSeconds: 20 });
        await waitFor(() => onConfigUpdated.mock.calls.length === 2);

        const [first, second] = jsonMessages(connections[0]);
        expect(first.context).toEqual({ age_group: '13-15', platform: 'MyApp - Node SDK' });
        expect(second).toEqual({ type: 'config', interval_seconds: 20 });
    });

    it('sends video frames as binary prefixed with 0x01, and audio untagged', async () => {
        const onReady = vi.fn();
        session = createVoiceStream('test-api-key', undefined, { onReady });
        await waitFor(() => onReady.mock.calls.length === 1);

        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        session.sendVideoFrame(jpeg);
        session.sendAudio(Buffer.from([0x10, 0x20]));
        await waitFor(() => connections[0].afterReady.length === 2);

        const [frame, audio] = connections[0].afterReady;
        expect(frame.isBinary).toBe(true);
        expect([...(frame.data as Buffer)]).toEqual([0x01, 0xff, 0xd8, 0xff, 0xe0]);
        expect([...(audio.data as Buffer)]).toEqual([0x10, 0x20]);
    });

    it('delivers frame_analysis events to onFrameAnalysis', async () => {
        const onReady = vi.fn();
        const onFrameAnalysis = vi.fn();
        session = createVoiceStream('test-api-key', undefined, { onReady, onFrameAnalysis });
        await waitFor(() => onReady.mock.calls.length === 1);

        const event = {
            type: 'frame_analysis',
            session_id: 'vs_test',
            frame_index: 0,
            timestamp: '2026-11-08T00:00:00.000Z',
            vision: {
                extracted_text: '',
                visual_categories: [],
                visual_severity: 'none',
                visual_confidence: 0.9,
                visual_description: '',
                contains_text: false,
                contains_faces: false,
            },
            risk_score: 0,
            severity: 'none',
        };
        connections[0].socket.send(JSON.stringify(event));
        await waitFor(() => onFrameAnalysis.mock.calls.length === 1);

        expect(onFrameAnalysis).toHaveBeenCalledWith(event);
    });
});
