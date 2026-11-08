import type { VisionResult } from './media.js';

// =============================================================================
// Voice Streaming Types
// =============================================================================

/** Analysis that can run on each flush of a voice stream. */
export type VoiceStreamAnalysisType = 'bullying' | 'unsafe' | 'grooming' | 'emotions' | 'all';

/**
 * Configuration for a voice streaming session.
 */
export interface VoiceStreamConfig {
    /** Flush interval in seconds (5-30, default 10) */
    intervalSeconds?: number;
    /** Analysis types to run on each flush (default `['all']`) */
    analysisTypes?: VoiceStreamAnalysisType[];
    /**
     * Analyse video frames sent with `sendVideoFrame()` (default false).
     * Each analysed frame produces a `frame_analysis` event.
     */
    enableVideo?: boolean;
    /** Minimum seconds between analysed video frames (at least 3, default 5) */
    frameIntervalSeconds?: number;
    /** Additional context for analysis */
    context?: {
        language?: string;
        ageGroup?: string;
        /** Child's age (used for grooming analysis) */
        childAge?: number;
        /** @deprecated Not read by the voice stream; has no effect. */
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

/** Session configuration as the server applies it. */
export interface VoiceStreamServerConfig {
    interval_seconds: number;
    analysis_types: string[];
    enable_video: boolean;
    frame_interval_seconds: number;
    context?: {
        age_group?: string;
        language?: string;
        platform?: string;
        child_age?: number;
    };
}

export interface VoiceReadyEvent {
    type: 'ready';
    session_id: string;
    config: VoiceStreamServerConfig;
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
    /** `visual` alerts come from analysed video frames. */
    category: 'bullying' | 'unsafe' | 'grooming' | 'emotions' | 'visual';
    severity: string;
    risk_score: number;
    details: Record<string, unknown>;
    flush_index: number;
}

export interface VoiceSessionSummaryEvent {
    type: 'session_summary';
    session_id: string;
    duration_seconds: number;
    overall_risk: 'low' | 'medium' | 'high' | 'critical';
    overall_risk_score: number;
    total_flushes: number;
    transcript: string;
    /** Number of video frames analysed during the session */
    video_frames_analyzed: number;
}

/** Analysis of one video frame sent on the stream (requires `enableVideo`). */
export interface VoiceFrameAnalysisEvent {
    type: 'frame_analysis';
    session_id: string;
    /** Index of the analysed frame within the session */
    frame_index: number;
    /** ISO timestamp of the analysis */
    timestamp: string;
    /** Vision analysis of the frame */
    vision: VisionResult;
    /** Risk score for this frame (0-1) */
    risk_score: number;
    /** Severity level for this frame */
    severity: string;
}

export interface VoiceConfigUpdatedEvent {
    type: 'config_updated';
    config: VoiceStreamServerConfig;
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
    | VoiceFrameAnalysisEvent
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
    /** Called when a video frame has been analysed */
    onFrameAnalysis?: (event: VoiceFrameAnalysisEvent) => void;
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
    /** Send one JPEG or PNG video frame (requires `enableVideo`) */
    sendVideoFrame(data: Buffer | Uint8Array): void;
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
