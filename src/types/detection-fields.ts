import { ConversationType } from '../constants.js';

export type { ConversationType };

// =============================================================================
// Declared participants (request side)
// =============================================================================

/** Who a participant is, as your platform knows them. */
export type ParticipantRole =
    | 'child'
    | 'teen'
    | 'adult'
    | 'guardian'
    | 'educator'
    | 'staff'
    | 'unknown';

/** How a recipient is related to the sender. */
export type ParticipantRelationship =
    | 'guardian_of_sender'
    | 'child_of_sender'
    | 'sibling'
    | 'peer'
    | 'educator_of_sender'
    | 'student_of_sender'
    | 'staff'
    | 'none'
    | 'unknown';

/** The sender of the text, declared by your platform (never inferred). */
export interface DeclaredSender {
    role?: ParticipantRole;
    /** The sender's age group, e.g. "8-10". */
    ageGroup?: string;
}

/** A recipient of the text, declared by your platform (never inferred). */
export interface DeclaredRecipient extends DeclaredSender {
    relationshipToSender?: ParticipantRelationship;
}

// =============================================================================
// Shared result fields
// =============================================================================

/** Why a requested `attestation` is null. */
export type AttestationReason =
    | 'endpoint_unsupported'
    | 'nothing_detected'
    | 'not_attributable'
    | 'signing_unavailable'
    | 'sandbox';

/**
 * A signed, non-identifying statement of what was detected, returned when the
 * request sets `attestation: true`. Verify `signature` against the published
 * key named by `key_id`.
 */
export interface DetectionAttestation {
    v: 'tlq-att-1';
    harm_descriptor: string;
    /** Your `external_id`, echoed outside the signed payload. */
    external_ref?: string;
    detector: {
        model_id: string;
        model_version: string;
        /** Version identifier included in the signed attestation. */
        prompt_template_version: string;
        endpoint: string;
    };
    operating_point: Record<string, number>;
    /** RFC 3339 timestamp */
    detected_at: string;
    disclosure_url: string;
    limits: string[];
    signature: {
        algorithm: string;
        key_id: string;
        signature: string;
        signed_at: string;
    };
}

/** Signed attestation fields, on the single-endpoint text detectors. */
export interface AttestationFields {
    /** Present only when requested; null when none could be produced. */
    attestation?: DetectionAttestation | null;
    /** Why `attestation` is null. */
    attestation_reason?: AttestationReason;
}

/** What the declared `sender`/`recipients` supplied to the analysis. */
export interface ParticipantsApplied {
    conversation_type?: 'family' | 'education';
    age_group?: string;
    child_age?: number;
}

/** Opt-in reading returned when `context.minorDisclosureCheck` is set. */
export interface MinorDisclosure {
    detected: boolean;
    evidence_type: 'stated_age' | 'school_year' | 'parental_control' | 'age_milestone' | 'life_stage' | 'other';
    /** Index of the message the disclosure is in */
    message_index: number;
    suggested_age_group: string;
    /** Human-readable; do not branch on it. */
    reason: string;
}

/** The declared setting and participants that applied to a result. */
export interface DeclaredContextFields {
    /** The declared setting in effect, from the request or the account default. */
    conversation_type_in_effect?: ConversationType;
    /** Where `conversation_type_in_effect` came from. */
    conversation_type_source?: 'request' | 'participants' | 'account_default';
    /** Present only when the declared setting changed the result. */
    conversation_type_applied?: string;
    participants_applied?: ParticipantsApplied;
    minor_disclosure?: MinorDisclosure;
}

/** The speaker's relationship to the conduct described. */
export type SpeakerRole = 'enacting' | 'experiencing' | 'reporting_other' | 'self_directed' | 'unclear';

/** Whether the speaker is using the tactic or describing someone else using it. */
export type SpeakerStance = 'deploying' | 'describing_third_party' | 'unclear';

/**
 * Adjustments the API applied to this result, reported for transparency.
 * Descriptive only: route on `recommended_action`. Each is absent unless it
 * applied, and each `*_reason` is human-readable text.
 */
