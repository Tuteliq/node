import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tuteliq } from '../src/client.js';
import { ValidationError, NotFoundError, TierAccessError } from '../src/errors.js';
import { IncidentStatus as IncidentStatusEnum, RiskCategory as RiskCategoryEnum, RiskLevel } from '../src/constants.js';
import type {
    UsageSummary,
    UsageMonthlyResult,
    PricingPlan,
    ConsentRecord,
    AuditLogEntry,
    AuditReceiptPayload,
    IncidentSummaryRow,
    ReviewIncidentInput,
    BatchReviewIncidentsInput,
    ListIncidentsInput,
    ApiKeyQuota,
    ApiStatus,
    ComponentPing,
    DsaTransparencyReport,
    FleetResult,
    FleetDeviceResult,
} from '../src/types/index.js';

/**
 * Pins the account and platform types to the shapes the API sends.
 *
 * The fixtures below are typed with the SDK's own interfaces, so a field the
 * API sends that the type does not declare (or a stale field the type still
 * requires) fails `tsc`. The runtime assertions pin the request path and that
 * the response reaches the caller unchanged.
 */

function mockFetchResponse(
    data: unknown,
    options: { ok?: boolean; status?: number; headers?: Record<string, string>; text?: string } = {},
) {
    const { ok = true, status = 200, headers = {}, text } = options;
    return {
        ok,
        status,
        json: async () => data,
        text: async () => text ?? JSON.stringify(data),
        headers: {
            get: (name: string) => headers[name.toLowerCase()] || null,
        },
    } as Response;
}

