// Re-export all types
export * from './safety.js';
export * from './analysis.js';
export * from './guidance.js';
export * from './reports.js';
export * from './policy.js';
export * from './account.js';
export * from './media.js';
export * from './webhooks.js';
export * from './pricing.js';
export * from './voice-stream.js';
export * from './detection.js';
export * from './verification.js';
export * from './synthetic.js';
export * from './encryption.js';
export * from './audit.js';
export * from './incidents.js';
export * from './automation.js';
export * from './settings.js';
export * from './intelligence.js';

// =============================================================================
// Common Types
// =============================================================================

/**
 * Tracking fields for correlating requests with your systems
 */
export interface TrackingFields {
    /**
     * Your unique identifier for this request (e.g., message ID, user ID, session ID)
     * Maximum 255 characters. Echoed back in response and included in webhooks.
     */
    external_id?: string;
    /**
     * Your end-customer identifier for multi-tenant / B2B2C scenarios.
     * Maximum 255 characters. Echoed back in response and included in webhooks,
     * enabling you to route alerts to the correct customer from a single webhook endpoint.
     */
    customer_id?: string;
    /**
     * Custom key-value pairs for additional context
     * Stored with detection results and included in webhooks.
     */
    metadata?: Record<string, unknown>;
    /**
     * Per-call override of your account's incident logging setting.
     * When set, it takes precedence over the account-level flag for THIS request:
     * `true` forces the incident to be persisted, `false` suppresses persistence.
     * Omit to use your account default (which itself defaults to enabled).
     * Useful to suppress logging for test traffic or to opt specific calls in or out.
     */
    incident_moderation_enabled?: boolean;
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: unknown;
        suggestion?: string;
        links?: Record<string, string>;
    };
}

export interface TuteliqOptions {
    /** Request timeout in milliseconds (defaults to 30000) */
    timeout?: number;
    /** Number of retry attempts (defaults to 3) */
    retries?: number;
    /** Initial retry delay in milliseconds (defaults to 1000) */
    retryDelay?: number;
}

export interface Usage {
    /** Total monthly message limit */
    limit: number;
    /** Messages used this month */
    used: number;
    /** Messages remaining this month */
    remaining: number;
}

export interface RateLimitInfo {
    /** Rate limit per minute */
    limit: number;
    /** Remaining requests this minute */
    remaining: number;
    /** Unix timestamp when limit resets */
    reset?: number;
}

// =============================================================================
// Usage Types
// =============================================================================

export interface UsageSummary {
    /** Messages used in current billing period */
    messages_used: number;
    /** Monthly message limit */
    message_limit: number;
    /** Purchased credits available */
    purchased_credits: number;
    /** Total available (limit + credits) */
    total_available: number;
    /** Usage percentage (0-100) */
    usage_percentage: number;
    /** Billing period start date (ISO string) */
    period_start: string;
    /** Billing period end date (ISO string) */
    period_end: string;
    /** Days remaining in billing period */
    days_remaining: number;
}

export interface UsageQuota {
    /** Rate limit per minute */
    rate_limit: number;
    /** Remaining requests this minute */
    remaining: number;
    /** Seconds until rate limit resets */
    reset_in_seconds: number;
    /** Current tier */
    tier: string;
}

/** A single day's usage data. */
export interface UsageDay {
    /** Date in YYYY-MM-DD format */
    date: string;
    /** Total requests on this day */
    total_requests: number;
    /** Successful requests */
    success_requests: number;
    /** Failed requests */
    error_requests: number;
}

/** Result from `GET /api/v1/usage/history`. */
export interface UsageHistoryResult {
    /** API key ID */
    api_key_id: string;
    /** Daily usage data */
    days: UsageDay[];
}

/** Result from `GET /api/v1/usage/by-tool`. */
export interface UsageByToolResult {
    /** Date in YYYY-MM-DD format */
    date: string;
    /** Request counts per tool */
    tools: Record<string, number>;
    /** Request counts per endpoint */
    endpoints: Record<string, number>;
}

