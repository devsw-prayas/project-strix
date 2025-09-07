-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------
-- User Accounts
-------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email_id TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  user_pub TEXT NOT NULL,
  cert_user_pub TEXT NOT NULL,
  account_hash TEXT NOT NULL,
  public_id TEXT,
  node_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Auth DAG Nodes
-- Each DAG node represents an account-related event
-------------------------------------------------
CREATE TABLE IF NOT EXISTS dag_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('register','revoke','rotate')),
  payload JSONB,
  tx_hash TEXT NOT NULL UNIQUE,
  parents TEXT[] NOT NULL,
  dag_type TEXT NOT NULL CHECK (dag_type = 'auth'),
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
-- Logged when a node misbehaves or submits invalid data
-------------------------------------------------
CREATE TABLE IF NOT EXISTS tamper_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT now(),
  offending_node TEXT NOT NULL REFERENCES nodes(node_id),
  description TEXT NOT NULL,
  evidence JSONB
);

-------------------------------------------------
-- Verification Log
-- Records which node verified which account/tx
-------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','dag_node')),
  entity_id UUID NOT NULL,
  verified BOOLEAN NOT NULL,
  verifier_node TEXT NOT NULL REFERENCES nodes(node_id),
  details JSONB,
  verified_at TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Node Attestations
-- TPM-signed proofs of node integrity
-------------------------------------------------
CREATE TABLE IF NOT EXISTS node_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL REFERENCES nodes(node_id),
  nonce TEXT NOT NULL,
  signature TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  details JSONB
);
