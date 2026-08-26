// =============================================================================
// Voice Streaming Types
// =============================================================================

/**
 * Configuration for a voice streaming session.
 */
export interface VoiceStreamConfig {
    /** Flush interval in seconds (5-30, default 10) */
    intervalSeconds?: number;
    /** Analysis types to run on each flush */
    analysisTypes?: Array<'bullying' | 'unsafe' | 'grooming' | 'emotions'>;
    /** Additional context for analysis */
    context?: {
        language?: string;
        ageGroup?: string;
        relationship?: string;
        /**
         * Your platform/app name (e.g. "MyApp"), used for dashboard
         * attribution. The SDK appends its own identifier before sending it —
         * "MyApp" is sent to the API as "MyApp - Node SDK".
         */
        platform?: string;
    };
}

// =============================================================================
// Server → Client Events
// =============================================================================

export interface VoiceReadyEvent {
    type: 'ready';
    session_id: string;
    config: {
        interval_seconds: number;
        analysis_types: string[];
    };
}

export interface VoiceTranscriptionSegment {
    start: number;
    end: number;
    text: string;
}

export interface VoiceTranscriptionEvent {
    type: 'transcription';
    text: string;
    segments: VoiceTranscriptionSegment[];
    flush_index: number;
}

export interface VoiceAlertEvent {
    type: 'alert';
    category: string;
    severity: string;
    risk_score: number;
    details: Record<string, unknown>;
    flush_index: number;
}

export interface VoiceSessionSummaryEvent {
    type: 'session_summary';
    session_id: string;
    duration_seconds: number;
    overall_risk: string;
    overall_risk_score: number;
    total_flushes: number;
    transcript: string;
}

export interface VoiceConfigUpdatedEvent {
    type: 'config_updated';
    config: {
        interval_seconds: number;
        analysis_types: string[];
    };
}

export interface VoiceErrorEvent {
    type: 'error';
    code: string;
    message: string;
}

/** Union of all voice stream events */
export type VoiceStreamEvent =
    | VoiceReadyEvent
    | VoiceTranscriptionEvent
    | VoiceAlertEvent
    | VoiceSessionSummaryEvent
    | VoiceConfigUpdatedEvent
    | VoiceErrorEvent;

// =============================================================================
// Handler Callbacks
// =============================================================================

export interface VoiceStreamHandlers {
    /** Called when the session is ready */
    onReady?: (event: VoiceReadyEvent) => void;
    /** Called when a transcription flush arrives */
    onTranscription?: (event: VoiceTranscriptionEvent) => void;
    /** Called when a safety alert is triggered */
    onAlert?: (event: VoiceAlertEvent) => void;
    /** Called when the session ends with a summary */
    onSessionSummary?: (event: VoiceSessionSummaryEvent) => void;
    /** Called when config is updated */
    onConfigUpdated?: (event: VoiceConfigUpdatedEvent) => void;
    /** Called on server-side errors */
    onError?: (event: VoiceErrorEvent) => void;
    /** Called when the connection closes */
    onClose?: (code: number, reason: string) => void;
}

// =============================================================================
// Session Interface
// =============================================================================

export interface VoiceStreamSession {
    /** Send raw audio data (binary frame) */
    sendAudio(data: Buffer | Uint8Array): void;
    /** Update the session configuration */
    updateConfig(config: VoiceStreamConfig): void;
    /** Signal end of audio. Resolves with the session summary. */
    end(): Promise<VoiceSessionSummaryEvent>;
    /** Force-close the connection immediately */
    close(): void;
    /** The session ID (available after ready event) */
    readonly sessionId: string | null;
    /** Whether the connection is active */
    readonly isActive: boolean;
}
