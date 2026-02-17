import {
    TuteliqOptions,
    Usage,
    RateLimitInfo,
    ApiError,
    // Safety types
    DetectBullyingInput,
    BullyingResult,
    DetectGroomingInput,
    GroomingResult,
    DetectUnsafeInput,
    UnsafeResult,
    AnalyzeInput,
    AnalyzeResult,
    ContextInput,
    // Analysis types
    AnalyzeEmotionsInput,
    EmotionsResult,
    // Guidance types
    GetActionPlanInput,
    ActionPlanResult,
    // Report types
    GenerateReportInput,
    ReportResult,
    // Policy types
    PolicyConfig,
    PolicyConfigResponse,
    // Usage types
    UsageSummary,
    UsageQuota,
    // Batch types
    BatchAnalyzeInput,
    BatchAnalyzeResult,
    // Account types
    AccountDeletionResult,
    AccountExportResult,
    RecordConsentInput,
    ConsentStatusResult,
    ConsentActionResult,
    ConsentType,
    RectifyDataInput,
    RectifyDataResult,
    AuditLogsResult,
    GetAuditLogsOptions,
    // Breach types
    LogBreachInput,
    LogBreachResult,
    BreachListResult,
    BreachResult,
    UpdateBreachInput,
    GetBreachesOptions,
    // Media types
    AnalyzeVoiceInput,
    VoiceAnalysisResult,
    AnalyzeImageInput,
    ImageAnalysisResult,
    // Webhook types
    WebhookListResult,
    CreateWebhookInput,
    CreateWebhookResult,
    UpdateWebhookInput,
    UpdateWebhookResult,
    DeleteWebhookResult,
    TestWebhookResult,
    RegenerateSecretResult,
    // Pricing types
    PricingResult,
    PricingDetailsResult,
    // Usage types
    UsageHistoryResult,
    UsageByToolResult,
    UsageMonthlyResult,
    // Detection types
    DetectionInput,
    DetectionResult,
    AnalyseMultiInput,
    AnalyseMultiResult,
    // Video types
    AnalyzeVideoInput,
    VideoAnalysisResult,
    // Voice stream types
    VoiceStreamConfig,
    VoiceStreamHandlers,
    VoiceStreamSession,
} from './types/index.js';

