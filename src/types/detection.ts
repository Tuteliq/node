import { TrackingFields } from './index.js';
import { ContextInput, ConversationTrajectory, RecommendedAction, SupportData, TextDetectionRequestFields } from './safety.js';
import { ConversationType, DetectionName, LanguageStatus } from '../constants.js';
import { DeclaredContextFields, ResultAdjustments, SpeakerRole, SpeakerStance, TextDetectionFields } from './detection-fields.js';

export { LanguageStatus };
export type { DetectionName };

// =============================================================================
// Unified Detection (Fraud + Safety Extended)
// =============================================================================

/**
 * Input for all fraud detection and safety-extended endpoints.
 * Used by: detectSocialEngineering, detectAppFraud, detectRomanceScam,
 * detectMuleRecruitment, detectGamblingHarm, detectCoerciveControl,
 * detectVulnerabilityExploitation, detectRadicalisation,
 * detectDistressSignals, detectTFGBV
 */
export interface DetectionInput extends TrackingFields, TextDetectionRequestFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis */
    context?: ContextInput;
    /**
     * Include evidence excerpts in the response. Default: true. Explicitly
     * setting this always wins over the inference `verdictOnly` makes below —
     * pass `includeEvidence: true` alongside `verdictOnly: true` if you want
     * fast mode's other savings without losing evidence.
     */
    includeEvidence?: boolean;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Fast mode. When true and `includeEvidence` isn't explicitly set, this
     * also implies `includeEvidence: false` — `evidence` (with quoted
     * excerpts from the input) is the expensive field on these endpoints,
     * the equivalent of `action_detail` on the safety endpoints. The response
     * also omits the per-message `message_analysis` breakdown. `rationale`
     * and the verdict itself (level, categories, recommended action) are
     * always generated regardless of this flag.
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
    /** Flags considered for this message and withdrawn (grooming). Not evidence. */
    unsupported_flags?: string[];
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
export interface DetectionResult extends TextDetectionFields {
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
    /**
     * Evidence excerpts, with quoted spans from the input. Omitted when
     * `includeEvidence` is false, including implicitly via `verdictOnly`
     * (see `DetectionInput.verdictOnly`).
     */
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
    /**
     * Explanation of the analysis — this is what a moderator reads to triage
     * the incident, and always generated, regardless of `verdictOnly` or
     * `includeEvidence`.
     */
    rationale?: string;
    /** Per-message analysis (conversation-aware endpoints). Omitted when
     *  `verdictOnly` is set. */
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
    /** @deprecated Not returned by these endpoints. */
    trajectory_risk?: number;
    /** @deprecated Not returned by these endpoints. */
    trajectory?: ConversationTrajectory;
    /** @deprecated Not returned by these endpoints. */
    severity_series?: number[];
    /**
     * Crisis support resources, present only when the result meets the
     * request's `supportThreshold`. Localised to `context.country`.
     */
    support?: SupportData;
}


// =============================================================================
// Per-endpoint results
// =============================================================================

/** Result of `detectSocialEngineering`. */
export type SocialEngineeringResult = DetectionResult;

/** Result of `detectGamblingHarm`. */
export type GamblingHarmResult = DetectionResult;

/** Result of `detectAppFraud`. */
export interface AppFraudResult extends DetectionResult {
    /** True when the writer is the person being defrauded, reporting it. */
    target_report?: boolean;
    /** Human-readable; do not branch on it. */
    target_report_reason?: string;
}

/** Result of `detectRomanceScam`. */
export interface RomanceScamResult extends DetectionResult {
    /** Whether the speaker is using the tactics or describing someone else using them. */
    speaker_stance?: SpeakerStance;
}

/** Result of `detectMuleRecruitment`. */
export interface MuleRecruitmentResult extends DetectionResult {
    /** Whether the speaker is using the tactics or describing someone else using them. */
    speaker_stance?: SpeakerStance;
}

/** Result of `detectCoerciveControl`. */
export interface CoerciveControlResult extends DetectionResult {
    /** The speaker's relationship to the conduct. */
    speaker_role?: Exclude<SpeakerRole, 'self_directed'>;
    /** Whether the speaker is using the tactics or describing someone else using them. */
    speaker_stance?: SpeakerStance;
    /**
     * True when the writer is telling their own (or a known person's) story
     * of controlling conduct: the result offers support rather than opening a
     * moderation case.
     */
    disclosure_capped?: boolean;
    /** Human-readable; do not branch on it. */
    disclosure_capped_reason?: string;
}

