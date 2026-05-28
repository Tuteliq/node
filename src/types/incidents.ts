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
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'new' | 'reviewing' | 'escalated' | 'resolved' | 'dismissed';

export interface ListIncidentsInput {
    /** Filter by risk_category (e.g. 'bullying', 'grooming', 'synthetic_content'). */
    category?: string;
    /** Filter by risk_level. */
    severity?: IncidentSeverity;
    /** Filter by moderation status. */
    status?: IncidentStatus;
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
    risk_category: string;
    risk_level: string;
    confidence_score: number | null;
    detected_patterns: string[];
    platform: string | null;
    language: string | null;
    source: string;
    file_id: string | null;
    status: string;
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
    recommended_actions?: string[];
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
    /** High/critical incidents in `new` or `reviewing` status — actionable triage queue size. */
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