import {
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

import { withRetry } from './utils/retry.js';
import { createVoiceStream } from './voice-stream.js';

/** Tuteliq API endpoint - locked to official server */
const API_BASE_URL = 'https://api.tuteliq.ai';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

// Input limits to prevent abuse
const MAX_CONTENT_LENGTH = 50000;  // 50KB max content
const MAX_MESSAGES_COUNT = 100;    // Max messages per request

/**
 * Tuteliq - AI-powered child safety analysis
 *
 * @example
 * ```typescript
 * import { Tuteliq } from '@tuteliq/sdk'
 *
 * const tuteliq = new Tuteliq(process.env.TUTELIQ_API_KEY)
 *
 * // Detect bullying
 * const result = await tuteliq.detectBullying({
 *   content: "You're not welcome here",
 *   context: 'chat'
 * })
 *
 * if (result.is_bullying) {
 *   console.log('Severity:', result.severity)
 *   console.log('Rationale:', result.rationale)
 * }
 *
 * // Check usage
 * console.log(tuteliq.usage) // { limit: 10000, used: 5234, remaining: 4766 }
 * ```
 */
export class Tuteliq {
    private readonly apiKey: string;
    private readonly timeout: number;
    private readonly retries: number;
    private readonly retryDelay: number;

    private _usage: Usage | null = null;
    private _rateLimit: RateLimitInfo | null = null;
    private _lastRequestId: string | null = null;
    private _lastLatencyMs: number | null = null;
    private _usageWarning: string | null = null;

    /**
     * Create a new Tuteliq client
     *
     * @param apiKey - Your Tuteliq API key
     * @param options - Optional configuration
     *
     * @example
     * ```typescript
     * // Simple usage
     * const tuteliq = new Tuteliq('your-api-key')
     *
     * // With options
     * const tuteliq = new Tuteliq('your-api-key', {
     *   timeout: 10000
     * })
     * ```
     */
    constructor(apiKey: string, options: TuteliqOptions = {}) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('API key is required and must be a string');
        }

        if (apiKey.length < 10) {
            throw new Error('API key appears to be invalid (too short)');
        }

        this.apiKey = apiKey;
        this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
        this.retries = options.retries ?? DEFAULT_RETRIES;
        this.retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;

        // Validate configuration
        if (this.timeout < 1000 || this.timeout > 120000) {
            throw new Error('Timeout must be between 1000ms and 120000ms');
        }
        if (this.retries < 0 || this.retries > 10) {
            throw new Error('Retries must be between 0 and 10');
        }
    }

    /**
     * Get current monthly usage stats from the last request
     */
    get usage(): Usage | null {
        return this._usage;
    }

    /**
     * Get rate limit info from the last request (per-minute limits)
     */
    get rateLimit(): RateLimitInfo | null {
        return this._rateLimit;
    }

    /**
     * Get usage warning message if usage is above 80%
     */
    get usageWarning(): string | null {
        return this._usageWarning;
    }

    /**
     * Get the request ID from the last request
     */
    get lastRequestId(): string | null {
        return this._lastRequestId;
    }

    /**
     * Get the latency from the last request in milliseconds
     */
    get lastLatencyMs(): number | null {
        return this._lastLatencyMs;
    }

    /**
     * Validate content length to prevent abuse
     */
    private validateContent(content: string): void {
        if (!content || typeof content !== 'string') {
            throw new ValidationError('Content is required and must be a string');
        }
        if (content.length > MAX_CONTENT_LENGTH) {
            throw new ValidationError(
                `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`
            );
        }
    }

    /**
     * Validate messages array
     */
    private validateMessages(messages: unknown[]): void {
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new ValidationError('Messages array is required and cannot be empty');
        }
        if (messages.length > MAX_MESSAGES_COUNT) {
            throw new ValidationError(
                `Messages array exceeds maximum count of ${MAX_MESSAGES_COUNT}`
            );
        }
    }

    private static readonly SDK_IDENTIFIER = 'Node SDK';

    /**
     * Resolves the platform string by appending the SDK identifier.
     * - "MyApp" → "MyApp - Node SDK"
     * - undefined → "Node SDK"
     */
    private static resolvePlatform(platform?: string): string {
        if (platform && platform.length > 0) {
            return `${platform} - ${Tuteliq.SDK_IDENTIFIER}`;
        }
        return Tuteliq.SDK_IDENTIFIER;
    }

    /**
     * Normalize context input to API format
     */
    private normalizeContext(context?: ContextInput): Record<string, unknown> {
        if (!context) return { platform: Tuteliq.resolvePlatform() };
        if (typeof context === 'string') {
            return { platform: Tuteliq.resolvePlatform(context) };
        }
        return { ...context, platform: Tuteliq.resolvePlatform(context.platform) };
    }

    /**
     * Build request body for unified detection endpoints
     */
    private buildDetectionBody(input: DetectionInput): Record<string, unknown> {
        return {
            text: input.content,
            context: this.normalizeContext(input.context),
            ...(input.includeEvidence && { include_evidence: true }),
            ...(input.external_id && { external_id: input.external_id }),
            ...(input.customer_id && { customer_id: input.customer_id }),
            ...(input.metadata && { metadata: input.metadata }),
        };
    }

    /**
     * Make an authenticated request to the API
     */
    private async request<T>(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: string,
        body?: unknown
    ): Promise<T> {
        const url = `${API_BASE_URL}${path}`;
        const startTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            this._lastLatencyMs = Date.now() - startTime;

            // Extract metadata from headers
            this._lastRequestId = response.headers.get('x-request-id');

            // Monthly usage headers (X-Monthly-*)
            const monthlyLimit = response.headers.get('x-monthly-limit');
            const monthlyUsed = response.headers.get('x-monthly-used');
            const monthlyRemaining = response.headers.get('x-monthly-remaining');

            if (monthlyLimit && monthlyUsed && monthlyRemaining) {
                this._usage = {
                    limit: parseInt(monthlyLimit, 10),
                    used: parseInt(monthlyUsed, 10),
                    remaining: parseInt(monthlyRemaining, 10),
                };
            }

            // Rate limit headers (X-RateLimit-*)
            const rateLimitLimit = response.headers.get('x-ratelimit-limit');
            const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
            const rateLimitReset = response.headers.get('x-ratelimit-reset');

            if (rateLimitLimit && rateLimitRemaining) {
                this._rateLimit = {
                    limit: parseInt(rateLimitLimit, 10),
                    remaining: parseInt(rateLimitRemaining, 10),
                    reset: rateLimitReset ? parseInt(rateLimitReset, 10) : undefined,
                };
            }

            // Usage warning header
            this._usageWarning = response.headers.get('x-usage-warning');

            // Handle error responses
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({})) as ApiError;
                this.handleErrorResponse(response.status, errorBody, response.headers);
            }

            return await response.json() as T;
        } catch (error) {
            clearTimeout(timeoutId);
            this._lastLatencyMs = Date.now() - startTime;

            if (error instanceof TuteliqError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
                }

                // Detect network errors across runtimes (Node, browsers, edge)
                if (
                    error instanceof TypeError ||
                    error.name === 'TypeError' ||
                    error.message.includes('fetch') ||
                    error.message.includes('network') ||
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('ECONNRESET') ||
                    error.message.includes('ENOTFOUND') ||
                    error.message.includes('ERR_NETWORK') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('Network request failed')
                ) {
                    throw new NetworkError(error.message);
                }
            }

            throw new TuteliqError(
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
        }
    }

    /**
     * Handle error responses from the API
     */
    private handleErrorResponse(status: number, body: ApiError, headers: Headers): never {
        const message = body.error?.message || 'Unknown error';
        const code = body.error?.code;
        const details = body.error?.details;
        const suggestion = body.error?.suggestion;
        const links = body.error?.links;

        switch (status) {
            case 400:
                throw new ValidationError(message, details, { code, suggestion, links });
            case 401:
                throw new AuthenticationError(message, { code, suggestion, links });
            case 403:
                throw new TierAccessError(message, { code, suggestion, links });
            case 404:
                throw new NotFoundError(message, { code, suggestion, links });
            case 429: {
                const retryAfter = headers.get('retry-after');
                if (code === 'RATE_2003' || code === 'QUOTA_EXCEEDED') {
                    throw new QuotaExceededError(message, { code, suggestion, links });
                }
                throw new RateLimitError(
                    message,
                    retryAfter ? parseInt(retryAfter, 10) : undefined,
                    { code, suggestion, links }
                );
            }
            default:
                if (status >= 500) {
                    throw new ServerError(message, status, { code, suggestion, links });
                }
                throw new TuteliqError(message, status, details, { code, suggestion, links });
        }
    }

    /**
     * Make a request with retry logic
     */
    private async requestWithRetry<T>(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: string,
        body?: unknown
    ): Promise<T> {
        return withRetry(
            () => this.request<T>(method, path, body),
            {
                maxRetries: this.retries,
                initialDelay: this.retryDelay,
            }
        );
    }

    /**
     * Make an authenticated multipart request to the API
     */
    private async multipartRequest<T>(path: string, formData: FormData): Promise<T> {
        const url = `${API_BASE_URL}${path}`;
        const startTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            this._lastLatencyMs = Date.now() - startTime;

            // Extract metadata from headers
            this._lastRequestId = response.headers.get('x-request-id');

            const monthlyLimit = response.headers.get('x-monthly-limit');
            const monthlyUsed = response.headers.get('x-monthly-used');
            const monthlyRemaining = response.headers.get('x-monthly-remaining');

            if (monthlyLimit && monthlyUsed && monthlyRemaining) {
                this._usage = {
                    limit: parseInt(monthlyLimit, 10),
                    used: parseInt(monthlyUsed, 10),
                    remaining: parseInt(monthlyRemaining, 10),
                };
            }

            const rateLimitLimit = response.headers.get('x-ratelimit-limit');
            const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
            const rateLimitReset = response.headers.get('x-ratelimit-reset');

            if (rateLimitLimit && rateLimitRemaining) {
                this._rateLimit = {
                    limit: parseInt(rateLimitLimit, 10),
                    remaining: parseInt(rateLimitRemaining, 10),
                    reset: rateLimitReset ? parseInt(rateLimitReset, 10) : undefined,
                };
            }

            this._usageWarning = response.headers.get('x-usage-warning');

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({})) as ApiError;
                this.handleErrorResponse(response.status, errorBody, response.headers);
            }

            return await response.json() as T;
        } catch (error) {
            clearTimeout(timeoutId);
            this._lastLatencyMs = Date.now() - startTime;

            if (error instanceof TuteliqError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
                }

                if (
                    error instanceof TypeError ||
                    error.name === 'TypeError' ||
                    error.message.includes('fetch') ||
                    error.message.includes('network') ||
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('ECONNRESET') ||
                    error.message.includes('ENOTFOUND') ||
                    error.message.includes('ERR_NETWORK') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('Network request failed')
                ) {
                    throw new NetworkError(error.message);
                }
            }

            throw new TuteliqError(
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
        }
    }

    // =========================================================================
    // Safety Detection Methods
    // =========================================================================

    /**
     * Detect bullying in content
     *
     * @example
     * ```typescript
     * const result = await tuteliq.detectBullying({
     *   content: "Nobody likes you, loser",
     *   context: 'chat'
     * })
     *
     * if (result.is_bullying && result.severity === 'high') {
     *   console.log('High severity bullying detected')
     *   console.log('Rationale:', result.rationale)
     * }
     * ```
     */
    async detectBullying(input: DetectBullyingInput): Promise<BullyingResult> {
        this.validateContent(input.content);

        return this.requestWithRetry<BullyingResult>(
            'POST',
            '/api/v1/safety/bullying',
            {
                text: input.content,
                context: this.normalizeContext(input.context),
                ...(input.external_id && { external_id: input.external_id }),
                ...(input.customer_id && { customer_id: input.customer_id }),
                ...(input.metadata && { metadata: input.metadata }),
            }
        );
    }

    /**
     * Detect grooming patterns in a conversation
     *
     * @example
     * ```typescript
     * const result = await tuteliq.detectGrooming({
     *   messages: [
     *     { role: 'adult', content: "Don't tell your parents" },
     *     { role: 'child', content: "Ok" }
     *   ],
     *   childAge: 12
     * })
     *
     * if (result.grooming_risk === 'high') {
     *   console.log('Flags:', result.flags)
     * }
     * ```
     */
    async detectGrooming(input: DetectGroomingInput): Promise<GroomingResult> {
        this.validateMessages(input.messages);

        return this.requestWithRetry<GroomingResult>(
            'POST',
            '/api/v1/safety/grooming',
            {
                messages: input.messages.map(m => ({
                    sender_role: m.role,
                    text: m.content,
                })),
                context: {
                    child_age: input.childAge,
                    ...this.normalizeContext(input.context),
                },
                ...(input.external_id && { external_id: input.external_id }),
                ...(input.customer_id && { customer_id: input.customer_id }),
                ...(input.metadata && { metadata: input.metadata }),
            }
        );
    }

    /**
     * Detect unsafe content (self-harm, violence, hate speech, etc.)
     *
     * @example
     * ```typescript
     * const result = await tuteliq.detectUnsafe({
     *   content: "I want to hurt myself"
     * })
     *
     * if (result.unsafe && result.categories.includes('self_harm')) {
     *   console.log('Show crisis resources')
     * }
     * ```
     */
    async detectUnsafe(input: DetectUnsafeInput): Promise<UnsafeResult> {
        this.validateContent(input.content);

        return this.requestWithRetry<UnsafeResult>(
            'POST',
            '/api/v1/safety/unsafe',
            {
                text: input.content,
                context: this.normalizeContext(input.context),
                ...(input.external_id && { external_id: input.external_id }),
                ...(input.customer_id && { customer_id: input.customer_id }),
                ...(input.metadata && { metadata: input.metadata }),
            }
        );
    }

    /**
     * Quick analysis - runs bullying and unsafe detection, returns combined result
     *
     * @example
     * ```typescript
     * const result = await tuteliq.analyze("Some user message")
     *
     * if (result.risk_level !== 'safe') {
     *   console.log('Risk:', result.risk_level)
     *   console.log('Summary:', result.summary)
     * }
     * ```
     */
    async analyze(content: string, context?: ContextInput): Promise<AnalyzeResult>;
    async analyze(input: AnalyzeInput): Promise<AnalyzeResult>;
    async analyze(
        contentOrInput: string | AnalyzeInput,
        context?: ContextInput
    ): Promise<AnalyzeResult> {
        const input: AnalyzeInput = typeof contentOrInput === 'string'
            ? { content: contentOrInput, context }
            : contentOrInput;

        const include = input.include || ['bullying', 'unsafe'];

        // Run detections in parallel
        const promises: Promise<unknown>[] = [];
        const types: string[] = [];

        if (include.includes('bullying')) {
            types.push('bullying');
            promises.push(this.detectBullying({
                content: input.content,
                context: input.context,
                external_id: input.external_id,
                customer_id: input.customer_id,
                metadata: input.metadata,
            }));
        }

        if (include.includes('unsafe')) {
            types.push('unsafe');
            promises.push(this.detectUnsafe({
                content: input.content,
                context: input.context,
                external_id: input.external_id,
                customer_id: input.customer_id,
                metadata: input.metadata,
            }));
        }

        const results = await Promise.all(promises);

        // Combine results
        let bullyingResult: BullyingResult | undefined;
        let unsafeResult: UnsafeResult | undefined;
        let maxRiskScore = 0;

        results.forEach((result, i) => {
            if (types[i] === 'bullying') {
                bullyingResult = result as BullyingResult;
                maxRiskScore = Math.max(maxRiskScore, bullyingResult.risk_score);
            } else if (types[i] === 'unsafe') {
                unsafeResult = result as UnsafeResult;
                maxRiskScore = Math.max(maxRiskScore, unsafeResult.risk_score);
            }
        });

        // Determine risk level
        let risk_level: AnalyzeResult['risk_level'] = 'safe';
        if (maxRiskScore >= 0.9) risk_level = 'critical';
        else if (maxRiskScore >= 0.7) risk_level = 'high';
        else if (maxRiskScore >= 0.5) risk_level = 'medium';
        else if (maxRiskScore >= 0.3) risk_level = 'low';

        // Build summary
        const findings: string[] = [];
        if (bullyingResult?.is_bullying) {
            findings.push(`Bullying detected (${bullyingResult.severity})`);
        }
        if (unsafeResult?.unsafe) {
            findings.push(`Unsafe content: ${unsafeResult.categories.join(', ')}`);
        }

        const summary = findings.length > 0
            ? findings.join('. ')
            : 'No safety concerns detected.';

        // Determine recommended action
        let recommended_action = 'none';
        if (bullyingResult?.recommended_action === 'immediate_intervention' ||
            unsafeResult?.recommended_action === 'immediate_intervention') {
            recommended_action = 'immediate_intervention';
        } else if (bullyingResult?.recommended_action === 'flag_for_moderator' ||
            unsafeResult?.recommended_action === 'flag_for_moderator') {
            recommended_action = 'flag_for_moderator';
        } else if (bullyingResult?.recommended_action === 'monitor' ||
            unsafeResult?.recommended_action === 'monitor') {
            recommended_action = 'monitor';
        }

        return {
            risk_level,
            risk_score: maxRiskScore,
            summary,
            bullying: bullyingResult,
            unsafe: unsafeResult,
            recommended_action,
            ...(input.external_id && { external_id: input.external_id }),
            ...(input.customer_id && { customer_id: input.customer_id }),
            ...(input.metadata && { metadata: input.metadata }),
        };
    }

    // =========================================================================
    // Analysis Methods
    // =========================================================================

    /**
     * Analyze emotions in content or conversation
     *
     * @example
     * ```typescript
     * const result = await tuteliq.analyzeEmotions({
     *   content: "I'm so stressed about everything"
     * })
     *
     * console.log('Emotions:', result.dominant_emotions)
     * console.log('Trend:', result.trend)
     * ```
     */
    async analyzeEmotions(input: AnalyzeEmotionsInput): Promise<EmotionsResult> {
        if (input.content) {
            this.validateContent(input.content);
        } else if (input.messages) {
            this.validateMessages(input.messages);
        } else {
            throw new ValidationError('Either content or messages is required');
        }

        const body: Record<string, unknown> = {};

        if (input.content) {
            body.messages = [{ sender: 'user', text: input.content }];
        } else if (input.messages) {
            body.messages = input.messages.map(m => ({
                sender: m.sender,
                text: m.content,
            }));
        }

        if (input.context) {
            body.context = this.normalizeContext(input.context);
        }

        if (input.external_id) {
            body.external_id = input.external_id;
        }
        if (input.customer_id) {
            body.customer_id = input.customer_id;
        }
        if (input.metadata) {
            body.metadata = input.metadata;
        }

        return this.requestWithRetry<EmotionsResult>(
            'POST',
            '/api/v1/analysis/emotions',
            body
        );
    }

    // =========================================================================
    // Guidance Methods
    // =========================================================================

    /**
     * Get age-appropriate action guidance for a situation
     *
     * @example
     * ```typescript
     * const plan = await tuteliq.getActionPlan({
     *   situation: 'Someone is spreading rumors about me',
     *   childAge: 12,
     *   audience: 'child'
     * })
     *
     * console.log('Steps:', plan.steps)
     * ```
     */
    async getActionPlan(input: GetActionPlanInput): Promise<ActionPlanResult> {
        if (!input.situation || typeof input.situation !== 'string') {
            throw new ValidationError('Situation description is required');
        }
        this.validateContent(input.situation);

        return this.requestWithRetry<ActionPlanResult>(
            'POST',
            '/api/v1/guidance/action-plan',
            {
                role: input.audience || 'parent',
                situation: input.situation,
                child_age: input.childAge,
                severity: input.severity,
                ...(input.external_id && { external_id: input.external_id }),
                ...(input.customer_id && { customer_id: input.customer_id }),
                ...(input.metadata && { metadata: input.metadata }),
            }
        );
    }

    // =========================================================================
    // Report Methods
    // =========================================================================

    /**
     * Generate an incident report from messages
     *
     * @example
     * ```typescript
     * const report = await tuteliq.generateReport({
     *   messages: [
     *     { sender: 'user1', content: 'Harmful message' },
     *     { sender: 'child', content: 'Response' }
     *   ],
     *   childAge: 14
     * })
     *
     * console.log('Summary:', report.summary)
     * console.log('Risk:', report.risk_level)
     * console.log('Next steps:', report.recommended_next_steps)
     * ```
     */
    async generateReport(input: GenerateReportInput): Promise<ReportResult> {
        this.validateMessages(input.messages);

        return this.requestWithRetry<ReportResult>(
            'POST',
            '/api/v1/reports/incident',
            {
                messages: input.messages.map(m => ({
                    sender: m.sender,
                    text: m.content,
                })),
                meta: {
                    child_age: input.childAge,
                    ...input.incident,
                },
                ...(input.external_id && { external_id: input.external_id }),
                ...(input.customer_id && { customer_id: input.customer_id }),
                ...(input.metadata && { metadata: input.metadata }),
            }
        );
    }

    // =========================================================================
    // Policy Methods
    // =========================================================================

    /**
     * Get the current policy configuration
     *
     * @example
     * ```typescript
     * const policy = await tuteliq.getPolicy()
     * console.log('Bullying enabled:', policy.config?.bullying.enabled)
     * ```
     */
    async getPolicy(): Promise<PolicyConfigResponse> {
        return this.requestWithRetry<PolicyConfigResponse>(
            'GET',
            '/api/v1/policy'
        );
    }

    /**
     * Update the policy configuration
     *
     * @example
     * ```typescript
     * await tuteliq.setPolicy({
     *   bullying: {
     *     enabled: true,
     *     minRiskScoreToFlag: 0.5
     *   }
     * })
     * ```
     */
    async setPolicy(config: PolicyConfig): Promise<PolicyConfigResponse> {
        return this.requestWithRetry<PolicyConfigResponse>(
            'PUT',
            '/api/v1/policy',
            { config }
        );
    }

    // =========================================================================
    // Batch Methods
    // =========================================================================

    /**
     * Analyze multiple items in a single batch request
     *
     * @example
     * ```typescript
     * const result = await tuteliq.batch({
     *   items: [
     *     { type: 'bullying', content: 'Message 1' },
     *     { type: 'unsafe', content: 'Message 2' },
     *   ],
     *   parallel: true
     * })
     *
     * console.log('Success:', result.summary.successful)
     * console.log('Failed:', result.summary.failed)
     * ```
     */
    async batch(input: BatchAnalyzeInput): Promise<BatchAnalyzeResult> {
        if (!input.items || input.items.length === 0) {
            throw new ValidationError('Items array is required and cannot be empty');
        }
        if (input.items.length > 25) {
            throw new ValidationError('Maximum 25 items per batch request');
        }

        return this.requestWithRetry<BatchAnalyzeResult>(
            'POST',
            '/api/v1/batch/analyze',
            {
                items: input.items.map(item => {
                    if (item.type === 'grooming') {
                        return {
                            type: item.type,
                            messages: item.messages.map(m => ({
                                sender_role: m.role,
                                text: m.content,
                            })),
                            context: {
                                ...(item.childAge != null && { child_age: item.childAge }),
                                ...this.normalizeContext(item.context),
                            },
                            external_id: item.external_id,
                        };
                    }
                    return {
                        type: item.type,
                        text: item.content,
                        context: this.normalizeContext(item.context),
                        external_id: item.external_id,
                    };
                }),
                options: {
                    parallel: input.parallel ?? true,
                    continue_on_error: input.continueOnError ?? true,
                },
            }
        );
    }

    // =========================================================================
    // Usage Methods
    // =========================================================================

    /**
     * Get usage summary for the current billing period
     *
     * @example
     * ```typescript
     * const summary = await tuteliq.getUsageSummary()
     * console.log('Used:', summary.messages_used)
     * console.log('Limit:', summary.message_limit)
     * console.log('Percent:', summary.usage_percentage)
     * ```
     */
    async getUsageSummary(): Promise<UsageSummary> {
        return this.requestWithRetry<UsageSummary>(
            'GET',
            '/api/v1/usage/summary'
        );
    }

    /**
     * Get current rate limit quota status
     *
     * @example
     * ```typescript
     * const quota = await tuteliq.getQuota()
     * console.log('Rate limit:', quota.rate_limit)
     * console.log('Remaining this minute:', quota.remaining)
     * ```
     */
    async getQuota(): Promise<UsageQuota> {
        return this.requestWithRetry<UsageQuota>(
            'GET',
            '/api/v1/usage/quota'
        );
    }

    // =========================================================================
    // Account Management (GDPR)
    // =========================================================================

    /**
     * Delete all data associated with your account (GDPR Article 17 — Right to Erasure)
     *
     * This permanently deletes all user data including API keys, usage logs,
     * incidents, emotional records, grooming assessments, and safety goals.
     *
     * @example
     * ```typescript
     * const result = await tuteliq.deleteAccountData()
     * console.log(result.message)        // "All user data has been deleted"
     * console.log(result.deleted_count)  // 42
     * ```
     */
    async deleteAccountData(): Promise<AccountDeletionResult> {
        return this.requestWithRetry<AccountDeletionResult>(
            'DELETE',
            '/api/v1/account/data'
        );
    }

    /**
     * Export all data associated with your account (GDPR Article 20 — Right to Data Portability)
     *
     * Returns a JSON export of all stored data grouped by collection.
     *
     * @example
     * ```typescript
     * const data = await tuteliq.exportAccountData()
     * console.log(data.userId)
     * console.log(data.exportedAt)
     * console.log(Object.keys(data.data))  // ['api_keys', 'incidents', ...]
     * ```
     */
    async exportAccountData(): Promise<AccountExportResult> {
        return this.requestWithRetry<AccountExportResult>(
            'GET',
            '/api/v1/account/export'
        );
    }

    /**
     * Record user consent (GDPR Article 7)
     *
     * Creates an immutable consent record for audit trail.
     *
     * @example
     * ```typescript
     * const result = await tuteliq.recordConsent({
     *   consent_type: 'child_safety_monitoring',
     *   version: '1.0'
     * })
     * ```
     */
    async recordConsent(input: RecordConsentInput): Promise<ConsentActionResult> {
        return this.requestWithRetry<ConsentActionResult>(
            'POST',
            '/api/v1/account/consent',
            input
        );
    }

    /**
     * Get current consent status (GDPR Article 7)
     *
     * Returns the latest consent record per type.
     *
     * @example
     * ```typescript
     * // Get all consent statuses
     * const all = await tuteliq.getConsentStatus()
     *
     * // Get specific consent type
     * const monitoring = await tuteliq.getConsentStatus('child_safety_monitoring')
     * ```
     */
    async getConsentStatus(type?: ConsentType): Promise<ConsentStatusResult> {
        const query = type ? `?type=${type}` : '';
        return this.requestWithRetry<ConsentStatusResult>(
            'GET',
            `/api/v1/account/consent${query}`
        );
    }

    /**
     * Withdraw consent (GDPR Article 7.3)
     *
     * Creates a withdrawal record. Does not delete consent history.
     *
     * @example
     * ```typescript
     * const result = await tuteliq.withdrawConsent('marketing')
     * ```
     */
    async withdrawConsent(type: ConsentType): Promise<ConsentActionResult> {
        return this.requestWithRetry<ConsentActionResult>(
            'DELETE',
            `/api/v1/account/consent/${type}`
        );
    }

    /**
     * Rectify user data (GDPR Article 16 — Right to Rectification)
     *
     * Updates allowlisted fields on a specific document.
     *
     * @example
     * ```typescript
     * const result = await tuteliq.rectifyData({
     *   collection: 'incidents',
     *   document_id: 'abc123',
     *   fields: { summary: 'Corrected summary' }
     * })
     * ```
     */
    async rectifyData(input: RectifyDataInput): Promise<RectifyDataResult> {
        return this.requestWithRetry<RectifyDataResult>(
            'PATCH',
            '/api/v1/account/data',
            input
        );
    }

    /**
     * Get audit logs (GDPR Article 15 — Right of Access)
     *
     * Returns the user's audit trail of all data operations.
     *
     * @example
     * ```typescript
     * // Get all audit logs
     * const logs = await tuteliq.getAuditLogs()
     *
     * // Filter by action
     * const exports = await tuteliq.getAuditLogs({ action: 'data_export', limit: 10 })
     * ```
     */
    async getAuditLogs(options?: GetAuditLogsOptions): Promise<AuditLogsResult> {
        const params = new URLSearchParams();
        if (options?.action) params.set('action', options.action);
        if (options?.limit) params.set('limit', String(options.limit));
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.requestWithRetry<AuditLogsResult>(
            'GET',
            `/api/v1/account/audit-logs${query}`
        );
    }

    // =========================================================================
    // Breach Management (GDPR Article 33/34)
    // =========================================================================

    /**
     * Log a new data breach
     *
     * @example
     * ```typescript
     * const result = await tuteliq.logBreach({
     *   title: 'Unauthorized access to user data',
     *   description: 'A third-party service exposed user emails',
     *   severity: 'high',
     *   affected_user_ids: ['user-1', 'user-2'],
     *   data_categories: ['email', 'name'],
     *   reported_by: 'security-team'
     * })
     * ```
     */
    async logBreach(input: LogBreachInput): Promise<LogBreachResult> {
        return this.requestWithRetry<LogBreachResult>(
            'POST',
            '/api/v1/admin/breach',
            input
        );
    }

    /**
     * List data breaches
     *
     * @example
     * ```typescript
     * // List all breaches
     * const all = await tuteliq.listBreaches()
     *
     * // Filter by status
     * const active = await tuteliq.listBreaches({ status: 'investigating', limit: 10 })
     * ```
     */
    async listBreaches(options?: GetBreachesOptions): Promise<BreachListResult> {
        const params = new URLSearchParams();
        if (options?.status) params.set('status', options.status);
        if (options?.limit) params.set('limit', String(options.limit));
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.requestWithRetry<BreachListResult>(
            'GET',
            `/api/v1/admin/breach${query}`
        );
    }

    /**
     * Get a single breach by ID
     *
     * @example
     * ```typescript
     * const result = await tuteliq.getBreach('breach-123')
     * console.log(result.breach.status)
     * ```
     */
    async getBreach(id: string): Promise<BreachResult> {
        return this.requestWithRetry<BreachResult>(
            'GET',
            `/api/v1/admin/breach/${id}`
        );
    }

    /**
     * Update a breach's status and notification status
     *
     * @example
     * ```typescript
     * const result = await tuteliq.updateBreachStatus('breach-123', {
     *   status: 'contained',
     *   notification_status: 'users_notified',
     *   notes: 'All affected users have been notified via email'
     * })
     * ```
     */
    async updateBreachStatus(id: string, input: UpdateBreachInput): Promise<BreachResult> {
        return this.requestWithRetry<BreachResult>(
            'PATCH',
            `/api/v1/admin/breach/${id}`,
            input
        );
    }

    // =========================================================================
    // Media Analysis Methods
    // =========================================================================

    /**
     * Analyze voice/audio for safety concerns
     *
     * Transcribes the audio via Whisper, then runs safety analysis on the transcript.
     *
     * @example
     * ```typescript
     * import { readFileSync } from 'fs'
     *
     * const result = await tuteliq.analyzeVoice({
     *   file: readFileSync('recording.mp3'),
     *   filename: 'recording.mp3',
     *   analysisType: 'all'
     * })
     *
     * console.log('Transcript:', result.transcription.text)
     * console.log('Risk:', result.overall_severity)
     * ```
     */
    async analyzeVoice(input: AnalyzeVoiceInput): Promise<VoiceAnalysisResult> {
        if (!input.file) {
            throw new ValidationError('Audio file is required');
        }
        if (!input.filename) {
            throw new ValidationError('Filename is required');
        }

        const formData = new FormData();

        if (Buffer.isBuffer(input.file)) {
            formData.append('file', new Blob([input.file as unknown as BlobPart]), input.filename);
        } else {
            formData.append('file', input.file, input.filename);
        }

        if (input.analysisType) formData.append('analysis_type', input.analysisType);
        if (input.fileId) formData.append('file_id', input.fileId);
        if (input.external_id) formData.append('external_id', input.external_id);
        if (input.customer_id) formData.append('customer_id', input.customer_id);
        if (input.ageGroup) formData.append('age_group', input.ageGroup);
        if (input.language) formData.append('language', input.language);
        formData.append('platform', Tuteliq.resolvePlatform(input.platform));
        if (input.childAge != null) formData.append('child_age', String(input.childAge));
        if (input.metadata) formData.append('metadata', JSON.stringify(input.metadata));

        return withRetry(
            () => this.multipartRequest<VoiceAnalysisResult>(
                '/api/v1/safety/voice',
                formData
            ),
            { maxRetries: this.retries, initialDelay: this.retryDelay }
        );
    }

    /**
     * Analyze an image for safety concerns
     *
     * Uses vision AI for visual content classification and OCR text extraction,
     * then runs safety analysis on any extracted text.
     *
     * @example
     * ```typescript
     * import { readFileSync } from 'fs'
     *
     * const result = await tuteliq.analyzeImage({
     *   file: readFileSync('screenshot.png'),
     *   filename: 'screenshot.png',
     *   analysisType: 'all'
     * })
     *
     * console.log('Visual:', result.vision.visual_description)
     * console.log('OCR text:', result.vision.extracted_text)
     * console.log('Risk:', result.overall_severity)
     * ```
     */
    async analyzeImage(input: AnalyzeImageInput): Promise<ImageAnalysisResult> {
        if (!input.file) {
            throw new ValidationError('Image file is required');
        }
        if (!input.filename) {
            throw new ValidationError('Filename is required');
        }

        const formData = new FormData();

        if (Buffer.isBuffer(input.file)) {
            formData.append('file', new Blob([input.file as unknown as BlobPart]), input.filename);
        } else {
            formData.append('file', input.file, input.filename);
        }

        if (input.analysisType) formData.append('analysis_type', input.analysisType);
        if (input.fileId) formData.append('file_id', input.fileId);
        if (input.external_id) formData.append('external_id', input.external_id);
        if (input.customer_id) formData.append('customer_id', input.customer_id);
        if (input.ageGroup) formData.append('age_group', input.ageGroup);
        formData.append('platform', Tuteliq.resolvePlatform(input.platform));
        if (input.metadata) formData.append('metadata', JSON.stringify(input.metadata));

        return withRetry(
            () => this.multipartRequest<ImageAnalysisResult>(
                '/api/v1/safety/image',
                formData
            ),
            { maxRetries: this.retries, initialDelay: this.retryDelay }
        );
    }

    // =========================================================================
    // Fraud Detection Methods
    // =========================================================================

    /**
     * Detect social engineering tactics (pretexting, impersonation, urgency, authority exploitation)
     */
    async detectSocialEngineering(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/fraud/social-engineering',
            this.buildDetectionBody(input)
        );
    }

    /**
     * Detect app-based fraud (fake apps, malicious downloads, clone apps, fraudulent reviews)
     */
    async detectAppFraud(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/fraud/app-fraud',
            this.buildDetectionBody(input)
        );
    }

    /**
     * Detect romance scam patterns (love-bombing, financial requests, identity fabrication)
     */
    async detectRomanceScam(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/fraud/romance-scam',
            this.buildDetectionBody(input)
        );
    }

    /**
     * Detect money mule recruitment (easy money offers, account sharing, laundering language)
     */
    async detectMuleRecruitment(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/fraud/mule-recruitment',
            this.buildDetectionBody(input)
        );
    }

    // =========================================================================
    // Safety Extended Methods
    // =========================================================================

    /**
     * Detect gambling harm (underage gambling, addiction patterns, predatory odds)
     */
    async detectGamblingHarm(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/safety/gambling-harm',
            this.buildDetectionBody(input)
        );
    }

    /**
     * Detect coercive control patterns (isolation, financial control, surveillance, threats)
     */
    async detectCoerciveControl(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/safety/coercive-control',
            this.buildDetectionBody(input)
        );
    }

    /**
     * Detect vulnerability exploitation with cross-endpoint vulnerability modifier
     */
    async detectVulnerabilityExploitation(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/safety/vulnerability-exploitation',
            this.buildDetectionBody(input)
        );
    }

    /**
     * Detect radicalisation indicators (extremist rhetoric, recruitment patterns, dehumanisation)
     */
    async detectRadicalisation(input: DetectionInput): Promise<DetectionResult> {
        this.validateContent(input.content);
        return this.requestWithRetry<DetectionResult>(
            'POST', '/api/v1/safety/radicalisation',
            this.buildDetectionBody(input)
        );
    }

    // =========================================================================
    // Multi-Endpoint Analysis
    // =========================================================================

    /**
     * Run multiple detection endpoints on a single piece of content.
     *
     * When vulnerability-exploitation is included, its cross-endpoint modifier
     * automatically adjusts severity scores across all other results.
     *
     * @example
     * ```typescript
     * const result = await tuteliq.analyseMulti({
     *   content: "Suspicious message content",
     *   detections: ['social-engineering', 'romance-scam', 'grooming'],
     * })
     *
     * console.log('Highest risk:', result.summary.highest_risk)
     * console.log('Modifier:', result.cross_endpoint_modifier)
     * ```
     */
    async analyseMulti(input: AnalyseMultiInput): Promise<AnalyseMultiResult> {
        this.validateContent(input.content);

        if (!input.detections || input.detections.length === 0) {
            throw new ValidationError('At least one detection endpoint is required');
        }
        if (input.detections.length > 10) {
            throw new ValidationError('Maximum 10 detection endpoints per request');
        }

        return this.requestWithRetry<AnalyseMultiResult>(
            'POST', '/api/v1/analyse/multi',
            {
                text: input.content,
                endpoints: input.detections,
                context: this.normalizeContext(input.context),
                ...(input.includeEvidence && { options: { include_evidence: true } }),
                ...(input.external_id && { external_id: input.external_id }),
                ...(input.customer_id && { customer_id: input.customer_id }),
                ...(input.metadata && { metadata: input.metadata }),
            }
        );
    }

    // =========================================================================
    // Video Analysis
    // =========================================================================

    /**
     * Analyze video content for safety concerns.
     *
     * Extracts frames and analyzes them for harmful visual content.
     * Supported formats: mp4, webm, quicktime, x-msvideo.
     *
     * @example
     * ```typescript
     * import { readFileSync } from 'fs'
     *
     * const result = await tuteliq.analyzeVideo({
     *   file: readFileSync('clip.mp4'),
     *   filename: 'clip.mp4',
     * })
     *
     * console.log('Frames analyzed:', result.frames_analyzed)
     * console.log('Risk:', result.overall_severity)
     * ```
     */
    async analyzeVideo(input: AnalyzeVideoInput): Promise<VideoAnalysisResult> {
        if (!input.file) {
            throw new ValidationError('Video file is required');
        }
        if (!input.filename) {
            throw new ValidationError('Filename is required');
        }

        const formData = new FormData();

        if (Buffer.isBuffer(input.file)) {
            formData.append('file', new Blob([input.file as unknown as BlobPart]), input.filename);
        } else {
            formData.append('file', input.file, input.filename);
        }

        if (input.fileId) formData.append('file_id', input.fileId);
        if (input.external_id) formData.append('external_id', input.external_id);
        if (input.customer_id) formData.append('customer_id', input.customer_id);
        if (input.ageGroup) formData.append('age_group', input.ageGroup);
        formData.append('platform', Tuteliq.resolvePlatform(input.platform));
        if (input.metadata) formData.append('metadata', JSON.stringify(input.metadata));

        return withRetry(
            () => this.multipartRequest<VideoAnalysisResult>(
                '/api/v1/safety/video',
                formData
            ),
            { maxRetries: this.retries, initialDelay: this.retryDelay }
        );
    }

    // =========================================================================
    // Webhook Methods
    // =========================================================================

    /**
     * List all webhooks for your account
     *
     * @example
     * ```typescript
     * const { webhooks } = await tuteliq.listWebhooks()
     * webhooks.forEach(w => console.log(w.name, w.is_active))
     * ```
     */
    async listWebhooks(): Promise<WebhookListResult> {
        return this.requestWithRetry<WebhookListResult>(
            'GET',
            '/api/v1/webhooks'
        );
    }

    /**
     * Create a new webhook
     *
     * The returned `secret` is only shown once — store it securely for
     * signature verification.
     *
     * @example
     * ```typescript
     * import { WebhookEventType } from '@tuteliq/sdk'
     *
     * const result = await tuteliq.createWebhook({
     *   name: 'Safety Alerts',
     *   url: 'https://example.com/webhooks/tuteliq',
     *   events: [WebhookEventType.INCIDENT_CRITICAL, WebhookEventType.GROOMING_DETECTED]
     * })
     *
     * console.log('Secret:', result.secret) // Store this securely!
     * ```
     */
    async createWebhook(input: CreateWebhookInput): Promise<CreateWebhookResult> {
        return this.requestWithRetry<CreateWebhookResult>(
            'POST',
            '/api/v1/webhooks',
            {
                name: input.name,
                url: input.url,
                events: input.events,
                ...(input.headers && { headers: input.headers }),
            }
        );
    }

    /**
     * Update an existing webhook
     *
     * @example
     * ```typescript
     * const result = await tuteliq.updateWebhook('webhook-123', {
     *   name: 'Updated Name',
     *   isActive: false
     * })
     * ```
     */
    async updateWebhook(id: string, input: UpdateWebhookInput): Promise<UpdateWebhookResult> {
        return this.requestWithRetry<UpdateWebhookResult>(
            'PUT',
            `/api/v1/webhooks/${id}`,
            {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.url !== undefined && { url: input.url }),
                ...(input.events !== undefined && { events: input.events }),
                ...(input.isActive !== undefined && { is_active: input.isActive }),
                ...(input.headers !== undefined && { headers: input.headers }),
            }
        );
    }

    /**
     * Delete a webhook
     *
     * @example
     * ```typescript
     * await tuteliq.deleteWebhook('webhook-123')
     * ```
     */
    async deleteWebhook(id: string): Promise<DeleteWebhookResult> {
        return this.requestWithRetry<DeleteWebhookResult>(
            'DELETE',
            `/api/v1/webhooks/${id}`
        );
    }

    /**
     * Send a test payload to a webhook
     *
     * @example
     * ```typescript
     * const result = await tuteliq.testWebhook('webhook-123')
     * console.log('Success:', result.success)
     * console.log('Latency:', result.latency_ms, 'ms')
     * ```
     */
    async testWebhook(id: string): Promise<TestWebhookResult> {
        return this.requestWithRetry<TestWebhookResult>(
            'POST',
            '/api/v1/webhooks/test',
            { webhook_id: id }
        );
    }

    /**
     * Regenerate a webhook's signing secret
     *
     * The old secret is immediately invalidated.
     *
     * @example
     * ```typescript
     * const { secret } = await tuteliq.regenerateWebhookSecret('webhook-123')
     * // Update your verification logic with the new secret
     * ```
     */
    async regenerateWebhookSecret(id: string): Promise<RegenerateSecretResult> {
        return this.requestWithRetry<RegenerateSecretResult>(
            'POST',
            `/api/v1/webhooks/${id}/regenerate-secret`
        );
    }

    // =========================================================================
    // Pricing Methods
    // =========================================================================

    /**
     * Get public pricing plans (no authentication required)
     *
     * @example
     * ```typescript
     * const { plans } = await tuteliq.getPricing()
     * plans.forEach(p => console.log(p.name, p.price))
     * ```
     */
    async getPricing(): Promise<PricingResult> {
        return this.requestWithRetry<PricingResult>(
            'GET',
            '/api/v1/pricing'
        );
    }

    /**
     * Get detailed pricing plans with monthly/yearly prices
     *
     * @example
     * ```typescript
     * const { plans } = await tuteliq.getPricingDetails()
     * plans.forEach(p => console.log(p.name, p.price_monthly, p.api_calls_per_month))
     * ```
     */
    async getPricingDetails(): Promise<PricingDetailsResult> {
        return this.requestWithRetry<PricingDetailsResult>(
            'GET',
            '/api/v1/pricing/details'
        );
    }

    // =========================================================================
    // Additional Usage Methods
    // =========================================================================

    /**
     * Get usage history for the past N days
     *
     * @param days - Number of days (1-30, defaults to 7)
     *
     * @example
     * ```typescript
     * const { days } = await tuteliq.getUsageHistory(14)
     * days.forEach(d => console.log(d.date, d.total_requests))
     * ```
     */
    async getUsageHistory(days?: number): Promise<UsageHistoryResult> {
        const params = new URLSearchParams();
        if (days != null) params.set('days', String(days));
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.requestWithRetry<UsageHistoryResult>(
            'GET',
            `/api/v1/usage/history${query}`
        );
    }

    /**
     * Get usage broken down by tool/endpoint
     *
     * @param date - Date in YYYY-MM-DD format (defaults to today)
     *
     * @example
     * ```typescript
     * const result = await tuteliq.getUsageByTool()
     * console.log('Tools:', result.tools)
     * console.log('Endpoints:', result.endpoints)
     * ```
     */
    async getUsageByTool(date?: string): Promise<UsageByToolResult> {
        const params = new URLSearchParams();
        if (date) params.set('date', date);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.requestWithRetry<UsageByToolResult>(
            'GET',
            `/api/v1/usage/by-tool${query}`
        );
    }

    /**
     * Get monthly usage, limits, and upgrade recommendations
     *
     * @example
     * ```typescript
     * const monthly = await tuteliq.getUsageMonthly()
     * console.log('Used:', monthly.usage.used, '/', monthly.usage.limit)
     * console.log('Days left:', monthly.billing.days_remaining)
     *
     * if (monthly.recommendations?.should_upgrade) {
     *   console.log('Consider upgrading to', monthly.recommendations.suggested_tier)
     * }
     * ```
     */
    async getUsageMonthly(): Promise<UsageMonthlyResult> {
        return this.requestWithRetry<UsageMonthlyResult>(
            'GET',
            '/api/v1/usage/monthly'
        );
    }

    // =========================================================================
    // Voice Streaming
    // =========================================================================

    /**
     * Open a real-time voice streaming session over WebSocket.
     *
     * Requires the `ws` package as an optional peer dependency:
     * ```bash
     * npm install ws
     * ```
     *
     * @example
     * ```typescript
     * const session = client.voiceStream(
     *   { intervalSeconds: 10, analysisTypes: ['bullying', 'unsafe'] },
     *   {
     *     onTranscription: (e) => console.log('Transcript:', e.text),
     *     onAlert: (e) => console.log('Alert:', e.category, e.severity),
     *   }
     * );
     *
     * // Send audio chunks as they arrive
     * session.sendAudio(audioBuffer);
     *
     * // End session and get summary
     * const summary = await session.end();
     * console.log('Risk:', summary.overall_risk);
     * ```
     */
    voiceStream(
        config?: VoiceStreamConfig,
        handlers?: VoiceStreamHandlers,
    ): VoiceStreamSession {
        return createVoiceStream(this.apiKey, config, handlers);
    }
}

// Legacy export for backwards compatibility
export { Tuteliq as TuteliqClient };
