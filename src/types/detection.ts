import { TrackingFields } from './index.js';
import { ContextInput } from './safety.js';
import { LanguageStatus } from '../constants.js';

export { LanguageStatus };

// =============================================================================
// Unified Detection (Fraud + Safety Extended)
// =============================================================================

/**
 * Input for all fraud detection and safety-extended endpoints.
 * Used by: detectSocialEngineering, detectAppFraud, detectRomanceScam,
 * detectMuleRecruitment, detectGamblingHarm, detectCoerciveControl,
 * detectVulnerabilityExploitation, detectRadicalisation
 */
export interface DetectionInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis */
    context?: ContextInput;
    /** Include evidence excerpts in the response */
    includeEvidence?: boolean;
}

/**
 * A detected category with tag and confidence.
 */
export interface DetectionCategory {
    /** Category tag (e.g., "URGENCY_FABRICATION") */
    tag: string;
    /** Human-readable label */
    label: string;
    /** Confidence score (0-1) */
    confidence: number;
}

/**
 * Per-message analysis from conversation-aware detection.
 */
export interface MessageAnalysis {
    /** Index of the message in the input array */
    message_index: number;
    /** Risk score for this specific message (0-1) */
    risk_score: number;
    /** Flags identified in this message */
    flags: string[];
    /** Brief summary of the message analysis */
    summary: string;
}

/**
 * Evidence excerpt from the analyzed content.
 */
export interface DetectionEvidence {
    /** Text excerpt from the input */
    text: string;
    /** Tactic or technique identified */
    tactic: string;
    /** Weight/importance (0-1) */
    weight: number;
}

/**
 * Age calibration details applied to risk scoring.
 */
export interface AgeCalibration {
    /** Whether age calibration was applied */
    applied: boolean;
    /** Age group used for calibration */
    age_group?: string;
    /** Multiplier applied to base risk score */
    multiplier?: number;
}

/**
 * Unified result from fraud detection and safety-extended endpoints.
 */
export interface DetectionResult {
    /** Name of the detection endpoint */
    endpoint: string;
    /** Whether a threat was detected */
    detected: boolean;
    /** Severity score (0.0-1.0) */
    severity: number;
    /** Confidence in the detection (0.0-1.0) */
    confidence: number;
    /** Age-adjusted risk score (0.0-1.0) */
    risk_score: number;
    /** Risk level classification */
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /** Detected categories */
    categories: DetectionCategory[];
    /** Evidence excerpts (if include_evidence was true) */
    evidence?: DetectionEvidence[];
    /** Age calibration details */
    age_calibration?: AgeCalibration;
    /** Recommended action */
    recommended_action: string;
    /** Explanation of the analysis */
    rationale: string;
    /** Per-message analysis (conversation-aware endpoints) */
    message_analysis?: MessageAnalysis[];
    /** Language code used for analysis */
    language: string;
    /** Language support maturity */
    language_status: LanguageStatus;
    /** Number of credits consumed */
    credits_used?: number;
    /** Processing time in milliseconds */
    processing_time_ms?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Multi-Endpoint Analysis
// =============================================================================

/**
 * Input for multi-endpoint analysis (POST /api/v1/analyse/multi).
 */
export interface AnalyseMultiInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Detection endpoints to run (max 10) */
    detections: string[];
    /** Context for better analysis */
    context?: ContextInput;
    /** Include evidence in individual results */
    includeEvidence?: boolean;
}

/**
 * Summary of multi-endpoint analysis results.
 */
export interface AnalyseMultiSummary {
    /** Total endpoints analyzed */
    total_endpoints: number;
    /** Number of endpoints that detected a threat */
    detected_count: number;
    /** Endpoint with highest risk */
    highest_risk: { endpoint: string; risk_score: number };
    /** Overall risk level */
    overall_risk_level: string;
}

/**
 * Result from multi-endpoint analysis.
 */
export interface AnalyseMultiResult {
    /** Individual results per endpoint */
    results: DetectionResult[];
    /** Summary across all endpoints */
    summary: AnalyseMultiSummary;
    /** Cross-endpoint vulnerability modifier (1.0-2.0) */
    cross_endpoint_modifier?: number;
    /** Total credits consumed */
    credits_used?: number;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}
