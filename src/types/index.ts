// Re-export all types
export * from './safety.js';
export * from './analysis.js';
export * from './guidance.js';
export * from './reports.js';
export * from './policy.js';

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

export interface SafeNestOptions {
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

// =============================================================================
// Batch Types
// =============================================================================

export interface BatchItem {
    /** Analysis type to perform */
    type: 'bullying' | 'grooming' | 'unsafe' | 'emotions';
    /** Content to analyze */
    content: string;
    /** Optional context - string shorthand or detailed object */
    context?: string | {
        language?: string;
        ageGroup?: string;
        relationship?: string;
        platform?: string;
    };
    /** Optional external ID for correlation */
    external_id?: string;
}

export interface BatchAnalyzeInput {
    /** Items to analyze (max 25) */
    items: BatchItem[];
    /** Process items in parallel (default: true) */
    parallel?: boolean;
    /** Continue processing if an item fails (default: true) */
    continueOnError?: boolean;
}

export interface BatchResultItem {
    /** Index of the item in the original array */
    index: number;
    /** Whether analysis succeeded */
    success: boolean;
    /** Analysis result (if successful) */
    result?: unknown;
    /** Error message (if failed) */
    error?: string;
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

// Legacy type alias for backwards compatibility
export interface SafeNestClientOptions extends SafeNestOptions {
    apiKey: string;
}
