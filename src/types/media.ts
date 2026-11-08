import { TrackingFields } from './index.js';
import { ContentSeverity } from '../constants.js';
import { BullyingResult, GroomingResult, RecommendedAction, UnsafeResult } from './safety.js';
import { EmotionsResult } from './analysis.js';

// Re-export for convenience
export { ContentSeverity };

// =============================================================================
// Transcription Types
// =============================================================================

export interface TranscriptionSegment {
    /** Segment start time in seconds */
    start: number;
    /** Segment end time in seconds */
    end: number;
    /** Transcribed text for this segment */
    text: string;
}

export interface TranscriptionResult {
    /** Full transcribed text */
    text: string;
    /** Detected language */
    language: string;
    /** Audio duration in seconds */
    duration: number;
    /** Timestamped segments */
    segments: TranscriptionSegment[];
}

// =============================================================================
// Voice Analysis
// =============================================================================

export interface AnalyzeVoiceInput extends TrackingFields {
    /** Audio file — Buffer, Blob, or File */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "recording.mp3") */
    filename: string;
    /** Analysis types to run on the transcript */
    analysisType?: 'bullying' | 'unsafe' | 'grooming' | 'emotions' | 'all';
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
    /** Age group for calibrated analysis */
    ageGroup?: string;
    /** Language hint */
    language?: string;
    /**
     * Your platform/app name (e.g. "MyApp", "Discord Bot"), used for dashboard
     * attribution and calibration. The SDK appends its own identifier before
     * sending it — "MyApp" is sent to the API as "MyApp - Node SDK" — so
     * pass your product's name here, not a category like "chat" or
     * "social_media".
     */
    platform?: string;
    /** Child's age (used for grooming analysis) */
    childAge?: number;
}

export interface VoiceAnalysisResult {
    /** Customer-provided file reference (if provided) */
    file_id?: string;
    /** Transcription result with timestamps */
    transcription: TranscriptionResult;
    /** Safety analysis results keyed by type */
    analysis: {
        bullying?: BullyingResult;
        unsafe?: UnsafeResult;
        grooming?: GroomingResult;
        emotions?: EmotionsResult;
    };
    /** Maximum risk score across all analyses (0-1) */
    overall_risk_score: number;
    /** Overall severity level */
    overall_severity: ContentSeverity;
    /**
     * A concern was observed at ANY severity, including monitor-only cases.
     * For production branching prefer `recommended_action` / `isActionable`.
     */
    detected: boolean;
    /** Confidence in the overall verdict (0-1). */
    confidence: number;
    /**
     * Routing key, matching every other detection endpoint. Ordered weakest to
     * strongest and safe to switch on.
     */
    recommended_action: RecommendedAction;
    /**
     * Human-readable expansion of `recommended_action`, for a moderator UI.
     * Free text: do not branch on it.
     */
    action_detail?: string;
    /**
     * Why this verdict was reached. Built from category and severity labels
     * only; never contains the transcript, image description or extracted text.
     */
    rationale: string;
    /** Detected or declared language code */
    language?: string;
    /** Language support maturity */
    language_status?: 'stable' | 'beta';
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Drug/violence term list result over OCR text. Present only when
 * `flagRiskTerms` (or the account-level `default_flag_risk_terms` setting)
 * is true and the media contained OCR text. Additive: never affects the
 * verdict. Purely lexical, so it can fire on benign uses of a term.
 */
export type MediaRiskTerms = UnsafeResult['risk_terms'];

// =============================================================================
// Video Analysis
// =============================================================================

/** Per-frame analysis, one entry per sampled frame. */
export interface VideoFrameResult {
    /** Index of the sampled frame */
    frame_index: number;
    /** Position of the frame in the video, in seconds */
    timestamp_s: number;
    /** Vision analysis for this frame */
    vision: VisionResult;
    /** Risk score for this frame (0-1) */
    risk_score: number;
    /** Severity level for this frame */
    severity: ContentSeverity;
}

/** A point in the video that exceeded the reporting threshold. */
export interface VideoFlaggedTimestamp {
    /** Position in the video, in seconds */
    timestamp_s: number;
    /** Categories detected at this timestamp */
    reason: string;
    /** Severity level at this timestamp */
    severity: ContentSeverity;
}

export interface AnalyzeVideoInput extends TrackingFields {
    /** Video file — Buffer, Blob, or File */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "clip.mp4") */
    filename: string;
    /** Analysis to run on the sampled frames (default `'all'`) */
    analysisType?: 'unsafe' | 'all';
    /** Frames to sample across the video (default 10, at most 20) */
    maxFrames?: number;
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
    /** Age group for calibrated analysis */
    ageGroup?: string;
    /**
     * Your platform/app name (e.g. "MyApp", "Discord Bot"), used for dashboard
     * attribution and calibration. The SDK appends its own identifier before
     * sending it — "MyApp" is sent to the API as "MyApp - Node SDK" — so
     * pass your product's name here, not a category like "chat" or
     * "social_media".
     */
    platform?: string;
    /**
     * Additive, deterministic word-list flag for plain profanity/vulgarity
     * found in the video's OCR'd text (aggregated across every frame that has
     * any). When true, adds a `profanity` field to the response — never
     * affects `frame_results`, `overall_severity`, or `recommended_action`.
     * Free — no extra credits. Only meaningful when at least one frame
     * actually contains OCR text (see `contains_text` semantics on the image
     * endpoint) — a video with no on-screen text never gets a `profanity`
     * field regardless of this flag. Explicit `true`/`false` here always
     * overrides your account's `default_flag_profanity` setting for this
     * call; omit to use the account default. **Requires the API deployed on
     * or after 2026-08-26.**
     */
    flagProfanity?: boolean;
    /**
     * Additive, deterministic drug/violence term list over the OCR text
     * across frames. When true, adds a `risk_terms` field to the response;
     * never affects the verdict. Explicit `true`/`false` overrides your
     * account's `default_flag_risk_terms` setting; omit to use the default.
     */
    flagRiskTerms?: boolean;
}

