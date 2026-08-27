import {
    Severity,
    GroomingRisk,
} from '../constants.js';
import { TrackingFields } from './index.js';
import { MessageAnalysis } from './detection.js';

// Re-export enums for convenience
export { Severity, GroomingRisk };

/**
 * The action Tuteliq recommends, as a fixed set of values ordered weakest to
 * strongest. This is the field to branch on: it is stable across releases and
 * safe to `switch` over.
 *
 * - `none` — no signal
 * - `monitor` — log it, no human needed
 * - `flag_for_review` — queue for a moderator
 * - `block` — withhold or limit the content
 * - `immediate_intervention` — crisis path
 *
 * Human-readable guidance lives in `action_detail`, never here.
 */
export type RecommendedAction =
    | 'none'
    | 'monitor'
    | 'flag_for_review'
    | 'block'
    | 'immediate_intervention';

/**
 * Direction of travel across a conversation, reported alongside
 * `trajectory_risk` by the endpoints that maintain continuation state.
 *
 * - `rising` — severity is trending upward across turns
 * - `stable` — severity is holding
 * - `declining` — severity is trending downward
 * - `none` — not enough signal to call a direction
 *
 * `declining` is not the same as safe: `trajectory_risk` stays anchored on the
 * worst turn seen and decays only slowly, which is the point.
 */
export type ConversationTrajectory = 'rising' | 'stable' | 'declining' | 'none';

/** Weakest to strongest. Used to compare and combine actions. */
const ACTION_RANK: Record<RecommendedAction, number> = {
    none: 0,
    monitor: 1,
    flag_for_review: 2,
    block: 3,
    immediate_intervention: 4,
};

/**
 * True when the verdict warrants a human looking at it, i.e. `flag_for_review`
 * or stronger. Use this instead of branching on the bare presence of a signal:
 * `is_bullying` / `unsafe` / a `low` grooming risk all fire on monitor-only
 * cases and will over-alert.
 */
export function isActionable(action: RecommendedAction | undefined): boolean {
    return action !== undefined && ACTION_RANK[action] >= ACTION_RANK.flag_for_review;
}

/**
 * Spellings older API versions used for the same rungs. The SDK and the API
 * are released separately, so a current SDK will talk to an older deployment
 * during a rollout. Mapping these rather than ignoring them keeps a
 * moderator-worthy verdict from being silently downgraded across that window.
 */
const LEGACY_ALIASES: Record<string, RecommendedAction> = {
    no_action: 'none',
    flag_for_moderator: 'flag_for_review',
};

/**
 * Normalise a value from the API into the canonical enum. Returns `undefined`
 * for anything unrecognised, so callers can decide how to treat it.
 */
export function toRecommendedAction(value: unknown): RecommendedAction | undefined {
    if (typeof value !== 'string') return undefined;
    if (value in ACTION_RANK) return value as RecommendedAction;
    return LEGACY_ALIASES[value];
}

/**
 * The strongest action among the given values. Absent values are skipped and
 * legacy spellings are mapped; a value that cannot be recognised at all is
 * treated as `flag_for_review` rather than discarded, so an unfamiliar verdict
 * from a newer API reaches a human instead of vanishing.
 */
export function strongestAction(
    actions: Array<RecommendedAction | string | undefined>,
): RecommendedAction {
    let best: RecommendedAction = 'none';
    for (const raw of actions) {
        if (raw === undefined || raw === null) continue;
        const action = toRecommendedAction(raw) ?? 'flag_for_review';
        if (ACTION_RANK[action] > ACTION_RANK[best]) best = action;
    }
    return best;
}

/**
 * Context type - can be a string shorthand or detailed object
 */
export type ContextInput = string | {
    /** Language of the content (e.g., "en") */
    language?: string;
    /** Age group (e.g., "11-13", "14-17") */
    ageGroup?: string;
    /** Relationship between participants (e.g., "classmates", "strangers") */
    relationship?: string;
    /**
     * Your platform/app name (e.g. "MyApp", "Discord Bot"), used for dashboard
     * attribution and calibration. The SDK appends its own identifier before
     * sending it — "MyApp" is sent to the API as "MyApp - Node SDK" — so pass
     * your product's name here, not a category like "chat" or "social_media".
     */
    platform?: string;
    /** ISO 3166-1 alpha-2 country code (e.g., "GB", "US") for geo-localised helpline data */
    country?: string;
};

// =============================================================================
// Crisis Support
// =============================================================================

