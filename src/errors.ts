/**
 * Additional error metadata from the API
 */
export interface ErrorMeta {
    /** Error code from the API (e.g., "RATE_LIMIT_EXCEEDED") */
    code?: string;
    /** Suggested action to resolve the error */
    suggestion?: string;
    /** Helpful links (e.g., { upgrade: "https://tuteliq.ai/pricing" }) */
    links?: Record<string, string>;
    /** Server-assigned request ID for support/tracing */
    requestId?: string;
}

/**
 * Base error class for Tuteliq SDK errors
 */
export class TuteliqError extends Error {
    /** API error code */
    public readonly code?: string;
    /** Suggested action to resolve the error */
    public readonly suggestion?: string;
    /** Helpful links */
    public readonly links?: Record<string, string>;
    /** Server-assigned request ID for support/tracing */
    public readonly requestId?: string;

    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly details?: unknown,
        meta?: ErrorMeta
    ) {
        super(message);
        this.name = 'TuteliqError';
        this.code = meta?.code;
        this.suggestion = meta?.suggestion;
        this.links = meta?.links;
        this.requestId = meta?.requestId;
        Object.setPrototypeOf(this, TuteliqError.prototype);
    }
}

/**
 * Error thrown when authentication fails (401)
 */
export class AuthenticationError extends TuteliqError {
    constructor(
        message = 'Authentication failed. Please check your API key.',
        meta?: ErrorMeta
    ) {
        super(message, 401, undefined, meta);
        this.name = 'AuthenticationError';
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}

/**
 * Error thrown when rate limit is exceeded (429)
 */
export class RateLimitError extends TuteliqError {
    constructor(
        message = 'Rate limit exceeded. Please try again later.',
        public readonly retryAfter?: number,
        meta?: ErrorMeta
    ) {
        super(message, 429, undefined, meta);
        this.name = 'RateLimitError';
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

/**
 * Error thrown when request validation fails (400)
 */
export class ValidationError extends TuteliqError {
    constructor(message: string, details?: unknown, meta?: ErrorMeta) {
        super(message, 400, details, meta);
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Error thrown when a resource is not found (404)
 */
export class NotFoundError extends TuteliqError {
    constructor(message = 'Resource not found', meta?: ErrorMeta) {
        super(message, 404, undefined, meta);
        this.name = 'NotFoundError';
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * Error thrown when the server returns an error (5xx)
 */
export class ServerError extends TuteliqError {
    constructor(
        message = 'Server error. Please try again later.',
        statusCode = 500,
        meta?: ErrorMeta
    ) {
        super(message, statusCode, undefined, meta);
        this.name = 'ServerError';
        Object.setPrototypeOf(this, ServerError.prototype);
    }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends TuteliqError {
    constructor(message = 'Request timed out') {
        super(message);
        this.name = 'TimeoutError';
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

/**
 * Error thrown when network connectivity fails
 */
export class NetworkError extends TuteliqError {
    constructor(message = 'Network error. Please check your connection.') {
        super(message);
        this.name = 'NetworkError';
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}

/**
 * Error thrown when monthly message limit is reached
 */
export class QuotaExceededError extends TuteliqError {
    constructor(
        message = 'Monthly message limit reached. Please upgrade your plan or purchase credits.',
        meta?: ErrorMeta
    ) {
        super(message, 429, undefined, meta);
        this.name = 'QuotaExceededError';
        Object.setPrototypeOf(this, QuotaExceededError.prototype);
    }
}

/**
 * Diagnostic details returned when a subscription-related 403 is raised.
 * Populated from `error.details` on the API response.
 */
export interface SubscriptionErrorDetails {
    /** User ID on the Tuteliq platform — share with support to reconcile accounts */
    user_id?: string | null;
    /** Plan identifier, e.g. "indie", "pro", "business" */
    plan_id?: string | null;
    /** Human-readable plan name, e.g. "Indie" */
    plan_name?: string | null;
    /** Stripe subscription status, e.g. "active", "past_due", "canceled" */
    subscription_status?: string | null;
    /** ISO timestamp of the billing period end that was enforced */
    expired_at?: string | null;
}

/**
 * Error thrown when trying to access a restricted endpoint, or when a
 * subscription is expired/inactive. When the API returns SUB_7003 or
 * SUB_7002, `details` contains diagnostic fields (plan, subscription
 * status, expired_at) and `requestId` can be shared with support.
 */
export class TierAccessError extends TuteliqError {
    constructor(
        message = 'This endpoint is not available on your current plan.',
        meta?: ErrorMeta & { details?: SubscriptionErrorDetails }
    ) {
        super(message, 403, meta?.details, meta);
        this.name = 'TierAccessError';
        Object.setPrototypeOf(this, TierAccessError.prototype);
    }

    /** Strongly-typed accessor for subscription diagnostic details. */
    get subscriptionDetails(): SubscriptionErrorDetails | undefined {
        return this.details as SubscriptionErrorDetails | undefined;
    }
}
