import {
    Severity,
    GroomingRisk,
} from '../constants.js';
import { TrackingFields } from './index.js';

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
};

// =============================================================================
// Bullying Detection
// =============================================================================

export interface DetectBullyingInput extends TrackingFields {
    /** The content to analyze */
    content: string;
    /** Context for better analysis - string shorthand or detailed object */
    context?: ContextInput;
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
}

export interface DetectGroomingInput extends TrackingFields {
    /** Sequence of messages to analyze */
    messages: GroomingMessage[];
    /** Age of the child (optional) */
    childAge?: number;
    /** Context for better analysis */
    context?: ContextInput;
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
    /** Explanation of the analysis */
    rationale: string;
    /** Recommended action to take */
    recommended_action: string;
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
    /** Summary of findings */
    summary: string;
    /** Bullying detection result (if included) */
    bullying?: BullyingResult;
    /** Unsafe content result (if included) */
    unsafe?: UnsafeResult;
    /** Combined recommended action */
    recommended_action: string;
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