export interface VideoAnalysisResult {
    /** Customer-provided file reference (if provided) */
    file_id?: string;
    /** Number of frames analyzed */
    frames_analyzed: number;
    /** Duration of the video in seconds */
    duration_seconds: number;
    /** Per-frame analysis, one entry per sampled frame */
    frame_results: VideoFrameResult[];
    /**
     * Visual harm categories across every flagged frame, deduped. Was
     * previously computed server-side but only folded into the free-text
     * `rationale` string, with no field to read it from without parsing
     * `frame_results` yourself. **Requires the API deployed on or after
     * 2026-08-26.**
     */
    categories: string[];
    /** Points in the video that exceeded the reporting threshold */
    flagged_timestamps: VideoFlaggedTimestamp[];
    /** Maximum risk score across all findings (0-1) */
    overall_risk_score: number;
    /** Overall severity level */
    overall_severity: ContentSeverity;
    /**
     * A concern was observed at ANY severity, including monitor-only cases.
     * For production branching prefer `recommended_action` / `isActionable`.
     */
    detected: boolean;
    /** Confidence in the overall verdict (0-1). */
    confidence: number;
    /**
     * Routing key, matching every other detection endpoint. Ordered weakest to
     * strongest and safe to switch on.
     */
    recommended_action: RecommendedAction;
    /**
     * Human-readable expansion of `recommended_action`, for a moderator UI.
     * Free text: do not branch on it.
     */
    action_detail?: string;
    /**
     * Why this verdict was reached. Built from category and severity labels
     * only; never contains the transcript, image description or extracted text.
     */
    rationale: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
    /**
     * Present only when `flagProfanity` on this request (or the account-level
     * `default_flag_profanity` setting) is true AND at least one frame
     * contained OCR text. Deterministic word-list result over the OCR text
     * aggregated across frames — additive, never affects `frame_results`,
     * `overall_severity`, or `recommended_action`.
     */
    profanity?: { detected: boolean; matches: string[] } | null;
    /** See `MediaRiskTerms`. Aggregated over OCR text across frames. */
    risk_terms?: MediaRiskTerms;
}

// =============================================================================
// Vision / Image Analysis
// =============================================================================

export interface VisionResult {
    /** All text extracted via OCR */
    extracted_text: string;
    /** Visual harm categories detected */
    visual_categories: string[];
    /** Visual content severity */
    visual_severity: ContentSeverity;
    /** Confidence in visual classification (0-1) */
    visual_confidence: number;
    /** Brief description of image content */
    visual_description: string;
    /** Whether text was found in the image */
    contains_text: boolean;
    /** Whether faces were detected */
    contains_faces: boolean;
}

