// =============================================================================
// Threat Intelligence (Business+ tier)
// =============================================================================

/** Options for querying anonymised threat intelligence trends. */
export interface IntelligenceTrendsOptions {
    /** Window size in days (default 30, max 90) */
    days?: number;
    /** Filter by detection endpoint (e.g., "bullying", "grooming") */
    endpoint?: string;
    /** Filter by age group (e.g., "under_13", "13_17") */
    age_group?: string;
    /** Filter by platform (e.g., "discord", "instagram") */
    platform?: string;
}

/** Anonymised threat intelligence trends. */
export interface IntelligenceTrendsResult {
    period: { start: string; end: string };
    total_signals: number;
    trends_by_endpoint: Array<Record<string, unknown>>;
    trends_by_category: Array<Record<string, unknown>>;
    trends_by_age_group: Array<Record<string, unknown>>;
    trends_by_platform: Array<Record<string, unknown>>;
    emerging_threats: Array<Record<string, unknown>>;
    geographic_trends: Array<Record<string, unknown>>;
}

/** Emerging threats over a recent window. */
export interface EmergingThreatsResult {
    period_days: number;
    emerging_threats: Array<Record<string, unknown>>;
}

/** Weekly threat intelligence digest. */
export interface WeeklyDigestResult {
    /** ISO 8601 timestamp the digest was generated */
    generated_at: string;
    period: { start: string; end: string };
    /** Narrative summary of the week */
    summary: string;
    total_signals: number;
    top_endpoints: Array<Record<string, unknown>>;
    top_categories: Array<Record<string, unknown>>;
    emerging_threats: Array<Record<string, unknown>>;
    notable_changes: string[];
}

/** Anonymised global risk trends (Business+ tier). */
export interface RiskTrendsResult {
    success: boolean;
    trends: Record<string, unknown>;
}