/** A single crisis helpline entry. */
export interface SupportHelpline {
    /** Organisation name */
    name: string;
    /** Phone number or short code, as dialled locally */
    number: string;
    /** What the line covers */
    description?: string;
    /**
     * Coarse topic of the line, e.g. `childProtection`, `mentalHealth`,
     * `domesticViolence`, `fraudPrevention`, `gambling`, `crisis`, `general`.
     * Use it to tell a topical line apart from a general one.
     */
    category?: string;
    /** Opening hours, e.g. "24/7" */
    available?: string;
}

/** Guidance shown alongside the helplines. */
export interface SupportResponseGuide {
    category?: string;
    immediateActions: string[];
    childSpecificActions?: string[];
    resources: Array<{ name: string; description?: string; url?: string }>;
    confidential?: boolean;
    language?: string;
}

/**
 * Crisis support block attached to a positive detection once the result meets
 * the request's `supportThreshold`. Localised to `context.country` when one is
 * supplied, otherwise to the account's country, otherwise inferred from the
 * detected language.
 */
export interface SupportData {
    /** ISO 3166-1 alpha-2 code the helplines were localised for */
    country?: string;
    /** Display name of that country */
    country_name?: string;
    /** Local emergency number */
    emergency_number?: string;
    helplines: SupportHelpline[];
    /** Highest-priority guide */
    response_guide?: SupportResponseGuide;
    /** All matching guides, highest priority first */
    response_guides?: SupportResponseGuide[];
    /** BCP-47 language of the guide content */
    language?: string;
}

// =============================================================================
// Bullying Detection
// =============================================================================

export interface DetectBullyingInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis - string shorthand or detailed object */
    context?: ContextInput;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Fast mode. When true, the response omits the per-message
     * `message_analysis` breakdown and returns only the conversation-level
     * verdict (risk level, flags, recommended action). Lower latency and a
     * smaller payload — use it to screen live chat in real time, then re-run
     * flagged content in standard mode for the full breakdown. The verdict
     * itself is unchanged.
     */
    verdictOnly?: boolean;
    /**
     * Opaque signed token returned by a prior /bullying call. Carries derived
     * conversation-trajectory state (category counts, severity history) into
     * the next call without storing any user content server-side. Pass back
     * verbatim to maintain multi-turn awareness across calls.
     */
    continuationToken?: string;
    /**
     * If true, discard any provided continuationToken and start a fresh
     * conversation. Useful when starting a new chat in the same session.
     */
    resetConversation?: boolean;
    /**
     * Additive, deterministic word-list flag for plain profanity/vulgarity.
     * When true, adds a `profanity` field to the response — never affects
     * `is_bullying`, `severity`, `risk_score`, or `recommended_action`. Free —
     * no extra credits. Not a harm classifier: does not cover slurs or hate
     * speech, which the detector itself already handles with full context.
     * Explicit `true`/`false` here always overrides your account's
     * `default_flag_profanity` setting for this call; omit to use the
     * account default. **Requires the API deployed on or after 2026-08-25.**
     */
    flagProfanity?: boolean;
    /**
     * Additive, deterministic word-list flag for bare drug and violence terms
     * (e.g. "cocaine", "kill"). When true, adds a `risk_terms` field to the
     * response — never affects `is_bullying`, `severity`, `risk_score`, or
     * `recommended_action`. Free — no extra credits. Purely lexical: WILL
     * fire on benign uses of an included term ("kill the lights"), since it
     * cannot read context the way the detector itself does. Explicit
     * `true`/`false` here always overrides your account's
     * `default_flag_risk_terms` setting for this call; omit to use the
     * account default. **Requires the API deployed on or after 2026-08-25.**
     */
    flagRiskTerms?: boolean;
}

