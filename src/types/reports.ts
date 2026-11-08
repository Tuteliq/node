import { TrackingFields } from './index.js';

// =============================================================================
// Incident Report
// =============================================================================

export interface ReportMessage {
    /** Sender identifier or role */
    sender: string;
    /** Message content */
    content: string;
    /** Optional timestamp */
    timestamp?: string | Date;
}

export interface GenerateReportInput extends TrackingFields {
    /** Messages involved in the incident */
    messages: ReportMessage[];
    /** Age of the child */
    childAge?: number;
    /** Your identifier for the conversation the messages come from */
    conversationId?: string;
    /** Start and end of the incident, as ISO 8601 timestamps */
    timestampRange?: [string, string];
    /**
     * @deprecated Not accepted by the API and not sent. Use `conversationId`
     * and `timestampRange`.
     */
    incident?: {
        /** Incident type/category */
        type?: string;
        /** When the incident occurred */
        occurredAt?: string | Date;
        /** Additional notes */
        notes?: string;
    };
}

export interface ReportResult {
    /** Summary of the incident */
    summary: string;
    /** Risk level assessment */
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    /** Categories of concerns */
    categories: string[];
    /** Recommended next steps */
    recommended_next_steps: string[];
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
}

// Legacy type aliases for backwards compatibility
export type IncidentMessage = ReportMessage;
export type IncidentReportRequest = GenerateReportInput;
export type IncidentReportResponse = ReportResult;
