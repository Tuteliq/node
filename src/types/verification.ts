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
    ChipPolicy,
    VerificationCheck,
    DocumentEvidence,
} from '../constants.js';

// =============================================================================
// Input Types
// =============================================================================

export interface CreateVerificationSessionInput {
    /** Type of verification to perform */
    mode: VerificationMode;
    /** Preferred document type (optional hint for the web UI) */
    document_type?: DocumentType;
    /** How a passport or ID card chip read counts as document evidence. The API defaults to `optional`. */
    chip_policy?: `${ChipPolicy}`;
    /**
     * Whether the web UI takes the document photo itself once the document is
     * framed, steady and sharp. The API defaults to `true`; with `false` the
     * user taps Capture.
     */
    auto_capture?: boolean;
    /**
     * @deprecated The API does not accept this field and the SDK no longer sends it.
     * Set the redirect URL in the dashboard verification settings instead.
     */
    redirect_url?: string;
    /** @deprecated The API does not accept this field and the SDK no longer sends it. */
    external_id?: string;
    /** @deprecated The API does not accept this field and the SDK no longer sends it. */
    customer_id?: string;
    /** @deprecated The API does not accept this field and the SDK no longer sends it. */
    metadata?: Record<string, unknown>;
}

export interface GetVerificationConfigInput {
    /** ISO 3166-1 alpha-2 country code of the end user (e.g. "DE", "US") */
    country?: string;
    /** Region or state code within the country (e.g. "CA") */
    region?: string;
}

// =============================================================================
// Session Types
// =============================================================================

export interface VerificationSession {
    /** Unique session identifier */
    session_id: string;
    /** URL to open in a new tab or web view for the user to complete verification */
    url: string;
    /** Epoch milliseconds at which the session expires */
    expires_at: number;
    /** Verification mode */
    mode: VerificationMode;
    /**
     * The check configured for this key. For age sessions it may still be
     * resolved per market on the user's device; the poll reports the check
     * the result actually rests on.
     */
    verification_mode?: `${VerificationCheck}`;
    /** How a chip read counts as document evidence for this session */
    chip_policy?: `${ChipPolicy}`;
    /** Whether the web UI takes the document photo itself */
    auto_capture?: boolean;
    /**
     * Width, in pixels, the capture UI should request from the camera.
     * Small print (document number, issuing authority, issue date) only
     * survives at this resolution, so pass it through to the capture step
     * rather than picking your own.
     */
    recommended_image_width?: number;
}

/**
 * Status and outcome of a verification session, from `getVerificationSession`.
 *
 * The extracted document fields, `date_of_birth`, `failure_reasons` and
 * `capture` are released once: only the first authenticated poll after the
 * session reaches `completed` or `failed` carries them. Later polls return the
 * decision alone. Persist them on that first read, or subscribe to the
 * `verification.completed` webhook, which pushes them as they are produced.
 */
export interface VerificationSessionResult {
    /** Unique session identifier */
    session_id: string;
    /** Current session status */
    status: VerificationSessionStatus;
    /** @deprecated Not returned by the poll. Read it from the created session. */
    mode?: VerificationMode;
    /** Verification result (null until there is one) */
    result?: VerificationResult | null;
    /** Present once there is a result: the check it rests on */
    verification_mode?: `${VerificationCheck}`;
    /** Present when the result rests on a document: what the evidence was */
    document_evidence?: `${DocumentEvidence}`;
    /**
     * Name of the step the user has reached, for progress UI
     * (e.g. "uploading", "processing", "done"). Not a closed list: new steps may appear.
     */
    step_progress?: string | null;
    /** How a chip read counts as document evidence, as set at creation */
    chip_policy?: `${ChipPolicy}`;
    /** How the uploads were captured, as reported by the capture client. Released once, with the result. */
    capture?: CaptureSummary | null;
    /** Epoch milliseconds when the session was created */
    created_at?: number;
    /** Epoch milliseconds when the session expires */
    expires_at?: number;
}

/**
 * How the uploads were captured and which on-device checks ran, as the
 * capture client reported it. Self-reported: informative, never a verdict.
 */
export interface CaptureSummary {
    self_reported: true;
    sdk: { name: string; version: string; platform: string; os_version: string; device_model: string } | null;
    pipeline: string | null;
    pipeline_version: number | null;
    face: {
        camera: string | null;
        liveness_engine: string | null;
        liveness_engine_version: number | null;
        depth: {
            verdict: 'live' | 'flat' | 'inconclusive';
            frames_with_depth: number | null;
            nose_relief_mm: number | null;
            interpupillary_mm: number | null;
            distance_cm: number | null;
        } | null;
    } | null;
    document: {
        camera: string | null;
        auto_captured: boolean | null;
        liveness: {
            verdict: 'genuine' | 'suspicious' | 'inconclusive';
            tilt_range_degrees: number | null;
            optical_variability: number | null;
            screen_score: number | null;
            reasons: string[];
        } | null;
    } | null;
    chip: {
        access_protocol: string | null;
        access_key: string | null;
        access_key_from_photo: boolean | null;
        chip_authentication: string | null;
        active_authentication: string | null;
        data_groups: number[];
    } | null;
    /** What each uploaded liveness frame shows, in upload order */
    liveness_frame_kinds: string[] | null;
}

