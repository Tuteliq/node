import type {
    VoiceStreamConfig,
    VoiceStreamHandlers,
    VoiceStreamSession,
    VoiceStreamEvent,
    VoiceSessionSummaryEvent,
} from './types/voice-stream.js';
import { resolvePlatform } from './utils/platform.js';

/** WebSocket URL for voice streaming */
const VOICE_STREAM_URL = 'wss://api.tuteliq.ai/api/v1/safety/voice/stream';

/** Binary frame prefix the API reads as a video frame (audio goes untagged). */
const VIDEO_FRAME_PREFIX = 0x01;

/**
 * Builds the `config` message in the API's wire format. `context` is sent
 * only when given, or when `withDefaultContext` is set, because the server
 * merges it into the session and a bare `{ platform }` would overwrite the
 * platform set earlier.
 */
function buildConfigMessage(config: VoiceStreamConfig, withDefaultContext: boolean): Record<string, unknown> {
    const message: Record<string, unknown> = { type: 'config' };
    if (config.intervalSeconds !== undefined) message.interval_seconds = config.intervalSeconds;
    if (config.analysisTypes !== undefined) message.analysis_types = config.analysisTypes;
    if (config.enableVideo !== undefined) message.enable_video = config.enableVideo;
    if (config.frameIntervalSeconds !== undefined) message.frame_interval_seconds = config.frameIntervalSeconds;

    const context = config.context;
    if (context || withDefaultContext) {
        message.context = {
            ...(context?.language !== undefined && { language: context.language }),
            ...(context?.ageGroup !== undefined && { age_group: context.ageGroup }),
            ...(context?.childAge !== undefined && { child_age: context.childAge }),
            platform: resolvePlatform(context?.platform),
        };
    }
    return message;
}

/**
 * Creates a voice streaming session over WebSocket.
 *
 * Requires the `ws` package to be installed:
 * ```bash
 * npm install ws
 * ```
 *
 * @param apiKey - Tuteliq API key for authentication
 * @param config - Optional session configuration
 * @param handlers - Optional event handler callbacks
 * @returns A VoiceStreamSession for sending audio and controlling the session
 */
export function createVoiceStream(
    apiKey: string,
    config?: VoiceStreamConfig,
    handlers?: VoiceStreamHandlers,
): VoiceStreamSession {
    let ws: import('ws').WebSocket | null = null;
    let sessionId: string | null = null;
    let active = false;
    let summaryResolve: ((event: VoiceSessionSummaryEvent) => void) | null = null;
    let summaryReject: ((error: Error) => void) | null = null;

    // Dynamically import ws
    let WebSocketCtor: typeof import('ws').WebSocket | null = null;

    const init = async () => {
        try {
            const wsModule = await import('ws');
            WebSocketCtor = wsModule.default || wsModule.WebSocket;
        } catch {
            throw new Error(
                'The "ws" package is required for voice streaming. ' +
                'Install it with: npm install ws'
            );
        }

        return new Promise<void>((resolve, reject) => {
            ws = new WebSocketCtor!(VOICE_STREAM_URL, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });


            ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
                try {
                    const text = data.toString();
                    const event: VoiceStreamEvent = JSON.parse(text);

                    switch (event.type) {
                        case 'ready':
                            // The API reads messages only once the session
                            // is ready, so the initial config goes now.
                            sessionId = event.session_id;
                            active = true;
                            if (config) {
                                ws!.send(JSON.stringify(buildConfigMessage(config, true)));
                            }
                            handlers?.onReady?.(event);
                            resolve();
                            break;
                        case 'transcription':
                            handlers?.onTranscription?.(event);
                            break;
                        case 'alert':
                            handlers?.onAlert?.(event);
                            break;
                        case 'frame_analysis':
                            handlers?.onFrameAnalysis?.(event);
                            break;
                        case 'session_summary':
                            handlers?.onSessionSummary?.(event);
                            summaryResolve?.(event);
                            summaryResolve = null;
                            summaryReject = null;
                            break;
                        case 'config_updated':
                            handlers?.onConfigUpdated?.(event);
                            break;
                        case 'error':
                            handlers?.onError?.(event);
                            break;
                    }
                } catch {
                    // Ignore non-JSON messages (e.g. pong frames)
                }
            });

            ws.on('close', (code: number, reason: Buffer) => {
                active = false;
                const reasonStr = reason.toString();
                handlers?.onClose?.(code, reasonStr);

                if (summaryReject) {
                    summaryReject(new Error(`Connection closed before session summary (code: ${code})`));
                    summaryResolve = null;
                    summaryReject = null;
                }
            });

            ws.on('error', (err: Error) => {
                active = false;
                reject(err);
            });
        });
    };

    // Start connection immediately
    const ready = init();

    const session: VoiceStreamSession = {
        sendAudio(data: Buffer | Uint8Array): void {
            if (!ws || !active) {
                throw new Error('Voice stream is not connected');
            }
            ws.send(data);
        },

        sendVideoFrame(data: Buffer | Uint8Array): void {
            if (!ws || !active) {
                throw new Error('Voice stream is not connected');
            }
            const frame = new Uint8Array(data.length + 1);
            frame[0] = VIDEO_FRAME_PREFIX;
            frame.set(data, 1);
            ws.send(frame);
        },

        updateConfig(newConfig: VoiceStreamConfig): void {
            if (!ws || !active) {
                throw new Error('Voice stream is not connected');
            }
            ws.send(JSON.stringify(buildConfigMessage(newConfig, false)));
        },

        async end(): Promise<VoiceSessionSummaryEvent> {
            await ready;
            if (!ws || !active) {
                throw new Error('Voice stream is not connected');
            }
            return new Promise((resolve, reject) => {
                summaryResolve = resolve;
                summaryReject = reject;
                ws!.send(JSON.stringify({ type: 'end' }));
            });
        },

        close(): void {
            active = false;
            ws?.close();
            ws = null;
        },

        get sessionId(): string | null {
            return sessionId;
        },

        get isActive(): boolean {
            return active;
        },
    };

    return session;
}