export interface BullyingResult {
    /** Whether bullying was detected */
    is_bullying: boolean;
    /** Types of bullying detected */
    bullying_type: string[];
    /** Confidence score (0-1) */
    confidence: number;
    /** Severity of the bullying */
    severity: Severity;
    /**
     * Explanation of the analysis — this is what a moderator reads to triage
     * the incident, and always generated, including when `verdictOnly` is set.
     */
    rationale?: string;
    /**
     * Recommended action, as a stable enum. Branch on this (or `isActionable`)
     * rather than on the bare presence of a signal.
     */
    recommended_action: RecommendedAction;
    /**
     * Optional human-readable expansion of `recommended_action`, for display in
     * a moderator UI. Free text: do not branch on it. Omitted when
     * `verdictOnly` is set — this is the field fast mode cuts, not `rationale`.
     */
    action_detail?: string;
    /** Risk score (0-1) */
    risk_score: number;
    /** Language code used for analysis */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
    /**
     * Opaque signed token carrying derived analysis state to the next call.
     * Pass back as `continuationToken` on the next /bullying request to
     * preserve multi-turn awareness without server-side content storage.
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
     * only the message in this request.
     *
     * `risk_score` answers "should I action this message"; `trajectory_risk`
     * answers "is this conversation going badly". They diverge exactly where it
     * matters: a "see you tomorrow :)" sent straight after two flagged turns
     * scores near zero on its own and 0.74 as a conversation. Branch on the
     * higher of the two, not on `risk_score` alone.
     *
     * Anchored on the highest severity seen so far, decaying slowly across
     * benign turns and never falling below the current turn. Derived from the
     * signed `continuation_token`: no message content is stored to produce it.
     *
     * Absent on the first turn of a fresh conversation, where it would only
     * restate `risk_score`.
     */
    trajectory_risk?: number;
    /**
     * Direction of travel across the conversation so far. Absent on the first
     * turn, alongside `trajectory_risk`.
     */
    trajectory?: ConversationTrajectory;
    /**
     * Per-turn severity, oldest first — the evidence behind `trajectory_risk`.
     * Render it rather than asserting the number: it is what shows a moderator
     * why a benign-looking message arrived with elevated conversation risk.
     */
    severity_series?: number[];
    /**
     * True when a coded-term match pushed severity toward critical but this
     * endpoint's corroboration-cap logic held `recommended_action` below
     * `immediate_intervention` pending independent confirmation. Absent when
     * no cap applied.
     */
    escalation_capped?: boolean;
    /** Human-readable explanation of the cap. Present only when `escalation_capped` is true. */
    escalation_capped_reason?: string;
    /**
     * Present only when `flagProfanity` on this request (or the account-level
     * `default_flag_profanity` setting) is true. Deterministic word-list
     * result — additive, never affects `is_bullying`/`severity`/`risk_score`/
     * `recommended_action`.
     */
    profanity?: { detected: boolean; matches: string[] } | null;
    /**
     * Present only when `flagRiskTerms` on this request (or the account-level
     * `default_flag_risk_terms` setting) is true. Deterministic drug/violence
     * word-list result — additive, never affects
     * `is_bullying`/`severity`/`risk_score`/`recommended_action`. Purely
     * lexical: can fire on benign uses of an included term.
     */
    risk_terms?: { detected: boolean; matches: Array<{ term: string; category: 'drug' | 'violence' }> } | null;
    /**
     * Crisis support resources, present only when the result meets the
     * request's `supportThreshold`. Localised to `context.country`.
     */
    support?: SupportData;
}

// =============================================================================
// Grooming Detection
// =============================================================================

export interface GroomingMessage {
    /** Role of sender */
    role: 'adult' | 'child' | 'unknown' | string;
    /** Message content */
    content: string;
    /** Optional timestamp */
    timestamp?: string | Date;
    /**
     * Optional numeric age of THIS message's sender. Helps the engine reason
     * about age asymmetry per turn rather than inferring it from `role`.
     */
    senderAge?: number;
}

export interface DetectGroomingInput extends TrackingFields {
    /** Sequence of messages to analyze */
    messages: GroomingMessage[];
    /** Age of the child (optional) */
    childAge?: number;
    /**
     * Optional age of the non-minor participant in the conversation. When
     * known (e.g. on age-verified platforms), this lets the engine compute
     * the actual age gap rather than infer it from role labels alone.
     */
    participantAge?: number;
    /** Context for better analysis */
    context?: ContextInput;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Fast mode. When true, the response omits the per-message
     * `message_analysis` breakdown and returns only the conversation-level
     * verdict (grooming risk, flags, recommended action). Lower latency and a
     * smaller payload — ideal for screening live chat in real time, then
     * re-running flagged conversations in standard mode for the full
     * per-message trajectory. The verdict itself is unchanged.
     */
    verdictOnly?: boolean;
    /**
     * Opaque signed token returned by a prior /grooming call. Carries derived
     * conversation-trajectory state (category counts, severity history) into
     * the next call without storing any user content server-side. Pass back
     * verbatim on the next call to maintain multi-turn awareness across the
     * sliding window — recommended for conversations that exceed a single
     * sane chunk size (~20-30 turns).
     */
    continuationToken?: string;
    /**
     * If true, discard any provided continuationToken and analyze the messages
     * as a fresh conversation. Useful when the user starts a new chat.
     */
    resetConversation?: boolean;
}

