import { TrackingFields } from './index.js';
import { ContextInput, RecommendedAction } from './safety.js';
import { DetectionCategory, DetectionEvidence, AgeCalibration } from './detection.js';
import { TranscriptionResult, TranscriptionSegment } from './media.js';

// =============================================================================
// Synthetic Content Classification
// =============================================================================

/** Synthetic content classification levels per Child Protection Blueprint */
export type SyntheticClassification =
    | 'confirmed_synthetic'
    | 'suspected_synthetic'
    | 'unknown'
    | 'confirmed_authentic';

// =============================================================================
// Text Detection
// =============================================================================

export interface DetectSyntheticTextInput extends TrackingFields {
    /** The text content to analyze for synthetic indicators */
    content: string;
    /** Context for better analysis */
    context?: ContextInput;
    /** Minimum severity to show crisis support resources (default: 'high') */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /** @deprecated No-op: there is no verdict cache; every request is analysed fresh. */
    bypassCache?: boolean;
}

export interface SyntheticTextResult {
    /** Endpoint name */
    endpoint: string;
    /** Whether synthetic content was detected */
    detected: boolean;
    /** Severity score (0.0-1.0) */
    severity: number;
    /** Risk level */
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /** Synthetic classification */
    classification: SyntheticClassification;
    /** Detection confidence (0.0-1.0) */
    confidence: number;
    /** Risk score (0.0-1.0) */
    risk_score: number;
    /** Detected categories */
    categories: DetectionCategory[];
    /** Evidence excerpts */
    evidence?: DetectionEvidence[];
    /** Age calibration details */
    age_calibration?: AgeCalibration;
    /**
     * Recommended action, as a stable enum ordered weakest to strongest.
     * Safe to switch on.
     */
    recommended_action: RecommendedAction;
    /** @deprecated Not returned by the text endpoint; never present. */
    action_detail?: string;
    /** Human-readable rationale */
    rationale: string;
    /** Processing time in milliseconds */
    processing_time_ms?: number;
    /** Language code */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Credits consumed */
    credits_used?: number;
    /** Crisis support resources */
    support?: Record<string, unknown>;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Image Detection — Multi-Signal Forensic Pipeline
// =============================================================================

export interface DetectSyntheticImageInput extends TrackingFields {
    /** Image file — Buffer, Blob, or File */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "photo.jpg") */
    filename: string;
    /** Age group for calibrated analysis */
    ageGroup?: string;
    /** Language hint (ISO 639-1) */
    language?: string;
    /**
     * Your platform/app name (e.g. "MyApp", "Discord Bot"), used for dashboard
     * attribution and calibration. The SDK appends its own identifier before
     * sending it — "MyApp" is sent to the API as "MyApp - Node SDK" — so
     * pass your product's name here, not a category like "chat" or
     * "social_media".
     */
    platform?: string;
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
    /** @deprecated No-op: there is no verdict cache; every request is analysed fresh. */
    bypassCache?: boolean;
    /** @deprecated Not read by this endpoint; has no effect. */
    incident_moderation_enabled?: boolean;
}

/** Vision AI forensic analysis results */
export interface SyntheticVisionResult {
    /** Whether the image appears AI-generated */
    is_likely_synthetic: boolean;
    /** Confidence in synthetic assessment (0.0-1.0) */
    synthetic_confidence: number;
    /** Detected AI-generation artifacts */
    artifacts: string[];
    /** Face-specific analysis */
    face_analysis: string;
    /** Overall forensic assessment */
    overall_assessment: string;
}

/** EXIF/metadata extraction results */
export interface MetadataAnalysis {
    /** Image format (jpeg, png, webp, etc.) */
    format: string;
    /** Image dimensions */
    dimensions: { width: number; height: number };
    /** Whether EXIF data is present */
    has_exif: boolean;
    /** Whether a camera model was found */
    has_camera: boolean;
    /** Whether GPS data is present */
    has_gps: boolean;
    /** Camera model (if detected) */
    camera_model?: string;
    /** Whether an AI generator signature was found in metadata */
    ai_generator_detected: boolean;
    /** Name of the AI generator (if detected) */
    ai_generator?: string;
    /** Whether the absence of camera metadata is suspicious (high-res + no camera) */
    suspicious_absence: boolean;
}