export interface ResultAdjustments {
    absence_reason_cleared?: boolean;
    access_request_raised?: boolean;
    access_request_raised_reason?: string;
    action_capped?: boolean;
    action_capped_reason?: string;
    adult_exchange_capped?: boolean;
    adult_exchange_capped_reason?: string;
    affection_only_capped?: boolean;
    affection_only_capped_reason?: string;
    banter_capped?: boolean;
    banter_capped_reason?: string;
    bullying_report_surfaced?: boolean;
    bullying_report_surfaced_reason?: string;
    consent_floor_applied?: boolean;
    continued_after_objection_raised?: boolean;
    continued_after_objection_raised_reason?: string;
    conversation_distress_surfaced?: boolean;
    conversation_distress_surfaced_reason?: string;
    declared_age_overridden?: boolean;
    declared_age_overridden_reason?: string;
    detection_evasion_raised?: boolean;
    disclosure_cleared?: boolean;
    disclosure_cleared_reason?: string;
    document_safekeeping_capped?: boolean;
    document_safekeeping_capped_reason?: string;
    escalation_capped?: boolean;
    escalation_capped_reason?: string;
    exclusion_claim_watched?: boolean;
    exclusion_claim_watched_reason?: string;
    exclusion_report_recorded?: boolean;
    exclusion_report_recorded_reason?: string;
    figurative_low_mood_capped?: boolean;
    figurative_low_mood_capped_reason?: string;
    game_play_capped?: boolean;
    game_play_capped_reason?: string;
    high_risk_score_raised?: boolean;
    high_risk_score_raised_reason?: string;
    logistics_only_capped?: boolean;
    logistics_only_capped_reason?: string;
    lone_message_block_capped?: boolean;
    lone_message_block_capped_reason?: string;
    lone_rapport_capped?: boolean;
    lone_rapport_capped_reason?: string;
    long_conversation_raised?: boolean;
    long_conversation_raised_reason?: string;
    looks_attack_raised?: boolean;
    looks_attack_raised_reason?: string;
    love_bombing_ask_raised?: boolean;
    love_bombing_ask_raised_reason?: string;
    love_bombing_raised?: boolean;
    love_bombing_raised_reason?: string;
    meeting_logistics_cleared?: boolean;
    meeting_logistics_cleared_reason?: string;
    minor_on_adult_platform_raised?: boolean;
    minor_on_adult_platform_raised_reason?: string;
    no_child_shown_capped?: boolean;
    no_child_shown_capped_reason?: string;
    no_harmful_act_capped?: boolean;
    no_harmful_act_capped_reason?: string;
    no_harmful_act_urgency_capped?: boolean;
    no_harmful_act_urgency_capped_reason?: string;
    no_tactic_left_lowered?: boolean;
    no_tactic_left_lowered_reason?: string;
    number_coincidence_cleared?: boolean;
    number_coincidence_cleared_reason?: string;
    off_platform_raised?: boolean;
    off_platform_raised_reason?: string;
    ongoing_harm_floor_applied?: boolean;
    ongoing_harm_floor_reason?: string;
    only_confirmation_asked_capped?: boolean;
    only_confirmation_asked_capped_reason?: string;
    ordinary_day_capped?: boolean;
    ordinary_day_capped_reason?: string;
    ordinary_discipline_capped?: boolean;
    ordinary_discipline_capped_reason?: string;
    ordinary_hyperbole_capped?: boolean;
    ordinary_hyperbole_capped_reason?: string;
    ordinary_shared_finances_capped?: boolean;
    ordinary_shared_finances_capped_reason?: string;
    passing_remark_capped?: boolean;
    passing_remark_capped_reason?: string;
    past_account_cleared?: boolean;
    peer_move_lowered?: boolean;
    peer_move_lowered_reason?: string;
    pressed_after_objection_watched?: boolean;
    pressed_after_objection_watched_reason?: string;
    private_move_raised?: boolean;
    private_move_raised_reason?: string;
    protective_speech_capped?: boolean;
    protective_speech_capped_reason?: string;
    reading_capped?: boolean;
    reading_capped_reason?: string;
    reciprocity_floor_applied?: boolean;
    reporter_capped?: boolean;
    resource_direction_cleared?: boolean;
    risk_score_lowered?: boolean;
    risk_score_lowered_reason?: string;
    rumour_spread_raised?: boolean;
    rumour_spread_raised_reason?: string;
    secrecy_frame_cleared?: boolean;
    severity_capped?: boolean;
    severity_capped_reason?: string;
    shared_surprise_capped?: boolean;
    shared_surprise_capped_reason?: string;
    single_insult_watched?: boolean;
    single_insult_watched_reason?: string;
    soft_evidence_capped?: boolean;
    soft_evidence_capped_reason?: string;
    talking_about_capped?: boolean;
    talking_about_capped_reason?: string;
    teasing_stopped_capped?: boolean;
    teasing_stopped_capped_reason?: string;
    third_party_report_cleared?: boolean;
    third_party_report_surfaced?: boolean;
    third_party_report_surfaced_reason?: string;
    unseen_partner_raised?: boolean;
    unseen_partner_raised_reason?: string;
    urgency_kept?: boolean;
    urgency_kept_reason?: string;
    verdict_capped?: boolean;
    verdict_capped_reason?: string;
    verdict_withdrawn?: boolean;
    verdict_withdrawn_reason?: string;
    willing_exchange_capped?: boolean;
    willing_exchange_capped_reason?: string;
    ungrounded_flags?: string[];
    flag_attribution?: Record<string, string[]>;
    detection_evasion_messages?: number[];
    confidentiality_frame?: 'unconditional_concealment' | 'limited_confidentiality' | 'guardian_included' | 'none';
    consent_violation?: 'explicit_refusal_overridden' | 'threatened_exposure';
    off_platform_request?: boolean;
    off_platform_request_reason?: string;
    off_platform_markers?: Array<'scam_persona' | 'early_love_bombing' | 'avoids_video_or_meeting' | 'discredits_platform'>;
    target_report_action_was?: 'block';
    sustained_hopelessness_conversations?: number;
}

/** Fields shared by every single-endpoint text detection result. */
export interface TextDetectionFields extends AttestationFields, DeclaredContextFields, ResultAdjustments {}
