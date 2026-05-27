// =============================================================================
// Customer-managed end-to-end encryption (EU AI Act privacy hardening)
// =============================================================================

/** RSA-OAEP key size accepted by the API. */
export type CustomerKeyAlgorithm = 'RSA-OAEP-2048' | 'RSA-OAEP-4096';

export interface RegisterEncryptionKeyInput {
    /** RSA-OAEP key size. 2048 is faster; 4096 is more conservative. */
    algorithm: CustomerKeyAlgorithm;
    /**
     * PEM-encoded SPKI public key (begins with `-----BEGIN PUBLIC KEY-----`).
     * The matching private key MUST stay on the customer's side — Tuteliq
     * never sees it.
     */
    public_key_pem: string;
}

export interface CustomerEncryptionKey {
    algorithm: CustomerKeyAlgorithm;
    public_key_pem: string;
    /** sha256(DER(SPKI)).hex — verify on your side to confirm integrity. */
    key_fingerprint: string;
    /** ISO 8601 timestamp of registration. */
    registered_at: string;
    /** Previous key_fingerprint when this registration was a rotation. */
    rotated_from?: string;
}

export interface RevokeEncryptionKeyResult {
    ok: boolean;
}