/** C2PA Content Credentials provenance data */
export interface ProvenanceResult {
    /** Whether a C2PA manifest was found */
    has_c2pa: boolean;
    /** The tool that generated the C2PA claim */
    claim_generator?: string;
    /** Whether C2PA declares AI generation */
    is_ai_generated: boolean;
    /** Name of the AI generation tool (if declared) */
    ai_tool?: string;
}

/** Multi-signal ensemble summary */
export interface ForensicSignals {
    /** Total number of signals across all sources */
    signal_count: number;
    /** Per-source signal breakdown */
    sources: Array<{
        name: string;
        signal_count: number;
        confidence_boost: number;
    }>;
    /** Combined weighted confidence boost */
    combined_confidence_boost: number;
}

/** Known synthetic content match via perceptual hash */
export interface KnownSyntheticMatch {
    /** Hamming distance to the known hash (lower = closer match) */
    distance: number;
    /** Category of the known synthetic content */
    category: string;
}

/** The image looks like a screen capture rather than a camera photo. */
export interface ScreenshotDetection {
    /** Whether the image looks like a screen capture */
    is_screenshot: boolean;
    /** Confidence (0.0-1.0) */
    confidence: number;
}

export interface SyntheticImageResult {
    /** Endpoint name */
    endpoint: string;
    /** Whether synthetic content was detected */
    detected: boolean;
    /** Severity score (0.0-1.0) */
    severity: number;
    /** Risk level */
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /** Synthetic classification */
    classification: SyntheticClassification;
    /** Detection confidence (0.0-1.0) */
    confidence: number;
    /** Risk score (0.0-1.0) */
    risk_score: number;
    /** Detected categories */
    categories: DetectionCategory[];
    /** Evidence excerpts */
    evidence?: DetectionEvidence[];
    /**
     * Recommended action, as a stable enum ordered weakest to strongest.
     * Safe to switch on.
     */
    recommended_action: RecommendedAction;
    /** @deprecated Not part of this endpoint's response; never present. */
    action_detail?: string;
    /** Human-readable rationale */
    rationale: string;
    /** Age calibration details */
    age_calibration?: AgeCalibration;
    /** Input type */
    input_type: 'image';
    /** Semantic forensic analysis of the image */
    semantic_analysis: SyntheticVisionResult;
    /** @deprecated Never returned; the same analysis is in `semantic_analysis`. */
    vision?: SyntheticVisionResult;
    /** EXIF/metadata analysis */
    metadata_analysis: MetadataAnalysis;
    /** C2PA Content Credentials (present only when a C2PA manifest is found) */
    provenance?: ProvenanceResult;
    /** Multi-signal ensemble summary */
    forensic_signals: ForensicSignals;
    /** 64-bit DCT-based perceptual hash */
    perceptual_hash: string;
    /** Known synthetic match (present only when pHash matches a known image) */
    known_synthetic_match?: KnownSyntheticMatch;
    /** Present only when the image looks like a screen capture rather than a photo */
    screenshot_detection?: ScreenshotDetection;
    /** Processing time in milliseconds */
    processing_time_ms?: number;
    /** Language code */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Credits consumed */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata (non-JSON metadata comes back as `{ raw }`) */
    metadata?: Record<string, unknown>;
    /** Echo of provided fileId */
    file_id?: string;
}

// =============================================================================
// Audio Detection — Spectral Forensics
// =============================================================================

export interface DetectSyntheticAudioInput extends TrackingFields {
    /** Audio file — Buffer, Blob, or File */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "recording.mp3") */
    filename: string;
    /** Age group for calibrated analysis */
    ageGroup?: string;
    /** Language hint (ISO 639-1) */
    language?: string;
    /**
     * Your platform/app name (e.g. "MyApp", "Discord Bot"), used for dashboard
     * attribution and calibration. The SDK appends its own identifier before
     * sending it — "MyApp" is sent to the API as "MyApp - Node SDK" — so
     * pass your product's name here, not a category like "chat" or
     * "social_media".
     */
    platform?: string;
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
    /** @deprecated No-op: there is no verdict cache; every request is analysed fresh. */
    bypassCache?: boolean;
    /** @deprecated Not read by this endpoint; has no effect. */
    incident_moderation_enabled?: boolean;
}

