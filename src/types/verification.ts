/**
 * Verification Types
 *
 * Session-based age and identity verification.
 * The SDK creates a verification session and receives a URL to render in a web view.
 * The web UI handles all document capture, liveness checks, and submission.
 * The SDK then polls or retrieves the verification result.
 */

import {
    VerificationMode,
    DocumentType,
    VerificationStatus,
    VerificationSessionStatus,
} from '../constants.js';

// =============================================================================
// Input Types
// =============================================================================

export interface CreateVerificationSessionInput {
    /** Type of verification to perform */
    mode: VerificationMode;
    /** Preferred document type (optional hint for the web UI) */
    document_type?: DocumentType;
    /** URL to redirect the user after verification completes (optional) */
    redirect_url?: string;
    /** Your external reference ID for this verification */
    external_id?: string;
    /** Your end-customer identifier */
    customer_id?: string;
    /** Custom key-value metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Session Types
// =============================================================================

export interface VerificationSession {
    /** Unique session identifier */
    session_id: string;
    /** URL to open in a new tab or web view for the user to complete verification */
    url: string;
    /** ISO timestamp when the session expires */
    expires_at: string;
    /** Verification mode */
    mode: VerificationMode;
}

export interface VerificationSessionResult {
    /** Unique session identifier */
    session_id: string;
    /** Current session status */
    status: VerificationSessionStatus;
    /** Verification mode */
    mode?: VerificationMode;
    /** Verification result (present when status is 'completed') */
    result?: VerificationResult | null;
    /** ISO timestamp when the session was created */
    created_at?: string;
    /** ISO timestamp when the session expires */
    expires_at?: string;
}

// =============================================================================
// Document Intelligence Types
// =============================================================================

/** Parsed MRZ (Machine Readable Zone) fields with check digit validation */
export interface MrzFields {
    /** Document number (check-digit validated) */
    document_number: string | null;
    /** Nationality code (3-letter) */
    nationality: string | null;
    /** Date of birth in YYYY-MM-DD (check-digit validated) */
    date_of_birth: string | null;
    /** Expiry date in YYYY-MM-DD (check-digit validated) */
    expiry_date: string | null;
    /** Sex (M/F/<) */
    sex: string | null;
    /** Surname */
    surname: string | null;
    /** Given names */
    given_names: string | null;
}

/** PDF417/barcode data (US/CA driver's licenses) */
export interface BarcodeResult {
    /** Barcode format (e.g., "PDF417") */
    format: string;
    /** Whether AAMVA-structured data was found */
    has_aamva: boolean;
    /** Parsed AAMVA fields */
    fields?: {
        first_name: string | null;
        last_name: string | null;
        date_of_birth: string | null;
        expiration_date: string | null;
        document_number: string | null;
        sex: string | null;
        state: string | null;
    };
}

/** AI-powered document authenticity analysis */
export interface DocumentAuthenticityResult {
    /** Whether the document appears authentic */
    is_authentic: boolean | null;
    /** Confidence in the authenticity assessment (0.0-1.0) */
    confidence: number;
    /** Detected document type */
    document_type_detected: string | null;
    /** Security features visually identified */
    security_features_visible: string[];
    /** Anomalies detected */
    anomalies: string[];
    /** Whether recapture (photo-of-screen/printout) was detected */
    recapture_detected: boolean | null;
    /** Type of recapture: "none", "screen", "printout", or "photo_of_photo" */
    recapture_type: string | null;
    /** Overall assessment text */
    overall_assessment: string | null;
}

/** Document extraction and validation details */
export interface DocumentDetails {
    /** OCR confidence (0-100) */
    ocr_confidence: number;
    /** Full name extracted from document */
    name_extracted: string | null;
    /** DOB extracted from document */
    dob_extracted: string | null;
    /** Document number */
    document_number: string | null;
    /** Whether document number passed algorithmic validation (45 countries) */
    document_number_valid: boolean | null;
    /** ISO country code */
    country_code: string | null;
    /** Detected document type */
    document_type: string | null;
    /** Expiration date */
    expiration_date: string | null;
    /** Whether the document has expired */
    expired: boolean | null;
    /** Whether MRZ check digits passed (null if no MRZ) */
    mrz_valid: boolean | null;
    /** Parsed MRZ fields (null if no MRZ) */
    mrz_fields: MrzFields | null;
}

