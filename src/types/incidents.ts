/**
 * V3.15.5 — Read-only dashboard query types.
 *
 * These mirror the shapes returned by `GET /api/v1/incidents/*` and back the
 * `listIncidents` / `getIncident` / `getIncidentsOverview` / `getIncidentTrends`
 * methods. Server-encrypted fields are decrypted server-side; BYOK hybrid
 * envelopes are passed through with `_e2e_envelope_fields` listing which
 * fields the caller must decrypt client-side with their RSA private key.
 */

export type IncidentSource = 'text' | 'voice' | 'image' | 'video' | 'video_stream';
/** An incident's stored `risk_level`. Detection responses and webhooks spell `moderate` as `medium`. */
export type IncidentSeverity = 'low' | 'moderate' | 'high' | 'critical';
/** An incident's moderation `status`. */
export type IncidentStatus = 'new' | 'reviewed' | 'escalated' | 'resolved' | 'dismissed';
/** An incident's `risk_category`. */
export type IncidentCategory =
    | 'bullying'
    | 'grooming'
    | 'unsafe'
    | 'self_harm'
    | 'other'
    | 'social_engineering'
    | 'app_fraud'
    | 'romance_scam'
    | 'mule_recruitment'
    | 'gambling_harm'
    | 'coercive_control'
    | 'vulnerability_exploitation'
    | 'radicalisation'
    | 'distress_signals'
    | 'tfgbv'
    | 'synthetic_content';

/** Whether the speaker is doing what was detected or reporting someone else doing it. */
export type SpeakerStance = 'deploying' | 'describing_third_party' | 'unclear';

export interface ListIncidentsInput {
    /** Filter by risk_category (e.g. 'bullying', 'grooming', 'synthetic_content'). */
    category?: IncidentCategory | (string & {});
    /**
     * Filter by risk_level. `medium` is accepted as another spelling of
     * `moderate` and returns the same incidents.
     */
    severity?: IncidentSeverity | 'medium';
    /**
     * Filter by moderation status. `reviewing` is deprecated: it is still
     * accepted, but no incident holds it, so it returns nothing. Use `new`
     * for incidents nobody has acted on and `reviewed` for ones a moderator has.
     */
    status?: IncidentStatus | 'reviewing';
    /** Filter by source modality. */
    source?: IncidentSource;
    /** ISO 8601 inclusive lower bound on created_at. */
    from?: string;
    /** ISO 8601 exclusive upper bound on created_at. */
    to?: string;
    /** Filter by recorded platform string. */
    platform?: string;
    /** Filter by your customer-provided correlation id. */
    externalId?: string;
    /** Filter by your end-customer id. */
    customerId?: string;
    /** 1..100 rows per page. Defaults to 25. */
    limit?: number;
    /** Opaque cursor returned by the previous page's `next_cursor`. */
    cursor?: string;
    /**
     * When true, include the decrypted `summary` text on each row. Costs an
     * extra credit per row (BYOK envelopes are returned as-is for client
     * decryption — same cost).
     */
    includeSummary?: boolean;
}

export interface IncidentSummaryRow {
    id: string;
    risk_category: IncidentCategory;
    risk_level: IncidentSeverity;
    confidence_score: number | null;
    detected_patterns: string[];
    /** Routing keys for this incident, on list rows as well as detail. */
    recommended_actions: string[];
    platform: string | null;
    language: string | null;
    source: IncidentSource;
    file_id: string | null;
    status: IncidentStatus;
    /**
     * Your policy rules' verdict on this incident, in the same shape as the
     * detection response's `policy_action`. Null when no rule matched.
     */
    policy_action: Record<string, unknown> | null;
    /** Advisory next status for a moderator. Never applied automatically. */
    recommended_status: IncidentStatus | null;
    /** True when urgency was held back pending independent corroboration. Null when no cap applied. */
    escalation_capped: boolean | null;
    escalation_capped_reason: string | null;
    /** Whether the speaker is doing what was detected or reporting it. Null when not assessed. */
    speaker_stance: SpeakerStance | null;
    /** True when the action was lowered because the speaker is reporting a third party. Null when no cap applied. */
    action_capped: boolean | null;
    action_capped_reason: string | null;
    /** True when the incident came from a non-production API key (test traffic). */
    is_test: boolean | null;
    external_id: string | null;
    customer_id: string | null;
    created_at: string;
    /** Present when `includeSummary: true` was requested. */
    summary?: string | Record<string, unknown> | null;
    /**
     * Field names that are BYOK hybrid envelopes and must be decrypted
     * client-side with your registered RSA private key. Empty / undefined
     * when all fields are server-decryptable or the account has no key
     * registered.
     */
    _e2e_envelope_fields?: string[];
}

export interface ListIncidentsResult {
    incidents: IncidentSummaryRow[];
    /** Pass back as `cursor` on the next call. Null when there are no more pages. */
    next_cursor: string | null;
    total_returned: number;
}

export interface IncidentDetail extends IncidentSummaryRow {
    summary: string | Record<string, unknown> | null;
    metadata?: string | Record<string, unknown> | null;
    source_data?: Record<string, unknown> | null;
    visual_categories?: string[] | null;
    visual_severity?: string | null;
    visual_confidence?: number | null;
    contains_text?: boolean | null;
    contains_faces?: boolean | null;
    emotional_indicators?: string[];
    review?: Record<string, unknown> | null;
    /**
     * Per-message trajectory for multi-turn endpoints (grooming, etc).
     * Index + risk_score + tactic flags per message. The dashboard widget
     * renders this as a line chart showing the conversation's risk ramp.
     * Null for single-turn incidents.
     */
    message_analysis?: Array<{
        message_index: number;
        risk_score: number;
        flags: string[];
    }> | null;
}

export interface IncidentsOverviewInput {
    /** ISO 8601 inclusive lower bound. Defaults to now - 30 days. */
    from?: string;
    /** ISO 8601 exclusive upper bound. Defaults to now. */
    to?: string;
}

export interface IncidentsOverview {
    timeframe: { from: string; to: string };
    total_incidents: number;
    /** High/critical incidents nobody has acted on yet: the actionable triage queue size. */
    requires_review_count: number;
    last_24h_count: number;
    last_7d_count: number;
    last_30d_count: number;
    counts_by_category: Record<string, number>;
    counts_by_severity: Record<string, number>;
    counts_by_source: Record<string, number>;
    counts_by_status: Record<string, number>;
    /** Top 5 platforms by incident count, descending. */
    top_platforms: Array<{ platform: string; count: number }>;
}

export interface IncidentTrendsInput {
    /** Bucket size; defaults to `day`. */
    bucket?: 'hour' | 'day' | 'week';
    /** ISO 8601 inclusive lower bound. Defaults to now - 30 days. */
    from?: string;
    /** ISO 8601 exclusive upper bound. Defaults to now. */
    to?: string;
}

export interface IncidentTrendsBucket {
    bucket_start: string;
    total: number;
    by_severity: Record<string, number>;
}

export interface IncidentTrends {
    bucket_size: 'hour' | 'day' | 'week';
    timeframe: { from: string; to: string };
    series: IncidentTrendsBucket[];
}
