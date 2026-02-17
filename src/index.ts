// Main export
export { Tuteliq, TuteliqClient } from './client.js';

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
    TuteliqError,
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
    TuteliqOptions,
    TuteliqClientOptions,
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

    // Detection types (Fraud + Safety Extended)
    DetectionInput,
    DetectionResult,
    DetectionCategory,
    DetectionEvidence,
    AgeCalibration,
    AnalyseMultiInput,
    AnalyseMultiResult,
    AnalyseMultiSummary,

    // Media types
    AnalyzeVoiceInput,
    VoiceAnalysisResult,
    TranscriptionResult,
    TranscriptionSegment,
    AnalyzeVideoInput,
    VideoAnalysisResult,
    VideoSafetyFinding,
    AnalyzeImageInput,
    ImageAnalysisResult,
    VisionResult,

    // Webhook types
    Webhook,
    WebhookListResult,
    CreateWebhookInput,
    CreateWebhookResult,
    UpdateWebhookInput,
    UpdateWebhookResult,
    DeleteWebhookResult,
    TestWebhookResult,
    RegenerateSecretResult,

    // Pricing types
    PricingPlan,
    PricingResult,
    PricingDetailPlan,
    PricingDetailsResult,

    // Usage types
    UsageSummary,
    UsageQuota,
    UsageDay,
    UsageHistoryResult,
    UsageByToolResult,
    UsageMonthlyResult,

    // Account types (GDPR)
    AccountDeletionResult,
    AccountExportResult,

    // Consent types (GDPR)
    ConsentType,
    ConsentStatus,
    RecordConsentInput,
    ConsentRecord,
    ConsentStatusResult,
    ConsentActionResult,

    // Rectification types (GDPR)
    RectifyDataInput,
    RectifyDataResult,

    // Audit log types (GDPR)
    AuditAction,
    AuditLogEntry,
    AuditLogsResult,
    GetAuditLogsOptions,

    // Breach management types (GDPR)
    BreachSeverity,
    BreachStatus,
    BreachNotificationStatus,
    LogBreachInput,
    UpdateBreachInput,
    BreachRecord,
    LogBreachResult,
    BreachListResult,
    BreachResult,
    GetBreachesOptions,

    // Voice stream types
    VoiceStreamConfig,
    VoiceStreamHandlers,
    VoiceStreamSession,
    VoiceStreamEvent,
    VoiceReadyEvent,
    VoiceTranscriptionEvent,
    VoiceTranscriptionSegment,
    VoiceAlertEvent,
    VoiceSessionSummaryEvent,
    VoiceConfigUpdatedEvent,
    VoiceErrorEvent,

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

// Re-export ContentSeverity from constants
export { ContentSeverity } from './constants.js';