/** Quantitative audio statistics from spectral analysis */
export interface AudioStats {
    /** RMS level in dB */
    rms_level: number;
    /** @deprecated Never returned; the RMS level is in `rms_level`. */
    rms_mean?: number;
    /** Peak RMS level in dB */
    rms_peak: number;
    /** Dynamic range in dB */
    dynamic_range: number;
    /** Ratio of silent segments (0.0-1.0) */
    silence_ratio: number;
    /** Number of peaks */
    peak_count: number;
    /** Flat factor (0.0-1.0, higher = more uniform/synthetic) */
    flat_factor: number;
    /** DC offset */
    dc_offset: number;
}

/**
 * Transcription on a synthetic-content result. `segments` is absent when
 * the audio had no speech, and on video results.
 */
export interface SyntheticTranscription extends Omit<TranscriptionResult, 'segments'> {
    /** Timestamped segments, when returned */
    segments?: TranscriptionSegment[];
}


export interface SyntheticAudioResult {
    /** Endpoint name */
    endpoint: string;
    /** Whether synthetic content was detected */
    detected: boolean;
    /** Severity score (0.0-1.0) */
    severity: number;
    /** Risk level */
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /** Synthetic classification */
    classification: SyntheticClassification;
    /** Detection confidence (0.0-1.0) */
    confidence: number;
    /** Risk score (0.0-1.0) */
    risk_score: number;
    /** Detected categories */
    categories: DetectionCategory[];
    /**
     * Recommended action, as a stable enum ordered weakest to strongest.
     * Safe to switch on.
     */
    recommended_action: RecommendedAction;
    /** @deprecated Not part of this endpoint's response; never present. */
    action_detail?: string;
    /** Human-readable rationale */
    rationale: string;
    /** Evidence excerpts */
    evidence?: DetectionEvidence[];
    /** Age calibration details */
    age_calibration?: AgeCalibration;
    /** Input type */
    input_type: 'audio';
    /** Transcription result */
    transcription?: SyntheticTranscription;
    /** Quantitative audio statistics */
    audio_stats?: AudioStats;
    /** Spectral analysis signals (e.g., low dynamic range, frequency uniformity) */
    spectral_signals?: string[];
    /** Processing time in milliseconds */
    processing_time_ms?: number;
    /** Language code */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Credits consumed */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata (not returned when the audio had no speech) */
    metadata?: Record<string, unknown>;
    /** Echo of provided fileId (not returned when the audio had no speech) */
    file_id?: string;
}

// =============================================================================
// Video Detection — Temporal + Lip-Sync
// =============================================================================

export interface DetectSyntheticVideoInput extends TrackingFields {
    /** Video file — Buffer, Blob, or File */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "clip.mp4") */
    filename: string;
    /** Maximum frames to extract (default: 6, max: 20) */
    maxFrames?: number;
    /** Age group for calibrated analysis */
    ageGroup?: string;
    /** Language hint (ISO 639-1) */
    language?: string;
    /**
     * Your platform/app name (e.g. "MyApp", "Discord Bot"), used for dashboard
     * attribution and calibration. The SDK appends its own identifier before
     * sending it — "MyApp" is sent to the API as "MyApp - Node SDK" — so
     * pass your product's name here, not a category like "chat" or
     * "social_media".
     */
    platform?: string;
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
    /** @deprecated No-op: there is no verdict cache; every request is analysed fresh. */
    bypassCache?: boolean;
    /** @deprecated Not read by this endpoint; has no effect. */
    incident_moderation_enabled?: boolean;
}

/** Temporal face consistency across video frames */
export interface TemporalConsistency {
    /** Combined temporal consistency score (0.0-1.0) */
    score: number;
    /** Face identity consistency score (0.0-1.0, higher = more consistent) */
    identity_consistency: number;
    /** Facial landmark stability score (0.0-1.0, higher = more stable) */
    landmark_stability: number;
    /** Number of frames where faces were detected */
    frames_with_faces: number;
    /** Frame pairs with anomalous face identity changes */
    anomalous_pairs: Array<{
        frame_a: number;
        frame_b: number;
        distance: number;
    }>;
    /** @deprecated Never returned; use `video.frames_analyzed`. */
    total_frames?: number;
    /** @deprecated Never returned; use `identity_consistency`. */
    identity_consistency_score?: number;
    /** @deprecated Never returned; use `landmark_stability`. */
    landmark_stability_score?: number;
    /** @deprecated Never returned; use `score`. */
    temporal_consistency_score?: number;
    /** @deprecated Never returned; use `anomalous_pairs`. */
    anomalous_frame_pairs?: Array<{
        frame_a: number;
        frame_b: number;
        distance: number;
    }>;
    /** @deprecated Never returned. */
    signals?: string[];
}

