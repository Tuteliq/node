import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import {
    AuthenticationError,
    RateLimitError,
    ValidationError,
    ServerError,
    TimeoutError,
} from '../src/errors.js';
import { VerificationMode, DocumentType, VerificationSessionStatus, VerificationStatus } from '../src/constants.js';

// Helper to create mock response
function mockFetchResponse(data: unknown, options: { ok?: boolean; status?: number; headers?: Record<string, string> } = {}) {
    const { ok = true, status = 200, headers = {} } = options;
    return {
        ok,
        status,
        json: async () => data,
        headers: {
            get: (name: string) => headers[name.toLowerCase()] || null,
        },
    } as Response;
}

const API_BASE_URL = 'https://api.tuteliq.ai';

describe('Tuteliq', () => {
    let tuteliq: Tuteliq;

    beforeEach(() => {
        tuteliq = new Tuteliq('test-api-key-12345', {
            timeout: 5000,
            retries: 0, // Disable retries for tests
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should throw error if API key is missing', () => {
            expect(() => new Tuteliq('')).toThrow('API key is required');
        });

        it('should accept simple API key string', () => {
            const client = new Tuteliq('my-api-key');
            expect(client).toBeInstanceOf(Tuteliq);
        });

        it('should accept API key with options', () => {
            const client = new Tuteliq('my-api-key', { timeout: 10000 });
            expect(client).toBeInstanceOf(Tuteliq);
        });

        it('should accept options without baseUrl', () => {
            const client = new Tuteliq('test-api-key-12345', { timeout: 15000 });
            expect(client).toBeInstanceOf(Tuteliq);
        });

        it('should reject API key that is too short', () => {
            expect(() => new Tuteliq('short')).toThrow('too short');
        });

        it('should reject invalid timeout', () => {
            expect(() => new Tuteliq('valid-api-key-12345', { timeout: 500 }))
                .toThrow('Timeout must be between');
        });

        it('should reject invalid retries', () => {
            expect(() => new Tuteliq('valid-api-key-12345', { retries: 15 }))
                .toThrow('Retries must be between');
        });
    });

    describe('detectBullying', () => {
        it('should make POST request with content', async () => {
            const mockResponse = {
                is_bullying: true,
                bullying_type: ['verbal_abuse'],
                confidence: 0.85,
                severity: 'medium',
                rationale: 'Test rationale',
                recommended_action: 'monitor',
                risk_score: 0.7,
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.detectBullying({
                content: 'test message',
                context: 'chat',
            });

            expect(result).toEqual(mockResponse);
            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/safety/bullying`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-api-key-12345',
                    }),
                })
            );
        });

        it('should normalize string context to platform', async () => {
            const mockResponse = { is_bullying: false };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            await tuteliq.detectBullying({
                content: 'hello',
                context: 'chat',
            });

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.context).toEqual({ platform: 'chat - Node SDK' });
        });

        it('should pass object context with SDK platform appended', async () => {
            const mockResponse = { is_bullying: false };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            await tuteliq.detectBullying({
                content: 'hello',
                context: { ageGroup: '11-13', relationship: 'classmates' },
            });

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.context).toEqual({ ageGroup: '11-13', relationship: 'classmates', platform: 'Node SDK' });
        });
    });

    describe('detectGrooming', () => {
        it('should transform messages to API format', async () => {
            const mockResponse = {
                grooming_risk: 'high',
                confidence: 0.9,
                flags: ['secret_keeping'],
                rationale: 'Test rationale',
                risk_score: 0.85,
                recommended_action: 'immediate_review',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.detectGrooming({
                messages: [
                    { role: 'adult', content: 'Keep this secret' },
                    { role: 'child', content: 'Ok' },
                ],
                childAge: 12,
            });

            expect(result.grooming_risk).toBe('high');

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.messages[0]).toEqual({ sender_role: 'adult', text: 'Keep this secret' });
            expect(body.context.child_age).toBe(12);
        });
    });

    describe('detectUnsafe', () => {
        it('should detect unsafe content', async () => {
            const mockResponse = {
                unsafe: true,
                categories: ['self_harm'],
                severity: 'critical',
                confidence: 0.95,
                risk_score: 0.9,
                rationale: 'Test rationale',
                recommended_action: 'immediate_intervention',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.detectUnsafe({
                content: 'harmful content',
            });

            expect(result.unsafe).toBe(true);
            expect(result.categories).toContain('self_harm');
        });
    });

    describe('analyze', () => {
        it('should accept simple string content', async () => {
            const bullyingResponse = { is_bullying: false, risk_score: 0.1 };
            const unsafeResponse = { unsafe: false, risk_score: 0.1 };

            vi.spyOn(global, 'fetch')
                .mockResolvedValueOnce(mockFetchResponse(bullyingResponse))
                .mockResolvedValueOnce(mockFetchResponse(unsafeResponse));

            const result = await tuteliq.analyze('test message');

            expect(result.risk_level).toBe('safe');
            expect(result.risk_score).toBeLessThan(0.3);
        });

        it('should combine bullying and unsafe results', async () => {
            const bullyingResponse = {
                is_bullying: true,
                severity: 'high',
                risk_score: 0.8,
                recommended_action: 'flag_for_review',
            };
            const unsafeResponse = {
                unsafe: false,
                categories: [],
                risk_score: 0.2,
                recommended_action: 'none',
            };

            vi.spyOn(global, 'fetch')
                .mockResolvedValueOnce(mockFetchResponse(bullyingResponse))
                .mockResolvedValueOnce(mockFetchResponse(unsafeResponse));

            const result = await tuteliq.analyze('test message');

            expect(result.risk_level).toBe('high');
            expect(result.risk_score).toBe(0.8);
            expect(result.summary).toContain('Bullying detected');
            expect(result.recommended_action).toBe('flag_for_review');
        });

        // Regression: this assertion previously used `flag_for_moderator`, a
        // value the API has never emitted, so the aggregation silently resolved
        // to `none` for every real moderator-worthy verdict. Older deployments
        // may still send the legacy spelling during a rollout, so it must be
        // mapped rather than dropped.
        it('maps the legacy flag_for_moderator spelling', async () => {
            vi.spyOn(global, 'fetch')
                .mockResolvedValueOnce(mockFetchResponse({
                    is_bullying: true,
                    severity: 'high',
                    risk_score: 0.8,
                    recommended_action: 'flag_for_moderator',
                }))
                .mockResolvedValueOnce(mockFetchResponse({
                    unsafe: false,
                    categories: [],
                    risk_score: 0.2,
                    recommended_action: 'no_action',
                }));

            const result = await tuteliq.analyze('test message');

            expect(result.recommended_action).toBe('flag_for_review');
        });

        it('escalates rather than drops an unrecognised action', async () => {
            vi.spyOn(global, 'fetch')
                .mockResolvedValueOnce(mockFetchResponse({
                    is_bullying: true,
                    severity: 'high',
                    risk_score: 0.8,
                    recommended_action: 'some_future_verdict',
                }))
                .mockResolvedValueOnce(mockFetchResponse({
                    unsafe: false,
                    categories: [],
                    risk_score: 0.2,
                    recommended_action: 'none',
                }));

            const result = await tuteliq.analyze('test message');

            // fail towards a human, never towards silence
            expect(result.recommended_action).toBe('flag_for_review');
        });

        it('should return critical for very high risk scores', async () => {
            const bullyingResponse = { is_bullying: true, severity: 'critical', risk_score: 0.95 };
            const unsafeResponse = { unsafe: true, categories: ['self_harm'], risk_score: 0.92 };

            vi.spyOn(global, 'fetch')
                .mockResolvedValueOnce(mockFetchResponse(bullyingResponse))
                .mockResolvedValueOnce(mockFetchResponse(unsafeResponse));

            const result = await tuteliq.analyze({ content: 'test', include: ['bullying', 'unsafe'] });

            expect(result.risk_level).toBe('critical');
        });
    });

    describe('analyzeEmotions', () => {
        it('should analyze single content string', async () => {
            const mockResponse = {
                dominant_emotions: ['anxiety', 'stress'],
                emotion_scores: { anxiety: 0.8, stress: 0.7 },
                trend: 'worsening',
                summary: 'Test summary',
                recommended_followup: 'Test followup',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.analyzeEmotions({
                content: 'I feel stressed',
            });

            expect(result.dominant_emotions).toContain('anxiety');
            expect(result.trend).toBe('worsening');

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.messages).toEqual([{ sender: 'user', text: 'I feel stressed' }]);
        });

        it('should analyze message history', async () => {
            const mockResponse = {
                dominant_emotions: ['sadness'],
                emotion_scores: { sadness: 0.9 },
                trend: 'stable',
                summary: 'Test summary',
                recommended_followup: 'Test followup',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.analyzeEmotions({
                messages: [
                    { sender: 'child', content: 'I feel sad' },
                    { sender: 'child', content: 'Very sad' },
                ],
            });

            expect(result.dominant_emotions).toContain('sadness');

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.messages[0]).toEqual({ sender: 'child', text: 'I feel sad' });
        });
    });

    describe('getActionPlan', () => {
        it('should generate action plan', async () => {
            const mockResponse = {
                audience: 'child',
                steps: ['Step 1', 'Step 2'],
                tone: 'supportive',
                reading_level: 'grade_5',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.getActionPlan({
                situation: 'Someone is bullying me',
                childAge: 12,
                audience: 'child',
            });

            expect(result.audience).toBe('child');
            expect(result.steps.length).toBeGreaterThan(0);

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.role).toBe('child');
            expect(body.child_age).toBe(12);
        });

        it('should default audience to parent', async () => {
            const mockResponse = { audience: 'parent', steps: [], tone: 'calm' };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            await tuteliq.getActionPlan({ situation: 'test' });

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.role).toBe('parent');
        });
    });

    describe('generateReport', () => {
        it('should generate incident report', async () => {
            const mockResponse = {
                summary: 'Incident summary',
                risk_level: 'medium',
                categories: ['bullying'],
                recommended_next_steps: ['Document', 'Contact parent'],
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.generateReport({
                messages: [
                    { sender: 'user1', content: 'Harmful message' },
                    { sender: 'child', content: 'Stop' },
                ],
                childAge: 14,
            });

            expect(result.summary).toBe('Incident summary');
            expect(result.risk_level).toBe('medium');

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.messages[0]).toEqual({ sender: 'user1', text: 'Harmful message' });
            expect(body.meta.child_age).toBe(14);
        });
    });

    describe('policy methods', () => {
        it('should get policy configuration', async () => {
            const mockResponse = {
                success: true,
                config: { bullying: { enabled: true } },
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.getPolicy();

            expect(result.success).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/policy`,
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should set policy configuration', async () => {
            const mockResponse = { success: true };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            await tuteliq.setPolicy({
                bullying: { enabled: true, minRiskScoreToFlag: 0.5 },
            });

            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/policy`,
                expect.objectContaining({ method: 'PUT' })
            );
        });
    });

    describe('error handling', () => {
        it('should throw AuthenticationError on 401', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ error: { message: 'Invalid API key' } }, { ok: false, status: 401 })
            );

            await expect(tuteliq.detectBullying({ content: 'test' }))
                .rejects.toThrow(AuthenticationError);
        });

        it('should throw RateLimitError on 429', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ error: { message: 'Rate limit exceeded' } }, { ok: false, status: 429 })
            );

            await expect(tuteliq.detectBullying({ content: 'test' }))
                .rejects.toThrow(RateLimitError);
        });

        it('should throw ValidationError on 400', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ error: { message: 'Invalid input' } }, { ok: false, status: 400 })
            );

            await expect(tuteliq.detectBullying({ content: 'test' }))
                .rejects.toThrow(ValidationError);
        });

        it('should throw ServerError on 500', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ error: { message: 'Server error' } }, { ok: false, status: 500 })
            );

            await expect(tuteliq.detectBullying({ content: 'test' }))
                .rejects.toThrow(ServerError);
        });

        it('should throw TimeoutError when request aborts', async () => {
            vi.spyOn(global, 'fetch').mockRejectedValueOnce(
                Object.assign(new Error('Aborted'), { name: 'AbortError' })
            );

            await expect(tuteliq.detectBullying({ content: 'test' }))
                .rejects.toThrow(TimeoutError);
        });
    });

    describe('input validation', () => {
        it('should reject empty content', async () => {
            await expect(tuteliq.detectBullying({ content: '' }))
                .rejects.toThrow('Content is required');
        });

        it('should reject content exceeding max length', async () => {
            const longContent = 'a'.repeat(60000);
            await expect(tuteliq.detectBullying({ content: longContent }))
                .rejects.toThrow('exceeds maximum length');
        });

        it('should reject empty messages array', async () => {
            await expect(tuteliq.detectGrooming({ messages: [] }))
                .rejects.toThrow('cannot be empty');
        });

        it('should reject too many messages', async () => {
            const messages = Array(150).fill({ role: 'child', content: 'test' });
            await expect(tuteliq.detectGrooming({ messages }))
                .rejects.toThrow('exceeds maximum count');
        });

        it('should require content or messages for analyzeEmotions', async () => {
            await expect(tuteliq.analyzeEmotions({}))
                .rejects.toThrow('Either content or messages is required');
        });

        it('should require situation for getActionPlan', async () => {
            await expect(tuteliq.getActionPlan({ situation: '' }))
                .rejects.toThrow('Situation description is required');
        });
    });

    describe('verification', () => {
        it('should create an age verification session and map mobile_url to url', async () => {
            const mockResponse = {
                session_id: 'sess_abc123',
                mobile_url: 'https://verify.tuteliq.ai/age/?session=sess_abc123&token=tok_xyz789',
                expires_at: '2026-03-05T12:00:00Z',
                mode: 'age',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.createVerificationSession({ mode: VerificationMode.AGE });

            expect(result.session_id).toBe('sess_abc123');
            expect(result.url).toBe('https://verify.tuteliq.ai/age/?session=sess_abc123&token=tok_xyz789');
            expect(result.mode).toBe(VerificationMode.AGE);
            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/verify/session`,
                expect.objectContaining({ method: 'POST' })
            );

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.mode).toBe('age');
        });

        it('should create an identity verification session with options', async () => {
            const mockResponse = {
                session_id: 'sess_def456',
                mobile_url: 'https://verify.tuteliq.ai/identity/?session=sess_def456&token=tok_abc123',
                expires_at: '2026-03-05T12:00:00Z',
                mode: 'identity',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.createVerificationSession({
                mode: VerificationMode.IDENTITY,
                document_type: DocumentType.PASSPORT,
                redirect_url: 'https://example.com/done',
                external_id: 'ext_123',
                customer_id: 'cust_456',
                metadata: { source: 'onboarding' },
            });

            expect(result.mode).toBe(VerificationMode.IDENTITY);

            const call = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(call[1]?.body as string);
            expect(body.mode).toBe(VerificationMode.IDENTITY);
            expect(body.document_type).toBe(DocumentType.PASSPORT);
            expect(body.redirect_url).toBe('https://example.com/done');
            expect(body.external_id).toBe('ext_123');
            expect(body.customer_id).toBe('cust_456');
            expect(body.metadata).toEqual({ source: 'onboarding' });
        });

        it('should reject invalid verification mode', async () => {
            await expect(
                tuteliq.createVerificationSession({ mode: 'invalid' as VerificationMode })
            ).rejects.toThrow(ValidationError);
        });

        it('should get verification session status', async () => {
            const mockResponse = {
                session_id: 'sess_abc123',
                status: VerificationSessionStatus.COMPLETED,
                result: {
                    status: VerificationStatus.VERIFIED,
                    age: 25,
                    is_minor: false,
                },
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.getVerificationSession('sess_abc123');

            expect(result.status).toBe(VerificationSessionStatus.COMPLETED);
            expect(result.result).toBeDefined();
            expect((result.result as any)?.is_minor).toBe(false);
            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/verify/session/sess_abc123`,
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should reject empty session ID for get', async () => {
            await expect(tuteliq.getVerificationSession('')).rejects.toThrow('Session ID is required');
        });

        it('should cancel a verification session', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(undefined));

            await tuteliq.cancelVerificationSession('sess_abc123');

            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/verify/session/sess_abc123`,
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        it('should reject empty session ID for cancel', async () => {
            await expect(tuteliq.cancelVerificationSession('')).rejects.toThrow('Session ID is required');
        });

        it('should retrieve an age verification result', async () => {
            const mockResponse = {
                verification_id: 'vrf_001',
                status: VerificationStatus.VERIFIED,
                age: 22,
                is_minor: false,
                face_matched: true,
                face_confidence: 0.95,
                liveness_valid: true,
                failure_reasons: [],
                created_at: '2026-03-05T11:00:00Z',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.getAgeVerification('vrf_001');

            expect(result.status).toBe(VerificationStatus.VERIFIED);
            expect(result.is_minor).toBe(false);
            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/verify/age/vrf_001`,
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should reject empty verification ID for age', async () => {
            await expect(tuteliq.getAgeVerification('')).rejects.toThrow('Verification ID is required');
        });

        it('should retrieve an identity verification result', async () => {
            const mockResponse = {
                verification_id: 'vrf_002',
                status: VerificationStatus.VERIFIED,
                full_name: 'John Doe',
                date_of_birth: '1990-01-15',
                document_type: DocumentType.PASSPORT,
                country_code: 'US',
                face_matched: true,
                face_confidence: 0.92,
                liveness_valid: true,
                failure_reasons: [],
                created_at: '2026-03-05T11:00:00Z',
            };

            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockResponse));

            const result = await tuteliq.getIdentityVerification('vrf_002');

            expect(result.status).toBe(VerificationStatus.VERIFIED);
            expect(result.full_name).toBe('John Doe');
            expect(fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/api/v1/verify/identity/vrf_002`,
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should reject empty verification ID for identity', async () => {
            await expect(tuteliq.getIdentityVerification('')).rejects.toThrow('Verification ID is required');
        });
    });

    describe('usage tracking', () => {
        it('should capture usage from response headers', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse(
                    { is_bullying: false },
                    {
                        headers: {
                            'x-monthly-limit': '10000',
                            'x-monthly-used': '5000',
                            'x-monthly-remaining': '5000',
                            'x-ratelimit-limit': '1000',
                            'x-ratelimit-remaining': '999',
                            'x-request-id': 'req_123',
                        },
                    }
                )
            );

            await tuteliq.detectBullying({ content: 'test' });

            expect(tuteliq.usage).toEqual({
                limit: 10000,
                used: 5000,
                remaining: 5000,
            });
            expect(tuteliq.rateLimit).toEqual({
                limit: 1000,
                remaining: 999,
                reset: undefined,
            });
            expect(tuteliq.lastRequestId).toBe('req_123');
        });

        it('should track latency', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ is_bullying: false }));

            await tuteliq.detectBullying({ content: 'test' });

            expect(tuteliq.lastLatencyMs).toBeGreaterThanOrEqual(0);
        });
    });

    // =========================================================================
    // Document Analysis
    // =========================================================================

    describe('analyzeDocument', () => {
        const mockDocResult = {
            file_id: 'report.pdf',
            document_hash: 'sha256:abc123',
            total_pages: 5,
            pages_analyzed: 4,
            extraction_summary: { text_layer_pages: 4, ocr_pages: 0, failed_pages: 1, average_ocr_confidence: 0 },
            page_results: [
                {
                    page_number: 1,
                    text_preview: 'Page one content...',
                    extraction_method: 'text_layer',
                    results: [{ endpoint: 'unsafe', detected: false, severity: 0, confidence: 0.95, risk_score: 0, level: 'low', categories: [], evidence: [], recommended_action: 'none', rationale: 'Safe' }],
                    page_risk_score: 0,
                    page_severity: 'none',
                },
            ],
            overall_risk_score: 0,
            overall_severity: 'none',
            detected_endpoints: [],
            flagged_pages: [],
            credits_used: 12,
            processing_time_ms: 3200,
        };

        it('should send multipart request to /api/v1/safety/document', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockDocResult));

            const result = await tuteliq.analyzeDocument({
                file: Buffer.from('fake pdf'),
                filename: 'report.pdf',
            });

            expect(result.document_hash).toBe('sha256:abc123');
            expect(result.total_pages).toBe(5);
            expect(result.credits_used).toBe(12);

            const [url, opts] = fetchSpy.mock.calls[0];
            expect(url).toBe(`${API_BASE_URL}/api/v1/safety/document`);
            expect(opts?.method).toBe('POST');
            expect(opts?.body).toBeInstanceOf(FormData);
        });

        it('should pass endpoints as JSON array', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockDocResult));

            await tuteliq.analyzeDocument({
                file: Buffer.from('fake pdf'),
                filename: 'report.pdf',
                endpoints: ['unsafe', 'radicalisation'],
            });

            const body = fetchSpy.mock.calls[0][1]?.body as FormData;
            expect(body.get('endpoints')).toBe('["unsafe","radicalisation"]');
        });

        it('should pass optional fields', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(mockDocResult));

            await tuteliq.analyzeDocument({
                file: Buffer.from('fake pdf'),
                filename: 'report.pdf',
                fileId: 'my-file-123',
                ageGroup: '13-15',
                language: 'sv',
                supportThreshold: 'critical',
                external_id: 'ext-1',
                customer_id: 'cust-1',
                metadata: { source: 'test' },
            });

            const body = fetchSpy.mock.calls[0][1]?.body as FormData;
            expect(body.get('file_id')).toBe('my-file-123');
            expect(body.get('age_group')).toBe('13-15');
            expect(body.get('language')).toBe('sv');
            expect(body.get('support_threshold')).toBe('critical');
            expect(body.get('external_id')).toBe('ext-1');
            expect(body.get('customer_id')).toBe('cust-1');
            expect(body.get('metadata')).toBe('{"source":"test"}');
        });

        it('should throw ValidationError if file is missing', async () => {
            await expect(
                tuteliq.analyzeDocument({ file: null as any, filename: 'test.pdf' })
            ).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError if filename is missing', async () => {
            await expect(
                tuteliq.analyzeDocument({ file: Buffer.from('pdf'), filename: '' })
            ).rejects.toThrow(ValidationError);
        });

        it('should return flagged pages when threats detected', async () => {
            const flaggedResult = {
                ...mockDocResult,
                overall_risk_score: 0.85,
                overall_severity: 'critical',
                detected_endpoints: ['coercive-control'],
                flagged_pages: [{ page_number: 3, risk_score: 0.85, severity: 'critical', detected_endpoints: ['coercive-control'] }],
            };
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(flaggedResult));

            const result = await tuteliq.analyzeDocument({
                file: Buffer.from('fake pdf'),
                filename: 'report.pdf',
            });

            expect(result.flagged_pages).toHaveLength(1);
            expect(result.flagged_pages[0].page_number).toBe(3);
            expect(result.detected_endpoints).toContain('coercive-control');
        });
    });
});
