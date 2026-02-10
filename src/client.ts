import {
    SafeNestOptions,
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
} from './types/index.js';

import {
    SafeNestError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    NotFoundError,
    ServerError,
    TimeoutError,
    NetworkError,
} from './errors.js';

import { withRetry } from './utils/retry.js';

/** SafeNest API endpoint - locked to official server */
const API_BASE_URL = 'https://api.safenest.dev';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

// Input limits to prevent abuse
const MAX_CONTENT_LENGTH = 50000;  // 50KB max content
const MAX_MESSAGES_COUNT = 100;    // Max messages per request

/**
 * SafeNest - AI-powered child safety analysis
 *
 * @example
 * ```typescript
 * import { SafeNest } from '@safenest/sdk'
 *
 * const safenest = new SafeNest(process.env.SAFENEST_API_KEY)
 *
 * // Detect bullying
 * const result = await safenest.detectBullying({
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
 * console.log(safenest.usage) // { limit: 10000, used: 5234, remaining: 4766 }
 * ```
 */
export class SafeNest {
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
     * Create a new SafeNest client
     *
     * @param apiKey - Your SafeNest API key
     * @param options - Optional configuration
     *
     * @example
     * ```typescript
     * // Simple usage
     * const safenest = new SafeNest('your-api-key')
     *
     * // With options
     * const safenest = new SafeNest('your-api-key', {
     *   timeout: 10000
     * })
     * ```
     */
    constructor(apiKey: string, options: SafeNestOptions = {}) {
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

    /**
     * Normalize context input to API format
     */
    private normalizeContext(context?: ContextInput): Record<string, unknown> | undefined {
        if (!context) return undefined;
        if (typeof context === 'string') {
            return { platform: context };
        }
        return context;
    }

    /**
     * Make an authenticated request to the API
     */
    private async request<T>(
        method: 'GET' | 'POST' | 'PUT',
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

            if (error instanceof SafeNestError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
                }

                if (error.message.includes('fetch') || error.message.includes('network')) {
                    throw new NetworkError(error.message);
                }
            }

            throw new SafeNestError(
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
                throw new SafeNestError(message, status, details, { code, suggestion, links });
            case 404:
                throw new NotFoundError(message, { code, suggestion, links });
            case 429: {
                const retryAfter = headers.get('retry-after');
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
                throw new SafeNestError(message, status, details, { code, suggestion, links });
        }
    }

    /**
     * Make a request with retry logic
     */
    private async requestWithRetry<T>(
        method: 'GET' | 'POST' | 'PUT',
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

    // =========================================================================
    // Safety Detection Methods
    // =========================================================================

    /**
     * Detect bullying in content
     *
     * @example
     * ```typescript
     * const result = await safenest.detectBullying({
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
     * const result = await safenest.detectGrooming({
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
     * const result = await safenest.detectUnsafe({
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
     * const result = await safenest.analyze("Some user message")
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
     * const result = await safenest.analyzeEmotions({
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
     * const plan = await safenest.getActionPlan({
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
     * const report = await safenest.generateReport({
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
     * const policy = await safenest.getPolicy()
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
     * await safenest.setPolicy({
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
     * const result = await safenest.batch({
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
                items: input.items.map(item => ({
                    type: item.type,
                    text: item.content,
                    context: this.normalizeContext(item.context),
                    external_id: item.external_id,
                })),
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
     * const summary = await safenest.getUsageSummary()
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
     * const quota = await safenest.getQuota()
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
}

// Legacy export for backwards compatibility
export { SafeNest as SafeNestClient };
