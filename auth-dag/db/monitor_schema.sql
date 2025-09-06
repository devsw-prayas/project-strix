-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------
-- Nodes Registry
-- Tracks active nodes across any DAG (auth, local, global)
-------------------------------------------------
CREATE TABLE IF NOT EXISTS nodes_registry (
    node_id TEXT PRIMARY KEY,
    dag_type TEXT NOT NULL CHECK (dag_type IN ('auth','local','global')),
    address TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy','unreachable','suspect')),
    last_seen TIMESTAMPTZ DEFAULT now(),

    -- cryptographic identity
    node_pub_key TEXT NOT NULL,      -- base64 child public key
    parent_pub_b64 TEXT NOT NULL,    -- parent key used for attestation verification
    attestation JSONB NOT NULL,      -- parent-signed attestation (with signed_payload_b64 inside)
    attestation_hash TEXT NOT NULL,  -- SHA256 of attestation JSON
    attestation_verified_at TIMESTAMPTZ, -- when monitor last verified
    attestation_counter BIGINT       -- monotonic counter from attestation
);

-- Ensure uniqueness of child public keys across cluster
CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_registry_pubkey
    ON nodes_registry (node_pub_key);

-- Fast lookups by attestation hash
CREATE INDEX IF NOT EXISTS idx_nodes_registry_att_hash
    ON nodes_registry (attestation_hash);

-- Recent node activity
CREATE INDEX IF NOT EXISTS idx_nodes_registry_last_seen
    ON nodes_registry (last_seen);

-------------------------------------------------
-- Registry History (append-only audit trail)
-------------------------------------------------
CREATE TABLE IF NOT EXISTS nodes_registry_history (
    event_id BIGSERIAL PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes_registry(node_id),
    attestation JSONB NOT NULL,
    attestation_hash TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Tamper Alerts
-- Alerts raised when signatures/attestations mismatch
-------------------------------------------------
CREATE TABLE IF NOT EXISTS tamper_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detected_at TIMESTAMPTZ DEFAULT now(),
    offending_node TEXT NOT NULL REFERENCES nodes_registry(node_id),
    description TEXT NOT NULL,
    evidence JSONB
);
