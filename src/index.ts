// Main export
export { SafeNest, SafeNestClient } from './client.js';

// Constants and enums export
export {
    Severity,
    GroomingRisk,
    RiskLevel,
    RiskCategory,
    AnalysisType,
    EmotionTrend,
    IncidentStatus,
    ToolName,
    WebhookEventType,
    ErrorCode,
    Tier,
    TIER_MONTHLY_LIMITS,
} from './constants.js';

// Error exports
export {
    SafeNestError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    NotFoundError,
    ServerError,
    TimeoutError,
    NetworkError,
    QuotaExceededError,
    TierAccessError,
} from './errors.js';

// Type exports
export type {
    // Client options
    SafeNestOptions,
    SafeNestClientOptions,
    Usage,
    RequestMeta,
    ApiError,

    // Safety types
    ContextInput,
    DetectBullyingInput,
    BullyingResult,
    GroomingMessage,
    DetectGroomingInput,
    GroomingResult,
    DetectUnsafeInput,
    UnsafeResult,
    AnalyzeInput,
    AnalyzeResult,

    // Analysis types
    EmotionMessage,
    AnalyzeEmotionsInput,
    EmotionsResult,

    // Guidance types
    Audience,
    GetActionPlanInput,
    ActionPlanResult,

    // Report types
    ReportMessage,
    GenerateReportInput,
    ReportResult,

    // Policy types
    PolicyConfig,
    PolicyConfigResponse,
    ThresholdConfig,
    BullyingPolicyConfig,
    GroomingPolicyConfig,
    SelfHarmPolicyConfig,
    HateSpeechPolicyConfig,
    ThreatsPolicyConfig,
    SexualContentPolicyConfig,
    ViolencePolicyConfig,
    EmotionMonitoringConfig,
    IncidentReportingConfig,

    // Account types (GDPR)
    AccountDeletionResult,
    AccountExportResult,

    // Legacy type aliases (backwards compatibility)
    DetectBullyingRequest,
    DetectBullyingResponse,
    DetectGroomingRequest,
    DetectGroomingResponse,
    DetectUnsafeRequest,
    DetectUnsafeResponse,
    EmotionSummaryRequest,
    EmotionSummaryResponse,
    ActionPlanRole,
    ActionPlanRequest,
    ActionPlanResponse,
    IncidentMessage,
    IncidentReportRequest,
    IncidentReportResponse,
} from './types/index.js';
