// =============================================================================
// Account Management Types (GDPR)
// =============================================================================

/**
 * Result of account data deletion (GDPR Article 17 - Right to Erasure)
 */
export interface AccountDeletionResult {
    /** Confirmation message */
    message: string;
    /** Number of records deleted */
    deleted_count: number;
}

/**
 * Exported user data (GDPR Article 20 - Right to Data Portability)
 */
export interface AccountExportResult {
    /** User ID */
    userId: string;
    /** ISO timestamp of when the export was created */
    exportedAt: string;
    /** All user data grouped by collection */
    data: Record<string, unknown[]>;
    /** Collections that could not be read in full. Request the export again later. */
    incompleteCollections?: string[];
    /** Collections whose completeness could not be confirmed. */
    unverifiedCollections?: string[];
}

// =============================================================================
// Consent Management (GDPR Article 7)
// =============================================================================

export type ConsentType =
    | 'data_processing'
    | 'analytics'
    | 'marketing'
    | 'third_party_sharing'
    | 'child_safety_monitoring';

export type ConsentStatus = 'granted' | 'withdrawn';

export interface RecordConsentInput {
    /** Type of consent being recorded */
    consent_type: ConsentType;
    /** Policy version the user is consenting to */
    version: string;
}

export interface ConsentRecord {
    /** Consent record ID */
    id: string;
    /** User ID */
    userId: string;
    /** Type of consent */
    consent_type: ConsentType;
    /** Current status */
    status: ConsentStatus;
    /** Policy version */
    version: string;
    /** Hashed origin of the consent action, when stored */
    ip_hash?: string;
    /** When the consent was recorded */
    created_at: string;
    /** @deprecated The API sends this as `userId`. */
    user_id?: string;
}

export interface ConsentStatusResult {
    /** List of consent records */
    consents: ConsentRecord[];
}

export interface ConsentActionResult {
    /** Confirmation message */
    message: string;
    /** The consent record */
    consent: ConsentRecord;
}

// =============================================================================
// Right to Rectification (GDPR Article 16)
// =============================================================================

export interface RectifyDataInput {
    /** Firestore collection name */
    collection: string;
    /** Document ID to rectify */
    document_id: string;
    /** Fields to update (only allowlisted fields accepted) */
    fields: Record<string, unknown>;
}

export interface RectifyDataResult {
    /** Confirmation message */
    message: string;
    /** List of fields that were updated */
    updated_fields: string[];
}

// =============================================================================
// Audit Logs (GDPR Article 15)
// =============================================================================

export type AuditAction =
    | 'data_access'
    | 'data_export'
    | 'data_deletion'
    | 'data_rectification'
    | 'consent_granted'
    | 'consent_withdrawn'
    | 'breach_notification';

export interface AuditLogEntry {
    /** Audit log entry ID */
    id: string;
    /** User ID */
    userId: string;
    /** Action that was performed */
    action: AuditAction;
    /** Hashed origin of the request, when stored */
    ip_hash?: string;
    /** User agent of the request, when stored */
    user_agent?: string;
    /**
     * Additional details as a string. Stored encrypted: when `_encrypted` is
     * true this may be ciphertext rather than readable JSON.
     */
    details?: string;
    /** Whether `details` is stored encrypted */
    _encrypted: boolean;
    /** When the action occurred */
    created_at: string;
    /** @deprecated The API sends this as `userId`. */
    user_id?: string;
}

export interface AuditLogsResult {
    /** List of audit log entries */
    audit_logs: AuditLogEntry[];
}

export interface GetAuditLogsOptions {
    /** Filter by action type */
    action?: AuditAction;
    /** Maximum number of results */
    limit?: number;
}

// =============================================================================
// API key quota
// =============================================================================

/** Result from `GET /api/v1/account/api-keys/quota`. */
export interface ApiKeyQuota {
    /** Current tier */
    tier: string;
    /** API keys currently active on the account */
    active_keys: number;
    /** Maximum active keys for the tier, or `'unlimited'` */
    max_keys: number | 'unlimited';
    /** Whether another key can be created now */
    can_create: boolean;
    links: {
        upgrade: string;
    };
}

// =============================================================================
// Breach Management (GDPR Article 33/34)
// =============================================================================

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachStatus = 'detected' | 'investigating' | 'contained' | 'reported' | 'resolved';
export type BreachNotificationStatus = 'pending' | 'users_notified' | 'dpa_notified' | 'completed';

export interface LogBreachInput {
    /** Title of the breach */
    title: string;
    /** Description of the breach */
    description: string;
    /** Severity level */
    severity: BreachSeverity;
    /** List of affected user IDs */
    affected_user_ids: string[];
    /** Categories of data affected */
    data_categories: string[];
    /** Who reported the breach */
    reported_by: string;
}

export interface UpdateBreachInput {
    /** New status */
    status: BreachStatus;
    /** Notification status update */
    notification_status?: BreachNotificationStatus;
    /** Additional notes */
    notes?: string;
}

export interface BreachRecord {
    /** Breach ID */
    id: string;
    /** Title */
    title: string;
    /** Description */
    description: string;
    /** Severity level */
    severity: BreachSeverity;
    /** Current status */
    status: BreachStatus;
    /** Notification status */
    notification_status: BreachNotificationStatus;
    /** List of affected user IDs */
    affected_user_ids: string[];
    /** Categories of data affected */
    data_categories: string[];
    /** Who reported the breach */
    reported_by: string;
    /** Deadline for notification (ISO timestamp) */
    notification_deadline: string;
    /** When the breach was logged (ISO timestamp) */
    created_at: string;
    /** When the breach was last updated (ISO timestamp) */
    updated_at: string;
}

export interface LogBreachResult {
    /** Confirmation message */
    message: string;
    /** The created breach record */
    breach: BreachRecord;
}

export interface BreachListResult {
    /** List of breach records */
    breaches: BreachRecord[];
}

export interface BreachResult {
    /** The breach record */
    breach: BreachRecord;
}

export interface GetBreachesOptions {
    /** Filter by status */
    status?: BreachStatus;
    /** Maximum number of results */
    limit?: number;
}
