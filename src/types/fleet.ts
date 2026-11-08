// =============================================================================
// Endpoint agent fleet (device attestations)
// =============================================================================

/** One evaluated policy rule in a device attestation. */
export interface AttestationRuleResult {
    /** The posture check that was evaluated */
    rule: Record<string, unknown>;
    passed: boolean;
    detail?: string;
}

/** A device's latest attestation, scoped to the org behind the API key. */
export interface FleetDevice {
    device_id: string;
    agent_version: string;
    platform: string;
    policy_id: string;
    /** Whether every rule passed */
    passed: boolean;
    results: AttestationRuleResult[];
    attested_at: string;
    org_id: string;
    expires_at: string;
}

/** Result from `GET /api/v1/agent/fleet`. */
export interface FleetResult {
    /** Each device's latest attestation, newest first */
    devices: FleetDevice[];
    summary: {
        total: number;
        compliant: number;
        non_compliant: number;
        /** 0-100, one decimal place */
        compliance_pct: number;
    };
    credits_used: number;
}

/** Result from `GET /api/v1/agent/fleet/{deviceId}`. */
export interface FleetDeviceResult {
    device: FleetDevice;
    credits_used: number;
}