/** Audio-visual lip-sync correlation */
export interface LipSyncResult {
    /** Pearson correlation between mouth openness and audio energy (-1.0 to 1.0) */
    correlation: number;
    /** Whether silent mouth movement was detected (> 30% of frames) */
    has_silent_mouth_movement: boolean;
    /** Whether voice was detected without mouth movement (> 30% of frames) */
    has_voice_without_movement: boolean;
    /** @deprecated Never returned. */
    signals?: string[];
}

export interface SyntheticVideoResult {
    /** Endpoint name */
    endpoint: string;
    /** Whether synthetic content was detected */
    detected: boolean;
    /** Severity score (0.0-1.0) */
    severity: number;
    /** Risk level */
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /** Synthetic classification */
    classification: SyntheticClassification;
    /** Detection confidence (0.0-1.0) */
    confidence: number;
    /** Risk score (0.0-1.0) */
    risk_score: number;
    /** Detected categories */
    categories: DetectionCategory[];
    /**
     * Recommended action, as a stable enum ordered weakest to strongest.
     * Safe to switch on.
     */
    recommended_action: RecommendedAction;
    /** @deprecated Not part of this endpoint's response; never present. */
    action_detail?: string;
    /** Human-readable rationale */
    rationale: string;
    /** Input type */
    input_type: 'video';
    /** Video metadata */
    video: {
        /** Video duration in seconds */
        duration_seconds: number;
        /** Number of frames analyzed */
        frames_analyzed: number;
        /** Whether audio track is present */
        has_audio: boolean;
    };
    /** Temporal face consistency analysis */
    temporal_consistency?: TemporalConsistency;
    /** Lip-sync correlation analysis */
    lip_sync?: LipSyncResult;
    /** Pattern of frame-to-frame drift (omitted when unknown) */
    drift_signature?: 'sawtooth' | 'sinusoidal' | 'stable';
    /** Transcription result (if audio present; no segments) */
    transcription?: SyntheticTranscription;
    /** Quantitative audio statistics */
    audio_stats?: AudioStats;
    /** Spectral analysis signals */
    spectral_signals?: string[];
    /** Multi-signal summary (present only when there are signals) */
    forensic_signals?: ForensicSignals;
    /** Evidence excerpts */
    evidence?: DetectionEvidence[];
    /** Age calibration details */
    age_calibration?: AgeCalibration;
    /** Processing time in milliseconds */
    processing_time_ms?: number;
    /** Language code */
    language?: string;
    /** Language support maturity */
    language_status?: 'stable' | 'beta';
    /** Credits consumed */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata (non-JSON metadata comes back as `{ raw }`) */
    metadata?: Record<string, unknown>;
    /** Echo of provided fileId */
    file_id?: string;
}

// =============================================================================
// Account-Level Synthetic Profiling
// =============================================================================

/** @deprecated The profile endpoint was removed from the API; see `getSyntheticProfile`. */
export interface SyntheticProfile {
    /** Customer identifier */
    customer_id: string;
    /** Total items analyzed in the 30-day window */
    total_items: number;
    /** Items classified as confirmed_synthetic or suspected_synthetic */
    synthetic_count: number;
    /** Items classified as confirmed_authentic */
    authentic_count: number;
    /** Items classified as unknown */
    unknown_count: number;
    /** Average confidence across all classifications (0.0-1.0) */
    avg_confidence: number;
    /** Count of items per synthetic category */
    category_distribution: Record<string, number>;
    /** Composite account-level synthetic score (0.0-1.0) */
    account_synthetic_score: number;
    /** Trend based on first-half vs. second-half synthetic rate */
    trend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
    /** ISO timestamp of last update */
    last_updated: string;
    /** Rolling window size in days */
    window_days: number;
}