describe('Tuteliq: account and platform', () => {
    let client: Tuteliq;

    beforeEach(() => {
        client = new Tuteliq('test-api-key', { timeout: 5000, retries: 0 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ---------------------------------------------------------------------
    // Usage
    // ---------------------------------------------------------------------

    describe('getUsageSummary', () => {
        const wire: UsageSummary = {
            apiKeyId: 'key_1',
            tier: 'build',
            date: '2026-11-07',
            usage: { totalRequests: 12, successRequests: 11, errorRequests: 1 },
            quota: { requestsPerMinute: 120, requestsPerMonth: 50000, requestsPerDay: -1, remainingToday: -1 },
        };

        it('returns the daily summary with nested usage and quota', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
            const summary = await client.getUsageSummary();
            expect(summary.usage.totalRequests).toBe(12);
            expect(summary.quota.remainingToday).toBe(-1);
        });

        it('passes the date as a query parameter', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
            await client.getUsageSummary('2026-11-07');
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/usage/summary?date=2026-11-07');
        });

        it('omits the query string without a date', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
            await client.getUsageSummary();
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/usage/summary');
        });
    });

    describe('getUsageMonthly', () => {
        it('carries the verification block on an enterprise verification plan', async () => {
            const wire: UsageMonthlyResult = {
                tier: 'enterprise',
                tier_display_name: 'Verification Enterprise',
                billing: { current_period_start: '2026-11-01', current_period_end: '2026-11-30', days_remaining: 22 },
                usage: { used: 40, limit: 1000, remaining: 960, percent_used: 4 },
                rate_limit: { requests_per_minute: 600 },
                recommendations: null,
                links: { dashboard: 'd', pricing: 'p', buy_credits: 'b' },
                verification: {
                    period: '2026-11',
                    usage_timezone: 'UTC',
                    next_period_start: '2026-12-01T00:00:00.000Z',
                    included_per_month: 1000,
                    included_used: 40,
                    pack_used: 0,
                    packs_remaining: 0,
                    remaining: 960,
                    limit_reached: false,
                    total: 38,
                    in_progress: 2,
                    sandbox_count: 5,
                    by_key: { key_1: { total: 38, sandbox: 5 } },
                },
            };
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
            const monthly = await client.getUsageMonthly();
            expect(monthly.verification?.in_progress).toBe(2);
            expect(monthly.verification?.by_key.key_1.sandbox).toBe(5);
        });
    });

    // ---------------------------------------------------------------------
    // Pricing, consent, audit logs: field names on the wire
    // ---------------------------------------------------------------------

    describe('getPricing', () => {
        it('reads isPopular and ctaLink as the API spells them', async () => {
            const plan: PricingPlan = {
                name: 'Build',
                price: '$99',
                period: '/month',
                description: 'For teams shipping',
                features: ['All detectors'],
                isPopular: true,
                cta: 'Start 14-day trial',
                ctaLink: 'https://tuteliq.ai/signup',
            };
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ plans: [plan] }));
            const { plans } = await client.getPricing();
            expect(plans[0].isPopular).toBe(true);
            expect(plans[0].ctaLink).toBe('https://tuteliq.ai/signup');
        });
    });

    describe('getConsentStatus', () => {
        it('reads userId and ip_hash as the API sends them', async () => {
            const record: ConsentRecord = {
                id: 'c1',
                userId: 'u1',
                consent_type: 'data_processing',
                status: 'granted',
                version: '1.0',
                ip_hash: 'abc',
                created_at: '2026-11-01T00:00:00.000Z',
            };
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ consents: [record] }));
            const { consents } = await client.getConsentStatus();
            expect(consents[0].userId).toBe('u1');
            expect(consents[0].ip_hash).toBe('abc');
        });
    });

    describe('getAuditLogs', () => {
        it('reads userId, string details and the encryption flag', async () => {
            const entry: AuditLogEntry = {
                id: 'a1',
                userId: 'u1',
                action: 'data_export',
                ip_hash: 'abc',
                user_agent: 'curl/8',
                details: 'ciphertext',
                _encrypted: true,
                created_at: '2026-11-01T00:00:00.000Z',
            };
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse({ audit_logs: [entry] }));
            const { audit_logs } = await client.getAuditLogs();
            expect(audit_logs[0].userId).toBe('u1');
            expect(audit_logs[0]._encrypted).toBe(true);
            expect(typeof audit_logs[0].details).toBe('string');
        });
    });

    describe('getApiKeyQuota', () => {
        it('hits GET /api/v1/account/api-keys/quota', async () => {
            const wire: ApiKeyQuota = {
                tier: 'enterprise',
                active_keys: 3,
                max_keys: 'unlimited',
                can_create: true,
                links: { upgrade: 'https://tuteliq.ai/dashboard/billing' },
            };
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
            const quota = await client.getApiKeyQuota();
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/account/api-keys/quota');
            expect(quota.max_keys).toBe('unlimited');
        });
    });

    // ---------------------------------------------------------------------
    // Incidents
    // ---------------------------------------------------------------------

    describe('incident enums', () => {
        it('IncidentStatus names every status an incident can hold', () => {
            expect(Object.values(IncidentStatusEnum).sort()).toEqual(
                ['dismissed', 'escalated', 'new', 'resolved', 'reviewed'],
            );
        });

        it('RiskCategory names every incident category', () => {
            expect(Object.values(RiskCategoryEnum).sort()).toEqual([
                'app_fraud', 'bullying', 'coercive_control', 'distress_signals', 'gambling_harm',
                'grooming', 'mule_recruitment', 'other', 'radicalisation', 'romance_scam', 'self_harm',
                'social_engineering', 'synthetic_content', 'tfgbv', 'unsafe', 'vulnerability_exploitation',
            ]);
        });

        it('RiskLevel stores moderate, not medium', () => {
            expect(Object.values(RiskLevel)).toEqual(['low', 'moderate', 'high', 'critical']);
        });
    });

    describe('listIncidents', () => {
        it('returns rows with the policy, recommendation, cap and test-traffic fields', async () => {
            const row: IncidentSummaryRow = {
                id: 'i1',
                risk_category: 'grooming',
                risk_level: 'moderate',
                confidence_score: 0.9,
                detected_patterns: [],
                recommended_actions: ['review'],
                platform: null,
                language: 'en',
                source: 'text',
                file_id: null,
                status: 'reviewed',
                policy_action: { action: 'flag' },
                recommended_status: 'escalated',
                escalation_capped: null,
                escalation_capped_reason: null,
                speaker_stance: 'describing_third_party',
                action_capped: true,
                action_capped_reason: 'third_party_report',
                is_test: true,
                external_id: null,
                customer_id: null,
                created_at: '2026-11-01T00:00:00.000Z',
            };
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ incidents: [row], next_cursor: null, total_returned: 1 }),
            );
            const page = await client.listIncidents();
            expect(page.incidents[0].is_test).toBe(true);
            expect(page.incidents[0].recommended_actions).toEqual(['review']);
        });

        it('still accepts the older filter spellings', async () => {
            const input: ListIncidentsInput = { severity: 'medium', status: 'reviewing' };
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ incidents: [], next_cursor: null, total_returned: 0 }),
            );
            await client.listIncidents(input);
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/incidents?severity=medium&status=reviewing');
        });
    });

    describe('incident review', () => {
        it('types new_risk_level and new_risk_category with the values the API accepts', () => {
            const input: ReviewIncidentInput = {
                action: 'reclassify',
                reason_code: 'incorrect_category',
                new_risk_level: 'moderate',
                new_risk_category: 'romance_scam',
                moderator_external_id: 'mod-1',
            };
            const stale: ReviewIncidentInput = {
                action: 'downgrade',
                reason_code: 'insufficient_severity',
                // @ts-expect-error 'medium' is not a risk level the API stores
                new_risk_level: 'medium',
                moderator_external_id: 'mod-1',
            };
            expect(input.new_risk_category).toBe('romance_scam');
            expect(stale.new_risk_level).toBe('medium');
        });

        it('batchReviewIncidents requires moderator_external_id before calling the API', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch');
            // @ts-expect-error moderator_external_id is required
            const input: BatchReviewIncidentsInput = { incident_ids: ['i1'], action: 'dismiss', reason_code: 'false_positive' };
            await expect(client.batchReviewIncidents(input)).rejects.toThrow(ValidationError);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('reviewIncident requires moderator_external_id before calling the API', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch');
            const input = { action: 'dismiss', reason_code: 'false_positive' } as ReviewIncidentInput;
            await expect(client.reviewIncident('i1', input)).rejects.toThrow(ValidationError);
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe('getAuditReceipt', () => {
        it('reads resolve/reopen reviews, harm_descriptor and external_ref', async () => {
            const payload: AuditReceiptPayload = {
                v: 1,
                request_id: 'r1',
                timestamp: '2026-11-01T00:00:00.000Z',
                endpoint: '/api/v1/incidents/i1/review',
                decision: 'resolve',
                deployer: 'd1',
                retention_class: 'limited-risk',
                harm_descriptor: 'tlq:h1/example',
                external_ref: 'case-123',
                moderator_review: {
                    target_request_id: 'r0',
                    target_incident_id: 'i1',
                    action: 'reopen',
                    reason_code: 'other',
                },
            };
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ payload, signature: { algorithm: 'HMAC_SHA256', key_id: 'k', signature: 's', signed_at: 't' }, canonical: '{}' }),
            );
            const receipt = await client.getAuditReceipt('r1');
            expect(receipt.payload.external_ref).toBe('case-123');
            expect(receipt.payload.moderator_review?.action).toBe('reopen');
        });
    });

    // ---------------------------------------------------------------------
    // DSA transparency report
    // ---------------------------------------------------------------------

    describe('getDsaTransparencyReport', () => {
        const counts = {
            automated_detections: 10,
            human_reviewed: 4,
            upheld_after_human_review: 3,
            dismissed_after_human_review: 1,
            closed_without_verdict: 0,
            awaiting_human_review: 6,
            policy_actions: { block: 1, flag: 2, escalate: 0, notify: 0, log_only: 0 },
        };
        const report: DsaTransparencyReport = {
            report: 'dsa_transparency_report_data',
            template: { regulation: 'r', annex: 'a', categories: 'c' },
            reporting_period: { from: '2026-01-01', to: '2026-06-30' },
            generated_at: '2026-11-08T00:00:00.000Z',
            notice: 'n',
            scope: { incidents_scanned: 12, incidents_counted: 10, test_incidents_excluded: 2 },
            sections: [{
                section: 's',
                title: 't',
                legal_basis: 'l',
                availability: 'partial',
                fields: [
                    { indicator: 'x', availability: 'computed', value: 3, reason: null },
                    { indicator: 'y', availability: 'partial', value: null, reason: 'no_human_reviews' },
                    { indicator: 'z', availability: 'not_held_by_tuteliq', value: null, reason: 'not_held_by_tuteliq' },
                ],
            }],
            own_initiative_by_category: [{
                dsa_category: { code: 'STATEMENT_CATEGORY_PROTECTION_OF_MINORS', label: 'Protection of minors', template_ref: 'Category 9' },
                tuteliq_categories: ['grooming'],
                counts,
                dsa_subcategory: null,
                subcategory_reason: 'subcategory_not_distinguished_by_tuteliq',
            }],
            unmapped_categories: [{ tuteliq_category: 'other', reason: 'no_single_dsa_category', counts }],
            supporting_data: {
                totals: counts,
                median_hours_to_latest_human_decision: { indicator: 'm', availability: 'computed', value: 5, reason: null },
                decision_time_sample_size: 4,
            },
            category_mapping: [{ tuteliq_category: 'grooming', dsa_category: 'STATEMENT_CATEGORY_PROTECTION_OF_MINORS', dsa_subcategory: null, reason: null }],
            credits_used: 1,
        };

        it('returns the JSON report for a period', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(report));
            const result = await client.getDsaTransparencyReport({ from: '2026-01-01', to: '2026-06-30' });
            expect(fetchSpy.mock.calls[0][0]).toBe(
                'https://api.tuteliq.ai/api/v1/compliance/dsa-transparency-report?from=2026-01-01&to=2026-06-30',
            );
            expect(result.scope.test_incidents_excluded).toBe(2);
        });

        it('returns the CSV as raw text', async () => {
            const csv = 'section,indicator,value\r\n1,x,3\r\n';
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse(undefined, { text: csv, headers: { 'content-type': 'text/csv; charset=utf-8' } }),
            );
            const result: string = await client.getDsaTransparencyReport({ from: '2026-01-01', to: '2026-06-30', format: 'csv' });
            expect(fetchSpy.mock.calls[0][0]).toBe(
                'https://api.tuteliq.ai/api/v1/compliance/dsa-transparency-report?from=2026-01-01&to=2026-06-30&format=csv',
            );
            expect(result).toBe(csv);
        });

        it('surfaces a plan refusal on the CSV path as a typed error', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ error: { code: 'ENDPOINT_NOT_IN_PLAN', message: 'Not in plan' } }, { ok: false, status: 403 }),
            );
            await expect(
                client.getDsaTransparencyReport({ from: '2026-01-01', to: '2026-06-30', format: 'csv' }),
            ).rejects.toThrow(TierAccessError);
        });

        it('validates the period dates', async () => {
            await expect(client.getDsaTransparencyReport({ from: '2026-1-1', to: '2026-06-30' })).rejects.toThrow(ValidationError);
            await expect(client.getDsaTransparencyReport({ from: '2026-01-01', to: '' })).rejects.toThrow(ValidationError);
        });
    });

    // ---------------------------------------------------------------------
    // Status and ping: a 503 is an answer, not an error
    // ---------------------------------------------------------------------

    describe('status', () => {
        beforeEach(() => {
            client = new Tuteliq('test-api-key', { timeout: 5000, retries: 2, retryDelay: 1 });
        });

        const outage: ApiStatus = {
            status: 'major_outage',
            updated_at: '2026-11-08T00:00:00.000Z',
            components: {
                api: { status: 'operational', latency_ms: 0 },
                database: { status: 'outage', message: 'unreachable' },
                cache: { status: 'outage' },
                analysis_engine: { status: 'operational' },
            },
            uptime: { last_24h: '99.90', last_7d: '99.95', last_30d: '99.99' },
            incidents: { active: 0, recent: [] },
        };

        it('getStatus returns a major outage (HTTP 503) without throwing or retrying', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
                mockFetchResponse(outage, { ok: false, status: 503 }),
            );
            const status = await client.getStatus();
            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/status');
            expect(status.status).toBe('major_outage');
            expect(status.components.database.status).toBe('outage');
        });

        it('ping hits GET /status/ping', async () => {
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ status: 'ok', timestamp: 1762560000000 }),
            );
            const pong = await client.ping();
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/status/ping');
            expect(pong.status).toBe('ok');
        });

        it('pingComponent returns an unhealthy component (HTTP 503) without throwing or retrying', async () => {
            const wire: ComponentPing = {
                component: 'ocr',
                healthy: false,
                latency_ms: 5001,
                message: 'timeout',
                timestamp: '2026-11-08T00:00:00.000Z',
            };
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
                mockFetchResponse(wire, { ok: false, status: 503 }),
            );
            const result = await client.pingComponent('ocr');
            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/status/ping/ocr');
            expect(result.healthy).toBe(false);
        });

        it('pingComponent throws NotFoundError for an unknown component', async () => {
            vi.spyOn(global, 'fetch').mockResolvedValueOnce(
                mockFetchResponse({ component: 'nope', error: 'unknown_component', available: ['ocr'] }, { ok: false, status: 404 }),
            );
            await expect(client.pingComponent('nope')).rejects.toThrow(NotFoundError);
        });

        it('pingComponent validates the component name', async () => {
            await expect(client.pingComponent('')).rejects.toThrow(ValidationError);
        });
    });

    // ---------------------------------------------------------------------
    // Agent fleet reads
    // ---------------------------------------------------------------------

    describe('fleet', () => {
        const device = {
            device_id: 'dev-1',
            agent_version: '1.0.0',
            platform: 'darwin',
            policy_id: 'pol-1',
            passed: true,
            results: [{ rule: { kind: 'os_version' }, passed: true }],
            attested_at: '2026-11-01T00:00:00.000Z',
            org_id: 'org-1',
            expires_at: '2027-01-30T00:00:00.000Z',
        };

        it('getFleet hits GET /api/v1/agent/fleet', async () => {
            const wire: FleetResult = {
                devices: [device],
                summary: { total: 1, compliant: 1, non_compliant: 0, compliance_pct: 100 },
                credits_used: 1,
            };
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
            const fleet = await client.getFleet();
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/agent/fleet');
            expect(fleet.summary.compliance_pct).toBe(100);
        });

        it('getFleetDevice hits GET /api/v1/agent/fleet/:deviceId', async () => {
            const wire: FleetDeviceResult = { device, credits_used: 1 };
            const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockFetchResponse(wire));
            const result = await client.getFleetDevice('dev 1');
            expect(fetchSpy.mock.calls[0][0]).toBe('https://api.tuteliq.ai/api/v1/agent/fleet/dev%201');
            expect(result.device.passed).toBe(true);
        });

        it('getFleetDevice validates the device id', async () => {
            await expect(client.getFleetDevice('')).rejects.toThrow(ValidationError);
        });
    });
});