/** Result of `detectVulnerabilityExploitation`. */
export interface VulnerabilityExploitationResult extends DetectionResult {
    /** Modifier (1.0-2.0) applied to other endpoints' scores in `analyseMulti`. */
    cross_endpoint_modifier?: number;
    /** Vulnerability dimensions read from the text (0-1 each). */
    vulnerability_profile?: {
        emotional_vulnerability: number;
        cognitive_vulnerability: number;
        situational_vulnerability: number;
        social_vulnerability: number;
    };
    /** Whether the speaker is using the tactics or describing someone else using them. */
    speaker_stance?: SpeakerStance;
}

/** Result of `detectRadicalisation`. */
export interface RadicalisationResult extends DetectionResult {
    /** Whether the speaker is using the rhetoric or describing someone else using it. */
    speaker_stance?: SpeakerStance;
    /** True when the result should be reviewed ahead of others. */
    priority_review?: boolean;
    /** Human-readable; do not branch on it. */
    priority_review_reason?: string;
    /** Whether the content is aimed at the speaker or seen as a bystander. */
    exposure_target?: 'self_targeted' | 'bystander' | 'unclear';
}

/** Result of `detectDistressSignals`. */
export interface DistressSignalsResult extends DetectionResult {
    /** How the distress words are used. */
    distress_reading?: 'literal_present' | 'about_other' | 'past_resolved' | 'figurative' | 'quoted' | 'none';
    /** Who the distress is about; echoes `context.authorRole`. */
    distress_subject?: 'speaker' | 'other_party';
    /** True when a supportive check-in is suggested rather than a moderation case. */
    support_suggested?: boolean;
}

/** Result of `detectTFGBV`. */
export interface TFGBVResult extends DetectionResult {
    /** The speaker's relationship to the conduct. */
    speaker_role?: SpeakerRole;
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
    /**
     * Detection endpoints to run (max 10). The `Detection` enum lists them.
     */
    detections: DetectionName[];
    /** Context for better analysis */
    context?: ContextInput;
    /** Include evidence in individual results */
    includeEvidence?: boolean;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Word-list profanity flag, applied to the bullying and unsafe results
     * only. Same semantics as `flagProfanity` on `detectBullying`.
     */
    flagProfanity?: boolean;
    /**
     * Word-list drug and violence term flag, applied to the bullying and
     * unsafe results only. Same semantics as `flagRiskTerms` on `detectBullying`.
     */
    flagRiskTerms?: boolean;
    /**
     * @deprecated The multi-endpoint route has no fast mode; this is not sent.
     */
    verdictOnly?: boolean;
}

/**
 * One endpoint's result inside `analyseMulti`, normalised across detectors.
 * Fields specific to one detector are present only on that detector's result.
 */
export interface MultiDetectionResult extends DeclaredContextFields, ResultAdjustments {
    /** Name of the detection endpoint */
    endpoint: DetectionName;
    detected: boolean;
    severity: number;
    confidence: number;
    risk_score: number;
    level?: string;
    categories: DetectionCategory[];
    evidence?: DetectionEvidence[];
    recommended_action: RecommendedAction;
    rationale?: string;
    credits_used?: number;
    /** Account policy rules evaluated for this detector. */
    policy_action?: Record<string, unknown>;
    /** Bullying and unsafe only, when `flagProfanity` is set. */
    profanity?: { detected: boolean; matches: string[] } | null;
    /** Bullying and unsafe only, when `flagRiskTerms` is set. */
    risk_terms?: { detected: boolean; matches: Array<{ term: string; category: 'drug' | 'violence' }> } | null;
    /** See `UnsafeResult.third_party_concern`. */
    third_party_concern?: boolean;
    third_party_concern_reason?: string;
    /** See `BullyingResult.bullying_reported`. */
    bullying_reported?: boolean;
    bullying_reported_by?: 'target' | 'bystander';
    bullying_reported_reason?: string;
    /** See `CoerciveControlResult.disclosure_capped`. */
    disclosure_capped?: boolean;
    disclosure_capped_reason?: string;
    /** See `DistressSignalsResult.support_suggested`. */
    support_suggested?: boolean;
    speaker_role?: SpeakerRole;
    speaker_stance?: SpeakerStance;
}

/**
 * Summary of multi-endpoint analysis results.
 */
