import { TrackingFields } from './index.js';

/**
 * Target audience for action plans
 */
export type Audience = 'child' | 'parent' | 'platform';

// =============================================================================
// Action Plan
// =============================================================================

export interface GetActionPlanInput extends TrackingFields {
    /** Description of the situation */
    situation: string;
    /** Age of the child */
    childAge?: number;
    /** Target audience for the guidance (defaults to 'parent') */
    audience?: Audience;
    /** Severity level to tailor the response */
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActionPlanResult {
    /** Target audience label */
    audience: string;
    /** Step-by-step action items */
    steps: string[];
    /** Tone used in the guidance */
    tone: string;
    /** Approximate reading level */
    approx_reading_level?: string;
    /** @deprecated Use `approx_reading_level`; the SDK copies it here for compatibility. */
    reading_level?: string;
    /** Number of credits consumed by this request */
    credits_used?: number;
    /** Echo of provided external_id (if any) */
    external_id?: string;
    /** Echo of provided metadata (if any) */
    metadata?: Record<string, unknown>;
}

// Legacy type aliases for backwards compatibility
export type ActionPlanRole = Audience;
export type ActionPlanRequest = GetActionPlanInput;
export type ActionPlanResponse = ActionPlanResult;
