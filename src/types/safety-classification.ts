// =============================================================================
// Platform Safety Classification
// =============================================================================

/** Classification band, from strongest to weakest. */
export type SafetyClassificationBand = 'leading' | 'established' | 'progressing' | 'needs_attention';

export interface SafetyClassificationComponent {
    /** Component identifier */
    key: 'reviewCoverage' | 'responseTime' | 'openQueueAge' | 'detectionCoverage' | 'integrationHealth';
    /** Display label */
    label: string;
    /** Points earned */
    points: number;
    /** Maximum points */
    max: number;
    /** Improvement hint, present when the component is below full marks */
    tip: string | null;
}

/** The inputs the score was computed from. Contains no personal data. */
export interface SafetyClassificationEvidence {
    /** Real incidents counted (test and sandbox traffic excluded) */
    incident_count: number;
    /** Incidents that have been reviewed */
    reviewed_count: number;
    /** Median minutes to review, when known */
    median_review_minutes: number | null;
    /** Age in days of the oldest open incident (0 when the queue is empty) */
    oldest_open_days: number | null;
    /** Content types with live detection */
    modalities_live: string[];
    /** Content types the platform offers; scoring is measured against these */
    applicable_modalities: string[];
    /** Number of connected platforms */
    connected_platforms: number;
    /** When the evidence was gathered */
    calculated_at: string;
}

/** The account's daily safety classification snapshot. */
export interface SafetyClassification {
    /** UTC date of the daily snapshot */
    date: string;
    /** 0-100, or null when `insufficient_data` is true. Never treat null as zero. */
    score: number | null;
    /** Band, or null when `insufficient_data` is true */
    band: SafetyClassificationBand | null;
    /** True when there is too little activity to classify yet; not a bad score */
    insufficient_data: boolean;
    /** Why the account is not yet classified */
    reason: string | null;
    /** Always `all_time` */
    period: 'all_time';
    /** Score breakdown */
    components: SafetyClassificationComponent[];
    /** Inputs the score was computed from */
    evidence: SafetyClassificationEvidence;
    /** When the score was computed */
    calculated_at: string;
    /** When the snapshot was stored */
    updated_at: string;
    /** Shown beside the figure: it is not a certification or compliance determination */
    disclaimer: string;
}

/**
 * Answer from `getSafetyClassification`. `exists: false` means the account
 * has no classification yet, which is not a zero score.
 */
export type SafetyClassificationResult =
    | { exists: true; classification: SafetyClassification }
    | { exists: false };
