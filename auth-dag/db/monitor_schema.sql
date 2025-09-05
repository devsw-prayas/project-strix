-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------
-- Nodes Registry
-- Tracks nodes across any DAG (auth, local, global)
-------------------------------------------------
CREATE TABLE IF NOT EXISTS nodes_registry (
  node_id TEXT PRIMARY KEY,
  dag_type TEXT NOT NULL CHECK (dag_type IN ('auth','local','global')),
  address TEXT NOT NULL,
  status TEXT NOT NULL,             -- e.g. 'healthy', 'unreachable'
  last_seen TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------
-- Tamper Alerts
-- Aggregated alerts reported from DAG nodes
-------------------------------------------------
CREATE TABLE IF NOT EXISTS tamper_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT now(),
  offending_node TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB
);