export interface AnalyzeImageInput extends TrackingFields {
    /** Image file — Buffer, Blob, or File */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "screenshot.png") */
    filename: string;
    /** Analysis types to run on extracted text */
    analysisType?: 'bullying' | 'unsafe' | 'emotions' | 'all';
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
    /** Age group for calibrated analysis */
    ageGroup?: string;
    /**
     * Your platform/app name (e.g. "MyApp", "Discord Bot"), used for dashboard
     * attribution and calibration. The SDK appends its own identifier before
     * sending it — "MyApp" is sent to the API as "MyApp - Node SDK" — so
     * pass your product's name here, not a category like "chat" or
     * "social_media".
     */
    platform?: string;
    /**
     * Additive, deterministic word-list flag for plain profanity/vulgarity
     * found in the image's OCR'd text. When true, adds a `profanity` field to
     * the response — never affects `overall_severity`, `recommended_action`,
     * or any `text_analysis` result. Free — no extra credits. Only meaningful
     * when the image actually contains OCR text (`vision.contains_text`);
     * a no-text image never gets a `profanity` field regardless of this flag.
     * Explicit `true`/`false` here always overrides your account's
     * `default_flag_profanity` setting for this call; omit to use the
     * account default. **Requires the API deployed on or after 2026-08-25.**
     */
    flagProfanity?: boolean;
    /**
     * Additive, deterministic drug/violence term list over the image's OCR
     * text. When true, adds a `risk_terms` field to the response; never
     * affects the verdict. Explicit `true`/`false` overrides your account's
     * `default_flag_risk_terms` setting; omit to use the default.
     */
    flagRiskTerms?: boolean;
}

export interface ImageAnalysisResult {
    /** Customer-provided file reference (if provided) */
    file_id?: string;
    /** Vision analysis results */
    vision: VisionResult;
    /** Text-based safety analysis (if OCR text was found) */
    text_analysis?: {
        bullying?: BullyingResult;
        unsafe?: UnsafeResult;
        emotions?: EmotionsResult;
    };
    /** Maximum risk score across all analyses (0-1) */
    overall_risk_score: number;
    /** Overall severity level */
    overall_severity: ContentSeverity;
    /**
     * A concern was observed at ANY severity, including monitor-only cases.
     * For production branching prefer `recommended_action` / `isActionable`.
     */
    detected: boolean;
    /** Confidence in the overall verdict (0-1). */
    confidence: number;
    /**
     * Routing key, matching every other detection endpoint. Ordered weakest to
     * strongest and safe to switch on.
     */
    recommended_action: RecommendedAction;
    /**
     * Human-readable expansion of `recommended_action`, for a moderator UI.
     * Free text: do not branch on it.
     */
    action_detail?: string;
    /**
     * Why this verdict was reached. Built from category and severity labels
     * only; never contains the transcript, image description or extracted text.
     */
    rationale: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
    /**
     * Present only when `flagProfanity` on this request (or the account-level
     * `default_flag_profanity` setting) is true AND the image contained OCR
     * text (`vision.contains_text`). Deterministic word-list result over the
     * OCR'd text — additive, never affects `overall_severity`,
     * `recommended_action`, or any `text_analysis` result.
     */
    profanity?: { detected: boolean; matches: string[] } | null;
    /** See `MediaRiskTerms`. */
    risk_terms?: MediaRiskTerms;
}

// =============================================================================
// Document Analysis
// =============================================================================

/** Valid endpoint names for document analysis */
export type DocumentEndpointName =
    | 'unsafe'
    | 'bullying'
    | 'grooming'
    | 'social-engineering'
    | 'coercive-control'
    | 'radicalisation'
    | 'romance-scam'
    | 'mule-recruitment';

export interface AnalyzeDocumentInput extends TrackingFields {
    /**
     * PDF, or a PNG, JPEG or WebP image read as a one-page document (Buffer,
     * Blob, or File). The type is decided from the file's bytes.
     */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "report.pdf", "chat.png") */
    filename: string;
    /** Detection endpoints to run on each page. Defaults to ['unsafe', 'coercive-control', 'radicalisation']. */
    endpoints?: DocumentEndpointName[];
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
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
    /** Minimum severity to include crisis helplines. Default: "high". */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Images only. For a messaging screenshot, splits it into messages with
     * the side each came from, so the last received message is judged with
     * the rest as history. Costs one extra vision call.
     */
    splitBySender?: boolean;
}

export interface DocumentExtractionSummary {
    /** Pages where text was extracted from the PDF text layer */
    text_layer_pages: number;
    /** Pages where OCR was used */
    ocr_pages: number;
    /** Pages with insufficient text for analysis */
    failed_pages: number;
    /** Average OCR confidence (0.0-1.0) across OCR pages */
    average_ocr_confidence: number;
}

