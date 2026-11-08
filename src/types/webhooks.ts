import { WebhookEventType, VerificationCheck, DocumentEvidence } from '../constants.js';
import type { AgeRange, DocumentDetails, FaceMatchResult, LivenessResult } from './verification.js';

// Re-export for convenience
export { WebhookEventType };

// =============================================================================
// Webhook Types
// =============================================================================

/** A webhook configuration. */
export interface Webhook {
    /** Webhook ID */
    id: string;
    /** Webhook name */
    name: string;
    /** Webhook URL (HTTPS) */
    url: string;
    /** Subscribed event types */
    events: string[];
    /** Whether the webhook is active */
    is_active: boolean;
    /** Consecutive delivery failure count */
    failure_count: number;
    /** Last time the webhook was triggered (ISO timestamp), null if never */
    last_triggered_at?: string | null;
    /** Last delivery error message, null after a successful delivery */
    last_error?: string | null;
    /** Creation timestamp (ISO) */
    created_at: string;
    /** Last update timestamp (ISO) */
    updated_at: string;
}

/** Result from listing webhooks. */
export interface WebhookListResult {
    /** Array of webhook configurations */
    webhooks: Webhook[];
}

/** Input for creating a new webhook. */
export interface CreateWebhookInput {
    /** Webhook name (max 100 characters) */
    name: string;
    /** Webhook URL (must be HTTPS) */
    url: string;
    /** Event types to subscribe to (1-5 events) */
    events: WebhookEventType[];
    /** Optional custom headers to send with webhook payloads */
    headers?: Record<string, string>;
}

/** Result from creating a webhook (includes signing secret). */
export interface CreateWebhookResult {
    /** Webhook ID */
    id: string;
    /** Webhook name */
    name: string;
    /** Webhook URL */
    url: string;
    /** Signing secret — only returned on creation, store it securely */
    secret: string;
    /** Subscribed event types */
    events: string[];
    /** Whether the webhook is active */
    is_active: boolean;
    /** Creation timestamp (ISO) */
    created_at: string;
}

/** Input for updating a webhook (only non-undefined fields are sent). */
export interface UpdateWebhookInput {
    /** New name */
    name?: string;
    /** New URL */
    url?: string;
    /** New event subscriptions */
    events?: WebhookEventType[];
    /** Enable or disable the webhook */
    isActive?: boolean;
    /** Custom headers */
    headers?: Record<string, string>;
}

/** Result from updating a webhook. */
export interface UpdateWebhookResult {
    /** Webhook ID */
    id: string;
    /** Webhook name */
    name: string;
    /** Webhook URL */
    url: string;
    /** Subscribed event types */
    events: string[];
    /** Whether the webhook is active */
    is_active: boolean;
    /** Last update timestamp (ISO) */
    updated_at: string;
}

/** Result from deleting a webhook. */
export interface DeleteWebhookResult {
    /** Whether the deletion was successful */
    success: boolean;
    /** Confirmation message */
    message: string;
}

/** Result from testing a webhook. */
export interface TestWebhookResult {
    /** Whether the test payload was delivered */
    success: boolean;
    /** HTTP status code from the webhook endpoint */
    status_code: number;
    /** Round-trip latency in milliseconds */
    latency_ms: number;
    /** Error message if delivery failed */
    error?: string;
}

/** Result from regenerating a webhook secret. */
export interface RegenerateSecretResult {
    /** The new signing secret */
    secret: string;
}

// =============================================================================
// Webhook Deliveries
// =============================================================================

/**
 * Verification outcome pushed with `verification.completed` from the session
 * flow. This is the push channel for the extracted document fields: it carries
 * them as they are produced, so they never depend on a poll.
 * Treat it as personal data.
 */
export interface VerificationWebhookData {
    status: 'verified' | 'failed' | 'needs_review';
    /** The check the result rests on */
    verification_mode: `${VerificationCheck}`;
    /** What the document evidence was. Present only for `full`. */
    document_evidence?: `${DocumentEvidence}`;
    age: number | null;
    /** When the age came from the selfie alone: the range the true age likely falls in */
    age_range: AgeRange | null;
    is_minor: boolean | null;
    date_of_birth: string | null;
    /** Extracted document fields. Null when no document was captured. */
    document: DocumentDetails | null;
    face_match: FaceMatchResult | null;
    liveness: LivenessResult | null;
    failure_reasons?: string[] | null;
}

/** The `data` object of a webhook delivery. Note the camelCase keys. */
export interface WebhookEventData {
    /**
     * What produced the event, e.g. `age_verification`, `identity_verification`,
     * `minor_detected`, or a detection type.
     */
    type: string;
    severity: string;
    riskScore: number;
    summary?: string;
    categories?: string[];
    recommendedAction?: string;
    /** True where delay is itself the harm, so the event can be routed to an on-call path */
    urgentAlert?: boolean;
    urgentReason?: string | null;
    /** Your correlation fields, echoed from the originating request */
    externalId?: string;
    customerId?: string;
    metadata?: Record<string, unknown>;
    /**
     * Present on `verification.completed` from a verification session.
     * Absent on other events and on verifications made outside a session.
     */
    verification?: VerificationWebhookData;
}

/**
 * The JSON body of a webhook delivery. Verify the signature over the raw body
 * with `verifyWebhookSignature` before parsing it, and drop deliveries whose
 * `id` you have already processed: retries reuse the same `id`.
 */
export interface WebhookPayload {
    /** Unique delivery ID (UUID). Use it to drop duplicates and replays. */
    id: string;
    event: WebhookEventType;
    /** ISO timestamp of the event */
    timestamp: string;
    data: WebhookEventData;
    metadata?: {
        userId: string;
        requestId?: string;
    };
}