export interface GroomingResult {
    /** Level of grooming risk detected */
    grooming_risk: GroomingRisk;
    /** Confidence score (0-1) */
    confidence: number;
    /** Grooming indicators/flags detected */
    flags: string[];
    /**
     * Explanation of the analysis — this is what a moderator reads to triage
     * the incident, and always generated, including when `verdictOnly` is set.
     */
    rationale: string;
    /** Risk score (0-1) */
    risk_score: number;
    /**
     * Recommended action, as a stable enum. Branch on this (or `isActionable`)
     * rather than on the bare presence of a signal.
     */
    recommended_action: RecommendedAction;
    /**
     * Optional human-readable expansion of `recommended_action`, for display in
     * a moderator UI. Free text: do not branch on it. Omitted when
     * `verdictOnly` is set.
     */
    action_detail?: string;
    /** Per-message analysis (conversation-aware endpoints). Omitted when
     *  `verdictOnly` is set. */
    message_analysis?: MessageAnalysis[];
    /** Language code used for analysis */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
    /**
     * Opaque signed token carrying derived analysis state to the next call.
     * Pass back as `continuationToken` on the next /grooming request to
     * preserve multi-turn awareness without server-side content storage.
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
     * Conversation-level risk (0-1) across every window seen so far. Distinct
     * from `risk_score`, which scores only the messages in this request.
     *
     * Grooming is a slow burn, so a chunked conversation whose current window
     * reads benign can still be at high conversation risk. Branch on the higher
     * of the two, not on `risk_score` alone.
     *
     * Anchored on the highest severity seen so far, decaying slowly across
     * benign windows and never falling below the current one. Derived from the
     * signed `continuation_token`: no message content is stored to produce it.
     *
     * Absent on the first call of a fresh conversation.
     */
    trajectory_risk?: number;
    /**
     * Direction of travel across the conversation so far. Absent on the first
     * call, alongside `trajectory_risk`.
     */
    trajectory?: ConversationTrajectory;
    /**
     * Per-window severity, oldest first — the evidence behind
     * `trajectory_risk`. Render it rather than asserting the number: it is what
     * shows a moderator why a benign-looking window carries elevated
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
// Unsafe Content Detection
// =============================================================================

export interface DetectUnsafeInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis */
    context?: ContextInput;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
    /**
     * Fast mode. When true, the response omits any per-message
     * `message_analysis` breakdown and returns only the verdict. Lower latency
     * and a smaller payload for real-time screening; the verdict is unchanged.
     */
    verdictOnly?: boolean;
    /**
     * Additive, deterministic word-list flag for plain profanity/vulgarity.
     * When true, adds a `profanity` field to the response — never affects
     * `unsafe`, `severity`, `risk_score`, or `recommended_action`. Free — no
     * extra credits. Not a harm classifier: does not cover slurs or hate
     * speech, which the detector itself already handles with full context.
     * Explicit `true`/`false` here always overrides your account's
     * `default_flag_profanity` setting for this call; omit to use the
     * account default. **Requires the API deployed on or after 2026-08-25.**
     */
    flagProfanity?: boolean;
    /**
     * Additive, deterministic word-list flag for bare drug and violence terms
     * (e.g. "cocaine", "kill"). When true, adds a `risk_terms` field to the
     * response — never affects `unsafe`, `severity`, `risk_score`, or
     * `recommended_action`. Free — no extra credits. Purely lexical: WILL
     * fire on benign uses of an included term ("kill the lights"), since it
     * cannot read context the way the detector itself does. Explicit
     * `true`/`false` here always overrides your account's
     * `default_flag_risk_terms` setting for this call; omit to use the
     * account default. **Requires the API deployed on or after 2026-08-25.**
     */
    flagRiskTerms?: boolean;
}