export interface DocumentPageEndpointResult {
    /** Endpoint name */
    endpoint: string;
    /** Whether a threat was detected */
    detected: boolean;
    /** Severity score (0-1) */
    severity: number;
    /** Confidence score (0-1) */
    confidence: number;
    /** Risk score (0-1) */
    risk_score: number;
    /** Risk level */
    level: string;
    /** Detected categories */
    categories: Array<{ tag: string; label: string; confidence: number }>;
    /** Evidence excerpts */
    evidence: Array<{ text: string; tactic: string; weight: number }>;
    /**
     * Recommended action for this endpoint on this page, as a stable enum.
     * Safe to switch on.
     */
    recommended_action: RecommendedAction;
    /** @deprecated Not returned per page; never present. */
    action_detail?: string;
    /** Human-readable rationale */
    rationale: string;
    /** @deprecated Not returned per page; use the top-level `language`. */
    detected_language?: string;
}

export interface DocumentPageResult {
    /** Page number (1-indexed) */
    page_number: number;
    /** First 200 characters of page text */
    text_preview: string;
    /** How text was extracted */
    extraction_method: 'text_layer' | 'ocr';
    /** OCR confidence if applicable */
    ocr_confidence?: number;
    /** Detection results per endpoint */
    results: DocumentPageEndpointResult[];
    /** Highest risk score on this page */
    page_risk_score: number;
    /** Page severity level */
    page_severity: string;
}

export interface DocumentFlaggedPage {
    /** Page number */
    page_number: number;
    /** Risk score */
    risk_score: number;
    /** Severity level */
    severity: string;
    /** Endpoints that detected threats on this page */
    detected_endpoints: string[];
}

export interface DocumentAnalysisResult {
    /** Your file reference, or the uploaded filename when none was given */
    file_id: string;
    /** SHA-256 hash of the uploaded file for chain-of-custody verification */
    document_hash: string;
    /** Total pages in the document */
    total_pages: number;
    /** Pages with extractable text that were analyzed */
    pages_analyzed: number;
    /** Breakdown of text extraction results */
    extraction_summary: DocumentExtractionSummary;
    /** Per-page detection results */
    page_results: DocumentPageResult[];
    /** Highest risk score across all pages (0-1) */
    overall_risk_score: number;
    /** Overall severity level */
    overall_severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /** Unique list of endpoints that detected threats */
    detected_endpoints: string[];
    /** Pages with risk score >= 0.3 */
    flagged_pages: DocumentFlaggedPage[];
    /** Dynamic credit cost based on pages analyzed and endpoints used */
    credits_used: number;
    /** Processing time in milliseconds */
    processing_time_ms: number;
    /** Detected language */
    language?: string;
    /** Language support status */
    language_status?: string;
    /** Crisis support resources (if triggered) */
    support?: Record<string, unknown>;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Image Match (composite image checks)
// =============================================================================

/** Checks `verifyImageMatch` can run. */
export type ImageMatchCheck = 'face_match' | 'age' | 'forensic' | 'synthetic';

export interface VerifyImageMatchInput extends TrackingFields {
    /**
     * The image to check (max 15 MB). Bytes are base64-encoded by the SDK; a
     * string is sent as-is and must already be base64 (a data URL is accepted).
     */
    image: Buffer | Uint8Array | string;
    /** Reference image for `face_match`; without it that check is skipped */
    referenceImage?: Buffer | Uint8Array | string;
    /** Checks to run (default: all) */
    checks?: ImageMatchCheck[];
}

export interface VerifyImageMatchResult {
    /** Response schema version */
    schema_version: string;
    /** Checks that actually ran (`face_match` is left out without a reference image) */
    checks_run: ImageMatchCheck[];
    /** Face comparison against the reference image */
    face_match?: {
        /** Whether the two faces match */
        matched: boolean;
        /** Face similarity (0.0-1.0), absent when no face was found */
        similarity?: number;
        /** Why matching failed (e.g. `no_face_detected`) */
        reason?: string;
    };
    /** Age estimate for the image, or null when no face was detected */
    age?: {
        /** Estimated age in years */
        estimated_age: number;
        /** Face-detection confidence (0.0-1.0) */
        confidence: number;
    } | null;
    /** Explicit-content and skin-exposure checks */
    forensic?: {
        /** Whether the image was classified as explicit */
        nsfw: boolean;
        /** Explicit-content score (0.0-1.0) */
        nsfw_confidence?: number;
        /** Coarse skin-exposure level */
        skin_exposure_level?: 'low' | 'moderate' | 'high';
    };
    /** Synthetic-image checks; each field is absent when its check could not run */
    synthetic?: {
        /** Classifier verdict */
        is_synthetic?: boolean;
        /** Probability the image is synthetic (0.0-1.0) */
        synthetic_probability?: number;
        /** A C2PA / Content Credentials manifest is embedded */
        has_c2pa?: boolean;
        /** The C2PA manifest declares AI generation */
        is_ai_generated?: boolean;
    };
    /** Credits charged for this call */
    credits_used: number;
    /** Total processing time in milliseconds */
    processing_ms: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}
