import {
    Severity,
    GroomingRisk,
} from '../constants.js';
import { TrackingFields } from './index.js';
import { MessageAnalysis } from './detection.js';

// Re-export enums for convenience
export { Severity, GroomingRisk };

/**
 * Context type - can be a string shorthand or detailed object
 */
export type ContextInput = string | {
    /** Language of the content (e.g., "en") */
    language?: string;
    /** Age group (e.g., "11-13", "14-17") */
    ageGroup?: string;
    /** Relationship between participants (e.g., "classmates", "strangers") */
    relationship?: string;
    /** Platform type (e.g., "chat", "social_media", "gaming") */
    platform?: string;
    /** ISO 3166-1 alpha-2 country code (e.g., "GB", "US") for geo-localised helpline data */
    country?: string;
};

// =============================================================================
// Bullying Detection
// =============================================================================

export interface DetectBullyingInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis - string shorthand or detailed object */
    context?: ContextInput;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

export interface BullyingResult {
    /** Whether bullying was detected */
    is_bullying: boolean;
    /** Types of bullying detected */
    bullying_type: string[];
    /** Confidence score (0-1) */
    confidence: number;
    /** Severity of the bullying */
    severity: Severity;
    /** Explanation of the analysis */
    rationale: string;
    /** Recommended action to take */
    recommended_action: string;
    /** Risk score (0-1) */
    risk_score: number;
    /** Language code used for analysis */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Grooming Detection
// =============================================================================

export interface GroomingMessage {
    /** Role of sender */
    role: 'adult' | 'child' | 'unknown' | string;
    /** Message content */
    content: string;
    /** Optional timestamp */
    timestamp?: string | Date;
    /**
     * Optional numeric age of THIS message's sender. Helps the engine reason
     * about age asymmetry per turn rather than inferring it from `role`.
     */
    senderAge?: number;
}

export interface DetectGroomingInput extends TrackingFields {
    /** Sequence of messages to analyze */
    messages: GroomingMessage[];
    /** Age of the child (optional) */
    childAge?: number;
    /**
     * Optional age of the non-minor participant in the conversation. When
     * known (e.g. on age-verified platforms), this lets the engine compute
     * the actual age gap rather than infer it from role labels alone.
     */
    participantAge?: number;
    /** Context for better analysis */
    context?: ContextInput;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

export interface GroomingResult {
    /** Level of grooming risk detected */
    grooming_risk: GroomingRisk;
    /** Confidence score (0-1) */
    confidence: number;
    /** Grooming indicators/flags detected */
    flags: string[];
    /** Explanation of the analysis */
    rationale: string;
    /** Risk score (0-1) */
    risk_score: number;
    /** Recommended action to take */
    recommended_action: string;
    /** Per-message analysis (conversation-aware endpoints) */
    message_analysis?: MessageAnalysis[];
    /** Language code used for analysis */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Unsafe Content Detection
// =============================================================================

export interface DetectUnsafeInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis */
    context?: ContextInput;
    /** Minimum severity to show crisis support resources (default: 'high'). Critical always shows. */
    supportThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

export interface UnsafeResult {
    /** Whether unsafe content was detected */
    unsafe: boolean;
    /** Categories of unsafe content detected */
    categories: string[];
    /** Severity of the unsafe content */
    severity: Severity;
    /** Confidence score (0-1) */
    confidence: number;
    /** Risk score (0-1) */
    risk_score: number;
    /** Risk level derived from risk_score */
    risk_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
    /** Explanation of the analysis */
    rationale: string;
    /** Recommended action to take */
    recommended_action: string;
    /** Language code used for analysis */
    language?: string;
    /** Language support maturity */
    language_status?: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Quick Analysis (Combined)
// =============================================================================

export interface AnalyzeInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis */
    context?: ContextInput;
    /** Which detections to run (defaults to ['bullying', 'unsafe']) */
    include?: Array<'bullying' | 'unsafe'>;
}

export interface AnalyzeResult {
    /** Overall risk assessment */
    risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    /** Overall risk score (0-1) */
    risk_score: number;
    /** Overall confidence score (0-1), highest from sub-results */
    confidence: number;
    /** Summary of findings */
    summary: string;
    /** Bullying detection result (if included) */
    bullying?: BullyingResult;
    /** Unsafe content result (if included) */
    unsafe?: UnsafeResult;
    /** Combined recommended action */
    recommended_action: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided customer_id (if any) */
    customer_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
}

// Legacy type aliases for backwards compatibility
export type DetectBullyingRequest = DetectBullyingInput;
export type DetectBullyingResponse = BullyingResult;
export type DetectGroomingRequest = DetectGroomingInput;
export type DetectGroomingResponse = GroomingResult;
export type DetectUnsafeRequest = DetectUnsafeInput;
export type DetectUnsafeResponse = UnsafeResult;
