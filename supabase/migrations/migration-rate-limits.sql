-- Rate limit condiviso tra istanze serverless (la Map in-memory è per-istanza).
-- Usata da src/lib/rate-limit.ts (registrazione) e src/lib/api-auth.ts
-- (30 richieste al minuto per chiave API / per utente con token Bearer).
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits(key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits(created_at);

-- Scritta e letta solo dal service role.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
