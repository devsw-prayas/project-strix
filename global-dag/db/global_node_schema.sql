-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------
-- Global Settlements
-- Each record maps a validated local DAG tx into the global DAG
-------------------------------------------------
CREATE TABLE IF NOT EXISTS global_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_dag_hash TEXT NOT NULL,      -- hash from local DAG
  originating_node TEXT NOT NULL,    -- which local node submitted it
  validated BOOLEAN DEFAULT false,
  validation_proof JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Global DAG Nodes
-- Each DAG node confirms settlements and links them together
-------------------------------------------------
CREATE TABLE IF NOT EXISTS global_dag_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES global_settlements(id),
  global_tx_hash TEXT NOT NULL UNIQUE,
  parents TEXT[] NOT NULL,
  dag_type TEXT NOT NULL CHECK (dag_type = 'global'),
  node_id TEXT NOT NULL,
  node_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Registered Nodes (with TPM keys)
-------------------------------------------------
CREATE TABLE IF NOT EXISTS nodes (
  node_id TEXT PRIMARY KEY,
  tpm_pub TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Tamper Alerts
-- Logged when invalid proofs or mismatched settlements occur
-------------------------------------------------
CREATE TABLE IF NOT EXISTS global_tamper_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT now(),
  offending_local_hash TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB
);

-------------------------------------------------
-- Verification Log
-- Records final validation of local DAG hashes in the global DAG
-------------------------------------------------
CREATE TABLE IF NOT EXISTS global_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_dag_hash TEXT NOT NULL,
  validated BOOLEAN NOT NULL,
  verifier_node TEXT NOT NULL REFERENCES nodes(node_id),
  validation_round INT NOT NULL,
  proof JSONB,
  verified_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Global Attestations
-- TPM-signed proofs of global settlement verification
-------------------------------------------------
CREATE TABLE IF NOT EXISTS global_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL REFERENCES nodes(node_id),
  local_dag_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  details JSONB
);