export interface UnsafeResult {
    /** Whether unsafe content was detected */
    unsafe: boolean;
    /** Categories of unsafe content detected */
    categories: string[];
    /** Severity of the unsafe content */
    severity: Severity;
    /** Confidence score (0-1) */
    confidence: number;
    /** Risk score (0-1) */
    risk_score: number;
    /** Risk level derived from risk_score */
    risk_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /**
     * Explanation of the analysis — this is what a moderator reads to triage
     * the incident, and always generated, including when `verdictOnly` is set.
     */
    rationale?: string;
    /**
     * Recommended action, as a stable enum. Branch on this (or `isActionable`)
     * rather than on the bare presence of a signal.
     */
    recommended_action: RecommendedAction;
    /**
     * Optional human-readable expansion of `recommended_action`, for display in
     * a moderator UI. Free text: do not branch on it. Omitted when
     * `verdictOnly` is set — this is the field fast mode cuts, not `rationale`.
     */
    action_detail?: string;
    /** Language code used for analysis */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
    /**
     * True when a coded-term match pushed severity toward critical but this
     * endpoint's corroboration-cap logic held `recommended_action` below
     * `immediate_intervention` pending independent confirmation. Absent when
     * no cap applied.
     */
    escalation_capped?: boolean;
    /** Human-readable explanation of the cap. Present only when `escalation_capped` is true. */
    escalation_capped_reason?: string;
    /**
     * Present only when `flagProfanity` on this request (or the account-level
     * `default_flag_profanity` setting) is true. Deterministic word-list
     * result — additive, never affects `unsafe`/`severity`/`risk_score`/
     * `recommended_action`.
     */
    profanity?: { detected: boolean; matches: string[] } | null;
    /**
     * Present only when `flagRiskTerms` on this request (or the account-level
     * `default_flag_risk_terms` setting) is true. Deterministic drug/violence
     * word-list result — additive, never affects
     * `unsafe`/`severity`/`risk_score`/`recommended_action`. Purely lexical:
     * can fire on benign uses of an included term.
     */
    risk_terms?: { detected: boolean; matches: Array<{ term: string; category: 'drug' | 'violence' }> } | null;
    /**
     * Crisis support resources, present only when the result meets the
     * request's `supportThreshold`. Localised to `context.country`.
     */
    support?: SupportData;
}

// =============================================================================
// Quick Analysis (Combined)
// =============================================================================

export interface AnalyzeInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis */
    context?: ContextInput;
    /** Which detections to run (defaults to ['bullying', 'unsafe']) */
    include?: Array<'bullying' | 'unsafe'>;
    /**
     * Fast mode, forwarded to each detector this call fans out to. The
     * bullying and unsafe endpoints skip generating `action_detail` — the
     * moderator-guidance expansion of `recommended_action` — which cuts
     * response size and latency. `rationale`, the field a moderator actually
     * reads to triage an incident, is always generated regardless of this
     * flag. The verdict (severity, categories, recommended_action, risk_score)
     * is unchanged, as is the combined `risk_level` this method derives.
     *
     * Because the sub-calls run in parallel, the saving here is the difference
     * on the slower detector rather than the full per-call saving.
     */
    verdictOnly?: boolean;
    /**
     * Forwarded to each detector this call fans out to, same semantics as
     * `flagProfanity` on `detectBullying`/`detectUnsafe` directly: an
     * additive, deterministic word-list flag that adds a `profanity` field to
     * `result.bullying`/`result.unsafe`, never affecting risk scoring or
     * `recommended_action`. Omit to use the account's `default_flag_profanity`
     * setting. **Requires the API deployed on or after 2026-08-25.**
     */
    flagProfanity?: boolean;
    /**
     * Forwarded to each detector this call fans out to, same semantics as
     * `flagRiskTerms` on `detectBullying`/`detectUnsafe` directly: an
     * additive, deterministic word-list flag for bare drug/violence terms
     * that adds a `risk_terms` field to `result.bullying`/`result.unsafe`,
     * never affecting risk scoring or `recommended_action`. Omit to use the
     * account's `default_flag_risk_terms` setting. **Requires the API
     * deployed on or after 2026-08-25.**
     */
    flagRiskTerms?: boolean;
}

export interface AnalyzeResult {
    /** Overall risk assessment */
    risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    /** Overall risk score (0-1) */
    risk_score: number;
    /** Overall confidence score (0-1), highest from sub-results */
    confidence: number;
    /** Summary of findings */
    summary: string;
    /** Bullying detection result (if included) */
    bullying?: BullyingResult;
    /** Unsafe content result (if included) */
    unsafe?: UnsafeResult;
    /** Strongest recommended action across the included sub-results. */
    recommended_action: RecommendedAction;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
    /**
     * Echo of provided incident_moderation_enabled (if any). The method emitted
     * this before it forwarded the flag to the detectors it fans out to; it is
     * now genuinely applied to both sub-calls.
     */
    incident_moderation_enabled?: boolean;
}

// Legacy type aliases for backwards compatibility
export type DetectBullyingRequest = DetectBullyingInput;
export type DetectBullyingResponse = BullyingResult;
export type DetectGroomingRequest = DetectGroomingInput;
export type DetectGroomingResponse = GroomingResult;
export type DetectUnsafeRequest = DetectUnsafeInput;
export type DetectUnsafeResponse = UnsafeResult;
