// =============================================================================
// EU AI Act Art 12 audit receipts
// =============================================================================

export type AuditReceiptAlgorithm = 'KMS_EC_P256_SHA256' | 'HMAC_SHA256';

export type RetentionClass =
    | 'biometric-high-risk'
    | 'safety-high-risk'
    | 'limited-risk'
    | 'minimal-risk';

export interface AuditReceiptSignature {
    algorithm: AuditReceiptAlgorithm;
    /** KMS resource name (for `KMS_EC_P256_SHA256`) or local kid (for `HMAC_SHA256`). */
    key_id: string;
    /** Base64-encoded signature bytes. */
    signature: string;
    /** ISO 8601 timestamp of signing. */
    signed_at: string;
}

/** Subset shape of the signed payload — additional fields may be present per receipt type. */
export interface AuditReceiptPayload {
    v: 1;
    request_id: string;
    timestamp: string;
    endpoint: string;
    decision: string;
    confidence?: number;
    severity?: number;
    deployer: string;
    intended_use?: string;
    retention_class: RetentionClass;
    model?: { id: string; version?: string; prompt_template_version?: string };
    thresholds_applied?: Record<string, number>;
    biometric?: {
        match_result?: 'matched' | 'no_match' | 'inconclusive';
        document_type?: string;
        age_decision?: string;
    };
    moderator_review?: {
        target_request_id: string;
        target_incident_id: string;
        action: 'confirm' | 'downgrade' | 'escalate' | 'reclassify' | 'dismiss';
        reason_code: string;
        moderator_external_id?: string;
        original?: { risk_category?: string; risk_level?: string };
        revised?: { risk_category?: string; risk_level?: string };
    };
}

export interface AuditReceipt {
    payload: AuditReceiptPayload;
    signature: AuditReceiptSignature;
    /**
     * The exact canonical JSON serialisation the signature was computed over.
     * Use this for out-of-band verification against the KMS public key.
     */
    canonical: string;
}

// =============================================================================
// Art 14 moderator override
// =============================================================================

export type ModeratorAction = 'confirm' | 'downgrade' | 'escalate' | 'reclassify' | 'dismiss';

export type ModeratorReasonCode =
    | 'confirmed_accurate'
    | 'false_positive'
    | 'out_of_context'
    | 'insufficient_severity'
    | 'incorrect_category'
    | 'requires_law_enforcement'
    | 'parent_notified'
    | 'other';

export interface ReviewIncidentInput {
    action: ModeratorAction;
    reason_code: ModeratorReasonCode;
    /** Free-form comment; encrypted with the customer's registered public key when E2E is enabled. */
    reason_comment?: string;
    /** New risk level (required for `downgrade` / `escalate`, optional for `reclassify`). */
    new_risk_level?: string;
    /** New category (required for `reclassify`). */
    new_risk_category?: string;
    /** Opaque deployer-side moderator id. Surfaces in the audit receipt for the deployer's correlation. */
    moderator_external_id?: string;
    /** Retention class for the resulting audit receipt; defaults to limited-risk. */
    retention_class?: RetentionClass;
}

export interface ReviewIncidentResult {
    incident_id: string;
    original: { risk_category: string; risk_level: string };
    revised: { risk_category: string; risk_level: string };
    audit_receipt: { request_id: string; timestamp: string; signature: string } | null;
}