/** Age verification settings that apply to a market, from `getVerificationConfig`. */
export interface VerificationConfig {
    /** The check a user in this market will get under this key's settings */
    mode: `${VerificationCheck}`;
    /** Age at or above which a person counts as an adult in this market */
    age_threshold: number;
    /** Country the settings were resolved for (upper-cased), when one was given */
    country?: string;
    /** Market the country belongs to, when it maps to one */
    market?: string;
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

/** @deprecated Not returned by the session poll or the webhook. */
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

/** @deprecated Not returned by the session poll or the webhook. */
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

/** A national identity number found on the document */
export interface NationalIdResult {
    value: string;
    /** Whether the number passed its country's validation */
    valid: boolean;
    /** Kind of number (country-specific) */
    type: string;
    /** ISO country code the number belongs to */
    country_code: string;
}

/**
 * Document extraction and validation details.
 *
 * Only `ocr_confidence` is always present. The extracted fields are released
 * once (see `VerificationSessionResult`) and absent on later polls.
 */
export interface DocumentDetails {
    /** OCR confidence (0-100) */
    ocr_confidence: number;
    /** Full name extracted from document */
    name_extracted?: string | null;
    /** Given name(s) */
    first_name?: string | null;
    /** Surname */
    last_name?: string | null;
    /** DOB extracted from document */
    dob_extracted?: string | null;
    /** Document number */
    document_number?: string | null;
    /** Whether document number passed algorithmic validation */
    document_number_valid?: boolean | null;
    /** Sex as printed on the document */
    sex?: string | null;
    /** ISO country code */
    country_code?: string | null;
    /** Country name */
    country_name?: string | null;
    /** Detected document type */
    document_type?: string | null;
    /** Expiration date */
    expiration_date?: string | null;
    /** Whether the document has expired */
    expired?: boolean | null;
    /** Issue date */
    issue_date?: string | null;
    /** Height in centimetres, where the document states it */
    height_cm?: number | null;
    /** Place of birth */
    place_of_birth?: string | null;
    /** Nationality */
    nationality?: string | null;
    /** Issuing authority */
    issuing_authority?: string | null;
    /** The document data came from the document's chip and passed its integrity check */
    chip_verified?: boolean;
    /** The chip's signer chains to a trusted issuing country. Null when the chip was not used or this could not be checked. */
    chip_issuer_trusted?: boolean | null;
    /** National identity number, when the document carries one */
    national_id?: NationalIdResult | null;
    /** Whether MRZ check digits passed (null if no MRZ). Webhook deliveries only. */
    mrz_valid?: boolean | null;
    /** Parsed MRZ fields (null if no MRZ). Webhook deliveries only. */
    mrz_fields?: MrzFields | null;
}

// =============================================================================
// Verification Result Types
// =============================================================================

export interface FaceMatchResult {
    /** Whether ID face matches selfie */
    matched: boolean;
    /** Distance between the two faces (lower = more similar). Webhook deliveries only. */
    distance?: number;
    /** Confidence score (0-1, higher = more confident) */
    confidence: number;
}

export interface LivenessResult {
    /** Whether liveness check passed */
    valid: boolean;
    /** Reason for failure (if not valid). Webhook deliveries only. */
    reason?: string;
}

/** Range the true age likely falls in, when the age came from the selfie alone */
export interface AgeRange {
    low: number;
    high: number;
}

/**
 * Verification result returned via the session poll.
 *
 * `date_of_birth`, `failure_reasons` and the extracted `document` fields are
 * released once, on the first authenticated poll after completion.
 */
export interface VerificationResult {
    /** Verification status */
    status: 'verified' | 'failed' | 'needs_review';
    /** Calculated age (null if not determined) */
    age: number | null;
    /** When the age came from the selfie alone: the range the true age likely falls in */
    age_range?: AgeRange | null;
    /** Date of birth in YYYY-MM-DD format. Released once. */
    date_of_birth?: string | null;
    /** Whether the person is under the age threshold */
    is_minor: boolean | null;
    /** What the document evidence was, when the result rests on a document */
    document_evidence?: `${DocumentEvidence}`;
    /** Document extraction and validation details (null when no document was used) */
    document: DocumentDetails | null;
    /** Face comparison results */
    face_match: FaceMatchResult | null;
    /** Liveness check results */
    liveness: LivenessResult;
    /** Reasons for any failures. Free text, not a closed list. Released once. */
    failure_reasons?: string[] | null;
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

/** A past verification, from `getVerification` (`GET /verify/{id}`). */
export interface VerificationRetrieveResult {
    /** Unique verification ID */
    verification_id: string;
    /** Verification status */
    status: VerificationStatus;
    /** Calculated age (null if not determined) */
    age: number | null;
    /** Whether the person is under 18 (null if unknown) */
    is_minor: boolean | null;
    /** OCR confidence of the document read (0-100) */
    ocr_confidence?: number;
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

/** A past age verification, from `getAgeVerification`. Carries no age and no personal data. */
export interface AgeVerificationRetrieveResult {
    /** Unique verification ID */
    verification_id: string;
    /** Verification status */
    status: VerificationStatus;
    /** Whether the person is under 18 (null if unknown) */
    is_minor: boolean | null;
    /** Whether face matched */
    face_matched: boolean | null;
    /** Whether liveness check passed */
    liveness_valid: boolean;
    /** Reasons for failure */
    failure_reasons: string[];
    /** ISO timestamp of verification */
    created_at: string;
}

/** A past identity verification, from `getIdentityVerification`. Carries no personal data. */
export interface IdentityRetrieveResult {
    /** Unique verification ID */
    verification_id: string;
    /** Verification status */
    status: VerificationStatus;
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
