// =============================================================================
// DSA transparency report data
// =============================================================================

export interface DsaTransparencyReportInput {
    /** First day of the reporting period, YYYY-MM-DD (UTC), included */
    from: string;
    /** Last day of the reporting period, YYYY-MM-DD (UTC), included. At most 366 days after `from`. */
    to: string;
    /** `json` (default) returns a `DsaTransparencyReport`; `csv` returns the CSV text */
    format?: 'json' | 'csv';
}

/** Whether Tuteliq holds what a template indicator needs. */
export type DsaAvailability = 'computed' | 'partial' | 'not_held_by_tuteliq';

/** What is missing for a `partial` indicator. */
export type DsaPartialReason =
    | 'restriction_applied_by_platform'
    | 'human_reviewed_sample_only'
    | 'no_human_reviews'
    | 'latest_decision_time_only';

/** One template indicator. A `not_held_by_tuteliq` value is always null: your platform supplies it. */
export type DsaReportField =
    | { indicator: string; availability: 'computed'; value: number | string; reason: null }
    | { indicator: string; availability: 'partial'; value: number | null; reason: DsaPartialReason; supporting_metrics?: string[] }
    | { indicator: string; availability: 'not_held_by_tuteliq'; value: null; reason: 'not_held_by_tuteliq' };

export interface DsaReportSection {
    section: string;
    title: string;
    legal_basis: string;
    availability: DsaAvailability;
    fields: DsaReportField[];
}

export interface DsaModerationCounts {
    automated_detections: number;
    human_reviewed: number;
    upheld_after_human_review: number;
    dismissed_after_human_review: number;
    /** Closed by a moderator with no verdict on the detection */
    closed_without_verdict: number;
    awaiting_human_review: number;
    policy_actions: Record<'block' | 'flag' | 'escalate' | 'notify' | 'log_only', number>;
}

/** A template category or sub-category. */
export interface DsaCategory {
    /** `STATEMENT_CATEGORY_*` or `KEYWORD_*` code */
    code: string;
    label: string;
    template_ref: string;
}

export type DsaCategoryRow = {
    dsa_category: DsaCategory;
    tuteliq_categories: string[];
    counts: DsaModerationCounts;
} & (
    | { dsa_subcategory: DsaCategory & { category: string }; subcategory_reason: null }
    | { dsa_subcategory: null; subcategory_reason: 'subcategory_not_distinguished_by_tuteliq' }
);

/** Detections with no single template category, for you to classify. */
export interface DsaUnmappedRow {
    tuteliq_category: string;
    reason: 'no_single_dsa_category';
    counts: DsaModerationCounts;
}

export interface DsaMappingRow {
    tuteliq_category: string;
    dsa_category: string | null;
    dsa_subcategory: string | null;
    reason: 'no_single_dsa_category' | null;
}

/** Result from `GET /api/v1/compliance/dsa-transparency-report` (JSON). Aggregates only. */
export interface DsaTransparencyReport {
    report: 'dsa_transparency_report_data';
    template: { regulation: string; annex: string; categories: string };
    reporting_period: { from: string; to: string };
    generated_at: string;
    notice: string;
    /** Test traffic is excluded from the counts */
    scope: { incidents_scanned: number; incidents_counted: number; test_incidents_excluded: number };
    sections: DsaReportSection[];
    own_initiative_by_category: DsaCategoryRow[];
    unmapped_categories: DsaUnmappedRow[];
    supporting_data: {
        totals: DsaModerationCounts;
        median_hours_to_latest_human_decision: DsaReportField;
        decision_time_sample_size: number;
    };
    category_mapping: DsaMappingRow[];
    credits_used: number;
}
