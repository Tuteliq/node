// =============================================================================
// Detection Settings
// =============================================================================

/** Default context applied to detections when the request omits one. */
export interface DetectionDefaultContext {
    age_group?: string;
    platform?: string;
    country?: string;
}

/** Current per-account detection settings. */
export interface DetectionSettings {
    /** Endpoints currently enabled for this account */
    enabled_endpoints: string[];
    /** Endpoints currently disabled for this account */
    disabled_endpoints: string[];
    /** Default context merged into detection requests */
    default_context?: DetectionDefaultContext;
    /** All endpoints the API supports */
    available_endpoints: string[];
    /** ISO 8601 timestamp of the last settings update */
    updated_at?: string;
}

/**
 * Input for updating detection settings.
 * `enabled_endpoints` and `disabled_endpoints` are mutually exclusive —
 * provide at most one of them.
 */
export interface UpdateDetectionSettingsInput {
    enabled_endpoints?: string[];
    disabled_endpoints?: string[];
    default_context?: DetectionDefaultContext;
}

/** Result of updating detection settings. */
export interface UpdateDetectionSettingsResult {
    success: boolean;
    settings: Record<string, unknown>;
    message: string;
}

/** Result of resetting detection settings to defaults. */
export interface ResetDetectionSettingsResult {
    success: boolean;
    message: string;
}