export interface AnalyseMultiSummary {
    /** Total endpoints analyzed */
    total_endpoints: number;
    /** Number of endpoints that detected a threat */
    detected_count: number;
    /** The primary classification and its own score */
    highest_risk: {
        endpoint: string;
        risk_score: number;
        /**
         * Other detected endpoints scoring about the same. When present, read
         * them as part of the finding rather than treating `endpoint` alone
         * as the classification.
         */
        close_calls?: Array<{ endpoint: string; risk_score: number }>;
    };
    /** Overall risk level */
    overall_risk_level: string;
    processing_time_ms?: number;
    /** Total credits consumed across every endpoint */
    total_credits_used?: number;
    /** True when the vulnerability modifier was applied to the other results */
    vulnerability_modifier_applied?: boolean;
    /**
     * `complete` when every requested detector answered. `partial` when at
     * least one did not (see `failed_endpoints`); `recommended_action` then
     * asks for human review, because a detector that did not answer is not
     * one that found nothing.
     */
    analysis_status?: 'complete' | 'partial';
    /** Present only when `analysis_status` is `partial`. */
    recommended_action?: RecommendedAction;
    /** Present only when `analysis_status` is `partial`. Free text. */
    action_detail?: string;
    /** Detectors that could not produce an analysis */
    failed_endpoints?: Array<{ endpoint: string; code: string; error: string }>;
    /** Endpoints skipped because they are disabled in your detection settings */
    skipped_endpoints?: string[];
    skipped_reason?: string;
}

/**
 * Result from multi-endpoint analysis.
 */
export interface AnalyseMultiResult {
    /** Individual results per endpoint */
    results: MultiDetectionResult[];
    /** Summary across all endpoints */
    summary: AnalyseMultiSummary;
    /** Cross-endpoint vulnerability modifier (1.0-2.0) */
    cross_endpoint_modifier?: number;
    /** @deprecated Not returned by the API; use `summary.total_credits_used`. */
    credits_used?: number;
    /** Crisis support resources relevant to the detected risk */
    support?: SupportData;
    /** Echo of provided external_id */
    external_id?: string;
    /** Echo of provided customer_id */
    customer_id?: string;
    /** Echo of provided metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Nickname
// =============================================================================

/** How readily a doubtful reading of a display name is acted on. */
export type NicknameStrictness = 'cautious' | 'balanced' | 'strict';

/** Concern categories a display name can be read under. */
export type NicknameCategory =
    | 'self_harm_promotion'
    | 'impersonation_of_staff_or_support'
    | 'hate_or_extremist_reference'
    | 'sexualised'
    | 'seeks_older_contact'
    | 'harassment_of_named_person'
    | 'contact_detail_or_off_platform_lure'
    | 'age_disclosure';

/** Input for `detectNickname` (POST /api/v1/safety/nickname). */
export interface DetectNicknameInput {
    /** The display name as typed (1-64 characters). */
    name: string;
    /** Default: `balanced`. */
    strictness?: NicknameStrictness;
    context?: {
        /** Two-letter language code */
        language?: string;
        /** Age group of the person choosing the name, e.g. "11-13" */
        ageGroup?: string;
        /** The setting the name is shown in */
        conversationType?: ConversationType;
        /**
         * Your platform's own staff and support names (max 20, each up to 32
         * characters), so copies of them can be recognised.
         */
        platformReserved?: string[];
    };
}

/**
 * Result of `detectNickname`. A signal about the name, not a verdict on the
 * person. It carries `recommendation`, not `recommended_action`, so do not
 * pass it to `strongestAction` or `isActionable`.
 */
export interface NicknameResult {
    signal: 'none' | 'low' | 'review';
    categories: NicknameCategory[];
    /** How each part of the name was read */
    parts: Array<{ text: string; reading: 'ordinary' | 'concerning' | 'unclear'; category: NicknameCategory | null }>;
    rationale: string;
    /** Advice for the name. Never an emergency action. */
    recommendation: 'allow' | 'allow_and_watch' | 'ask_to_rename' | 'hold_for_review';
    /** Free text: do not branch on it. */
    recommendation_detail: string;
    confidence: number;
    language: string | null;
    strictness: NicknameStrictness;
    /**
     * False when nothing could be analysed: the call is not charged and
     * should be retried, and `signal` (then `none`) must not be read as clean.
     */
    reading_complete: boolean;
    credits_used: number;
}
