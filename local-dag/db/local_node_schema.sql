-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------
-- Local Ledger
-- High-speed transactions between public IDs
-------------------------------------------------
CREATE TABLE IF NOT EXISTS local_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_public_id TEXT NOT NULL,
  to_public_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  tx_type TEXT NOT NULL,            -- e.g. transfer, stake, vote
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Local DAG Nodes
-- Each DAG node links transactions in the local layer
-------------------------------------------------
CREATE TABLE IF NOT EXISTS local_dag_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID REFERENCES local_ledger(id),
  tx_hash TEXT NOT NULL UNIQUE,
  parents TEXT[] NOT NULL,
  dag_type TEXT NOT NULL CHECK (dag_type = 'local'),
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
-- Logged when invalid DAG structure or tx is detected
-------------------------------------------------
CREATE TABLE IF NOT EXISTS local_tamper_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT now(),
  offending_tx TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB
);

-------------------------------------------------
-- Verification Log
-- Records consensus verification of local DAG txs
-------------------------------------------------
CREATE TABLE IF NOT EXISTS local_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT NOT NULL,
  verified BOOLEAN NOT NULL,
  verifier_node TEXT NOT NULL REFERENCES nodes(node_id),
  consensus_round INT NOT NULL,
  details JSONB,
  verified_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Local Attestations
-- TPM-signed proofs of participation in local DAG consensus
-------------------------------------------------
CREATE TABLE IF NOT EXISTS local_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL REFERENCES nodes(node_id),
  tx_hash TEXT NOT NULL,
  round INT NOT NULL,
  signature TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  details JSONB
);
