import { TrackingFields } from './index.js';
import { ContentSeverity } from '../constants.js';
import { BullyingResult, GroomingResult, UnsafeResult } from './safety.js';
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
    /** Platform name */
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
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Video Analysis
// =============================================================================

export interface VideoSafetyFinding {
    /** Frame index where the finding occurred */
    frame_index: number;
    /** Timestamp in seconds */
    timestamp: number;
    /** Description of the finding */
    description: string;
    /** Safety categories detected */
    categories: string[];
    /** Severity score (0-1) */
    severity: number;
}

export interface AnalyzeVideoInput extends TrackingFields {
    /** Video file — Buffer, Blob, or File */
    file: Buffer | Blob | File;
    /** Original filename (e.g., "clip.mp4") */
    filename: string;
    /** Customer-provided file reference ID (echoed in response) */
    fileId?: string;
    /** Age group for calibrated analysis */
    ageGroup?: string;
    /** Platform name */
    platform?: string;
}

export interface VideoAnalysisResult {
    /** Customer-provided file reference (if provided) */
    file_id?: string;
    /** Number of frames analyzed */
    frames_analyzed: number;
    /** Safety findings across frames */
    safety_findings: VideoSafetyFinding[];
    /** Maximum risk score across all findings (0-1) */
    overall_risk_score: number;
    /** Overall severity level */
    overall_severity: ContentSeverity;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
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
    /** Platform name */
    platform?: string;
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
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}
