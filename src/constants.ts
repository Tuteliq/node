/**
 * Tuteliq SDK Constants
 * Mirrors the server-side constants for consistency
 */

// =============================================================================
// Safety Analysis Enums
// =============================================================================

/**
 * Severity levels used across safety detection
 */
export enum Severity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

/**
 * Grooming risk levels
 */
export enum GroomingRisk {
    NONE = 'none',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

/**
 * Risk levels for incidents (uses "moderate" instead of "medium" for clarity)
 */
export enum RiskLevel {
    LOW = 'low',
    MODERATE = 'moderate',
    HIGH = 'high',
    CRITICAL = 'critical',
}

/**
 * Risk categories for incidents
 */
export enum RiskCategory {
    BULLYING = 'bullying',
    GROOMING = 'grooming',
    UNSAFE = 'unsafe',
    SELF_HARM = 'self_harm',
    OTHER = 'other',
}

/**
 * Analysis/detection types
 */
export enum AnalysisType {
    BULLYING = 'bullying',
    GROOMING = 'grooming',
    UNSAFE = 'unsafe',
    EMOTIONS = 'emotions',
    VOICE = 'voice',
    IMAGE = 'image',
}

/**
 * Content severity levels — includes `NONE` for media analysis results
 * where no safety concern is found (visual or overall).
 */
export enum ContentSeverity {
    NONE = 'none',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

/**
 * Emotional trend direction
 */
export enum EmotionTrend {
    IMPROVING = 'improving',
    STABLE = 'stable',
    WORSENING = 'worsening',
}

/**
 * Incident status
 */
export enum IncidentStatus {
    NEW = 'new',
    REVIEWED = 'reviewed',
    RESOLVED = 'resolved',
}

/**
 * Tool names for tracking
 */
export enum ToolName {
    DETECT_BULLYING = 'detectBullying',
    DETECT_GROOMING = 'detectGrooming',
    DETECT_UNSAFE_CONTEXT = 'detectUnsafeContext',
    EMOTION_SUMMARY = 'emotionSummary',
    HEALTHY_ACTION_PLAN = 'healthyActionPlan',
    INCIDENT_REPORT = 'incidentReport',
    POLICY_CONFIG = 'policyConfig',
    DETECT_SOCIAL_ENGINEERING = 'detectSocialEngineering',
    DETECT_APP_FRAUD = 'detectAppFraud',
    DETECT_ROMANCE_SCAM = 'detectRomanceScam',
    DETECT_MULE_RECRUITMENT = 'detectMuleRecruitment',
    DETECT_GAMBLING_HARM = 'detectGamblingHarm',
    DETECT_COERCIVE_CONTROL = 'detectCoerciveControl',
    DETECT_VULNERABILITY_EXPLOITATION = 'detectVulnerabilityExploitation',
    DETECT_RADICALISATION = 'detectRadicalisation',
    ANALYZE_VIDEO = 'analyzeVideo',
}

// =============================================================================
// Subscription Tiers
// =============================================================================

/**
 * Subscription tier levels
 */
export enum Tier {
    STARTER = 'starter',       // Free forever - 1,000 API calls/month
    INDIE = 'indie',           // $29/mo - 10,000 API calls/month
    PRO = 'pro',               // $99/mo - 50,000 API calls/month
    BUSINESS = 'business',     // $349/mo - 200,000 API calls/month
    ENTERPRISE = 'enterprise', // Custom - Unlimited API calls
}

/**
 * Monthly API call limits per tier
 */
export const TIER_MONTHLY_LIMITS: Record<Tier, number> = {
    [Tier.STARTER]: 1000,
    [Tier.INDIE]: 10000,
    [Tier.PRO]: 50000,
    [Tier.BUSINESS]: 200000,
    [Tier.ENTERPRISE]: -1, // Unlimited
};

// =============================================================================
// Webhook Events
// =============================================================================

export enum WebhookEventType {
    INCIDENT_CRITICAL = 'incident.critical',
    INCIDENT_HIGH = 'incident.high',
    GROOMING_DETECTED = 'grooming.detected',
    SELF_HARM_DETECTED = 'self_harm.detected',
    BULLYING_SEVERE = 'bullying.severe',
}

// =============================================================================
// Error Codes
// =============================================================================

export enum ErrorCode {
    // Authentication errors (AUTH_*)
    API_KEY_REQUIRED = 'AUTH_1001',
    API_KEY_NOT_FOUND = 'AUTH_1002',
    API_KEY_INVALID = 'AUTH_1003',
    API_KEY_REVOKED = 'AUTH_1004',
    API_KEY_INACTIVE = 'AUTH_1005',
    API_KEY_EXPIRED = 'AUTH_1006',
    UNAUTHORIZED = 'AUTH_1007',

    // Rate limiting errors (RATE_*)
    RATE_LIMIT_EXCEEDED = 'RATE_2001',
    DAILY_LIMIT_EXCEEDED = 'RATE_2002',
    QUOTA_EXCEEDED = 'RATE_2003',

    // Validation errors (VAL_*)
    VALIDATION_FAILED = 'VAL_3001',
    INVALID_INPUT = 'VAL_3002',
    MISSING_FIELD = 'VAL_3003',
    INVALID_FORMAT = 'VAL_3004',
    BATCH_SIZE_EXCEEDED = 'VAL_3005',
    MESSAGE_TOO_LONG = 'VAL_3006',
    TOO_MANY_MESSAGES = 'VAL_3007',

    // Service errors (SVC_*)
    INTERNAL_ERROR = 'SVC_4001',
    DATABASE_ERROR = 'SVC_4002',
    SERVICE_UNAVAILABLE = 'SVC_4003',
    LLM_SERVICE_ERROR = 'SVC_4004',
    WEBHOOK_DELIVERY_FAILED = 'SVC_4005',

    // Analysis errors (ANALYSIS_*)
    ANALYSIS_FAILED = 'ANALYSIS_5001',
    UNSUPPORTED_TYPE = 'ANALYSIS_5002',
    NO_CONTENT = 'ANALYSIS_5003',
}

// =============================================================================
// Language Support
// =============================================================================

/**
 * Supported language codes for content analysis.
 * English is stable; all others are beta.
 */
export enum Language {
    EN = 'en',
    ES = 'es',
    PT = 'pt',
    UK = 'uk',
    SV = 'sv',
    NO = 'no',
    DA = 'da',
    FI = 'fi',
    DE = 'de',
    FR = 'fr',
}

/**
 * Language support maturity status
 */
export enum LanguageStatus {
    STABLE = 'stable',
    BETA = 'beta',
}

/**
 * Detection endpoint identifiers for multi-endpoint analysis
 */
export enum Detection {
    BULLYING = 'bullying',
    GROOMING = 'grooming',
    UNSAFE = 'unsafe',
    SOCIAL_ENGINEERING = 'social-engineering',
    APP_FRAUD = 'app-fraud',
    ROMANCE_SCAM = 'romance-scam',
    MULE_RECRUITMENT = 'mule-recruitment',
    GAMBLING_HARM = 'gambling-harm',
    COERCIVE_CONTROL = 'coercive-control',
    VULNERABILITY_EXPLOITATION = 'vulnerability-exploitation',
    RADICALISATION = 'radicalisation',
}

/**
 * Supported language codes
 */
export const SUPPORTED_LANGUAGES = Object.values(Language);
