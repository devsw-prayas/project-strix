CREATE TABLE IF NOT EXISTS nodes_registry (
  node_id    TEXT PRIMARY KEY,
  dag_type   TEXT NOT NULL,  
  address    TEXT NOT NULL,
  status     TEXT NOT NULL,   
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tamper_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT now(),
  offending_node TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB
);
