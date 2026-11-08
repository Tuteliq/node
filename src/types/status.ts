// =============================================================================
// Status and ping (public, no authentication)
// =============================================================================

/** Health of one component on the status endpoint. */
export interface StatusComponent {
    status: 'operational' | 'degraded' | 'outage';
    latency_ms?: number;
    message?: string;
}

/**
 * Result from `GET /status`.
 *
 * The API answers HTTP 503 when `status` is `major_outage`; the SDK returns
 * that answer like any other instead of throwing.
 */
export interface ApiStatus {
    status: 'operational' | 'degraded' | 'major_outage';
    updated_at: string;
    components: {
        api: StatusComponent;
        database: StatusComponent;
        cache: StatusComponent;
        analysis_engine: StatusComponent;
    };
    /** Uptime percentages as strings, e.g. `"99.95"` */
    uptime: {
        last_24h: string;
        last_7d: string;
        last_30d: string;
    };
    incidents: {
        active: number;
        recent: Array<{
            id: string;
            title: string;
            status: string;
            created_at: string;
        }>;
    };
}

/** Result from `GET /status/ping`. */
export interface PingResult {
    status: 'ok';
    /** Unix time in milliseconds */
    timestamp: number;
}

/**
 * Result from `GET /status/ping/{component}`.
 *
 * The API answers HTTP 503 when the component is failing; the SDK returns
 * that answer with `healthy: false` instead of throwing.
 */
export interface ComponentPing {
    component: string;
    healthy: boolean;
    latency_ms?: number;
    /** True when the probe was not run (the component is not configured on this deployment) */
    skipped?: boolean;
    message?: string;
    timestamp: string;
}
