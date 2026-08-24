import { TrackingFields } from './index.js';
import { ContextInput, ConversationTrajectory, RecommendedAction, SupportData } from './safety.js';
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
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Fast mode. When true, the response omits the per-message
     * `message_analysis` breakdown and returns only the verdict (level,
     * categories, recommended action). Lower latency and a smaller payload for
     * real-time screening; the verdict itself is unchanged.
     */
    verdictOnly?: boolean;
    /**
     * Opaque signed token returned by a previous call to the same endpoint.
     * Pass it back to continue the analysis with prior trajectory state; no
     * message content is stored server-side. The endpoints that maintain
     * conversation state (coercive-control, vulnerability-exploitation,
     * distress-signals) return a fresh `continuation_token` on every result.
     */
    continuationToken?: string;
    /** Discard any `continuationToken` and treat this call as a fresh conversation. */
    resetConversation?: boolean;
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
    /**
     * Recommended action, as a stable enum ordered weakest to strongest:
     * `none`, `monitor`, `flag_for_review`, `block`, `immediate_intervention`.
     * Safe to switch on. Human-readable guidance is in `action_detail`.
     */
    recommended_action: RecommendedAction;
    /**
     * Optional human-readable expansion of `recommended_action`, for display in
     * a moderator UI. Free text: do not branch on it.
     */
    action_detail?: string;
    /** Explanation of the analysis */
    rationale?: string;
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
    /**
     * Opaque signed token carrying derived trajectory state to the next call.
     * Returned by the conversation-aware endpoints (coercive-control,
     * vulnerability-exploitation, distress-signals); pass it back as
     * `continuationToken` to keep multi-turn awareness with no content stored
     * server-side.
     */
    continuation_token?: string;
    /** ISO 8601 expiry timestamp of the continuation_token. */
    continuation_expires_at?: string;
    /**
     * How prior state was sourced: "token" (decoded from a continuation_token),
     * "fresh" (no prior state), "reset" (reset_conversation forced a restart).
     */
    state_source?: 'token' | 'fresh' | 'reset';
    /**
     * Conversation-level risk (0-1). Distinct from `risk_score`, which scores
     * only the content in this request.
     *
     * Returned by the same endpoints that issue a `continuation_token`
     * (coercive-control, vulnerability-exploitation, distress-signals) once
     * there is more than one turn to reason across. Anchored on the highest
     * severity seen so far, decaying slowly across benign turns and never
     * falling below the current turn, so a calm message after an escalation
     * does not reset the picture. Derived from the signed token: no message
     * content is stored to produce it.
     *
     * Absent on the first turn, and on endpoints that do not track state.
     */
    trajectory_risk?: number;
    /**
     * Direction of travel across the conversation so far. Absent on the first
     * turn, alongside `trajectory_risk`.
     */
    trajectory?: ConversationTrajectory;
    /**
     * Per-turn severity, oldest first — the evidence behind `trajectory_risk`,
     * so a moderator can see why a benign-looking turn carries elevated
     * conversation risk.
     */
    severity_series?: number[];
    /**
     * Crisis support resources, present only when the result meets the
     * request's `supportThreshold`. Localised to `context.country`.
     */
    support?: SupportData;
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
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Fast mode. When true, individual endpoint results omit their per-message
     * `message_analysis` breakdown and return only the verdict. Lower latency
     * and a smaller payload for real-time screening.
     */
    verdictOnly?: boolean;
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