// =============================================================================
// Verification Result Types
// =============================================================================

export interface FaceMatchResult {
    /** Whether ID face matches selfie */
    matched: boolean;
    /** Euclidean distance between face descriptors (lower = more similar) */
    distance: number;
    /** Confidence score (0-1, higher = more confident) */
    confidence: number;
}

export interface LivenessResult {
    /** Whether liveness check passed */
    valid: boolean;
    /** Reason for failure (if not valid) */
    reason?: string;
}

/**
 * Full verification result returned via session.
 *
 * Includes document intelligence (MRZ, barcode, authenticity),
 * face matching, and liveness validation.
 */
export interface VerificationResult {
    /** Verification status */
    status: 'verified' | 'failed' | 'needs_review';
    /** Calculated age (null if not determined) */
    age: number | null;
    /** Date of birth in YYYY-MM-DD format */
    date_of_birth: string | null;
    /** Whether the person is under 18 */
    is_minor: boolean | null;
    /** Document extraction and validation details */
    document: DocumentDetails;
    /** PDF417/barcode data (present for US/CA driver's licenses) */
    barcode: BarcodeResult | null;
    /** AI-powered document authenticity analysis */
    document_authenticity: DocumentAuthenticityResult | null;
    /** Face comparison results */
    face_match: FaceMatchResult | null;
    /** Liveness check results */
    liveness: LivenessResult;
    /** Reasons for any failures (empty array if fully verified) */
    failure_reasons: string[];
}

/** @deprecated Use VerificationResult instead — returned via session flow */
export interface AgeVerificationResult {
    /** Unique verification ID for retrieval */
    verification_id: string;
    /** Overall verification status */
    status: VerificationStatus;
    /** Estimated age bracket (e.g. "18-25", "under_18") */
    age_bracket?: string;
    /** Whether the person is under 18 (null if age unknown) */
    is_minor: boolean | null;
    /** Face comparison results (null if faces not detected) */
    face_match: FaceMatchResult | null;
    /** Liveness check results */
    liveness: LivenessResult;
    /** Reasons for any failures (empty array if fully verified) */
    failure_reasons: string[];
    /** Number of credits consumed */
    credits_used: number;
}

/** @deprecated Use VerificationResult instead — returned via session flow */
export interface IdentityVerificationResult {
    /** Unique verification ID for retrieval */
    verification_id: string;
    /** Overall verification status */
    status: VerificationStatus;
    /** Full name extracted from document */
    full_name?: string;
    /** Date of birth in YYYY-MM-DD format */
    date_of_birth?: string;
    /** Document type used */
    document_type?: string;
    /** ISO 3166-1 alpha-2 country code */
    country_code?: string;
    /** Face comparison results (null if faces not detected) */
    face_match: FaceMatchResult | null;
    /** Liveness check results */
    liveness: LivenessResult;
    /** Reasons for any failures (empty array if fully verified) */
    failure_reasons: string[];
    /** Number of credits consumed */
    credits_used: number;
}

export interface VerificationRetrieveResult {
    /** Unique verification ID */
    verification_id: string;
    /** Verification status */
    status: VerificationStatus;
    /** Calculated age (null if not determined) */
    age: number | null;
    /** Whether the person is under 18 (null if unknown) */
    is_minor: boolean | null;
    /** Whether face matched */
    face_matched: boolean | null;
    /** Face match confidence */
    face_confidence: number | null;
    /** Whether liveness check passed */
    liveness_valid: boolean;
    /** Reasons for failure */
    failure_reasons: string[];
    /** ISO timestamp of verification */
    created_at: string;
}

export interface IdentityRetrieveResult {
    /** Unique verification ID */
    verification_id: string;
    /** Verification status */
    status: VerificationStatus;
    /** Full name extracted from document */
    full_name?: string;
    /** Date of birth in YYYY-MM-DD format */
    date_of_birth?: string;
    /** Document type used */
    document_type?: string;
    /** ISO 3166-1 alpha-2 country code */
    country_code?: string;
    /** Whether face matched */
    face_matched: boolean | null;
    /** Face match confidence */
    face_confidence: number | null;
    /** Whether liveness check passed */
    liveness_valid: boolean;
    /** Reasons for failure */
    failure_reasons: string[];
    /** ISO timestamp of verification */
    created_at: string;
}