/** Result from `GET /api/v1/usage/monthly`. */
export interface UsageMonthlyResult {
    /** Current tier */
    tier: string;
    /** Tier display name */
    tier_display_name: string;
    /** Billing period info */
    billing: {
        current_period_start: string;
        current_period_end: string;
        days_remaining: number;
    };
    /** Monthly usage stats */
    usage: {
        used: number;
        limit: number;
        remaining: number;
        percent_used: number;
    };
    /** Rate limit info */
    rate_limit: {
        requests_per_minute: number;
    };
    /** Upgrade recommendations (null if not applicable) */
    recommendations: {
        should_upgrade: boolean;
        reason: string;
        suggested_tier: string;
        upgrade_url: string;
    } | null;
    /** Useful links */
    links: {
        dashboard: string;
        pricing: string;
        buy_credits: string;
    };
}

// =============================================================================
// Batch Types
// =============================================================================

/**
 * Analysis types accepted by POST /api/v1/batch/analyze.
 *
 * All of them take a single `text` except `grooming` and `emotions`, which
 * take a message array (with different per-message field names — see
 * `BatchGroomingItem` / `BatchEmotionsItem`).
 */
export const BATCH_TEXT_TYPES = [
    'bullying',
    'unsafe',
    'social_engineering',
    'app_fraud',
    'romance_scam',
    'mule_recruitment',
    'gambling_harm',
    'coercive_control',
    'vulnerability_exploitation',
    'radicalisation',
] as const;

export type BatchTextType = (typeof BATCH_TEXT_TYPES)[number];

export type BatchAnalysisType = BatchTextType | 'grooming' | 'emotions';

export interface BatchItemBase {
    /**
     * Your identifier for this item. The API requires one per item; when it is
     * omitted the SDK generates a positional id (`item-0`, `item-1`, …) so the
     * request stays valid. It is what the API echoes back on each result.
     *
     * This is NOT `external_id`: `id` addresses the item inside this one batch
     * request, `external_id` is your own record's identifier for correlation
     * and is echoed back untouched.
     */
    id?: string;
    /** Optional context - string shorthand or detailed object */
    context?: string | {
        language?: string;
        ageGroup?: string;
        relationship?: string;
        platform?: string;
        country?: string;
    };
    /** Optional external ID for correlation */
    external_id?: string;
}

export interface BatchTextItem extends BatchItemBase {
    /** Analysis type to perform */
    type: BatchTextType;
    /** Content to analyze */
    content: string;
}

export interface BatchGroomingItem extends BatchItemBase {
    /** Grooming analysis type */
    type: 'grooming';
    /** Messages to analyze for grooming patterns */
    messages: Array<{ role: string; content: string }>;
    /** Age of the child */
    childAge?: number;
}

export interface BatchEmotionsItem extends BatchItemBase {
    /** Emotion analysis type */
    type: 'emotions';
    /**
     * Conversation to analyze. The emotions endpoint is message-based; pass
     * `content` instead for a single message and the SDK wraps it.
     */
    messages?: Array<{ sender: string; content: string }>;
    /** Single message to analyze, wrapped into a one-message conversation. */
    content?: string;
}

export type BatchItem = BatchTextItem | BatchGroomingItem | BatchEmotionsItem;

export interface BatchAnalyzeInput {
    /** Items to analyze (max 50) */
    items: BatchItem[];
    /** Process items in parallel (default: true) */
    parallel?: boolean;
    /** Continue processing if an item fails (default: true) */
    continueOnError?: boolean;
}

export interface BatchResultItem {
    /** Index of the item in the original array */
    index: number;
    /** The item id (yours if you supplied one, otherwise the generated `item-N`) */
    id: string;
    /** Analysis type that was run */
    type: BatchAnalysisType;
    /** Whether analysis succeeded */
    success: boolean;
    /** Analysis result (if successful) */
    result?: unknown;
    /** Error message (if failed) */
    error?: string;
    /** Credits consumed by this item (if successful) */
    credits_used?: number;
    /** External ID (if provided) */
    external_id?: string;
}

export interface BatchAnalyzeResult {
    /** Individual results */
    results: BatchResultItem[];
    /** Summary statistics */
    summary: {
        total: number;
        successful: number;
        failed: number;
        /** Total credits consumed across all items */
        total_credits_used?: number;
    };
    /** Total processing time in ms */
    processing_time_ms: number;
}

export interface RequestMeta {
    /** Request correlation ID */
    requestId: string;
    /** Request latency in milliseconds */
    latencyMs: number;
    /** Current usage stats */
    usage?: Usage;
}

/**
 * @deprecated Use `TuteliqOptions` instead. The API key is passed as the first
 * argument to the `Tuteliq` constructor, not as an option.
 */
export type TuteliqClientOptions = TuteliqOptions;
