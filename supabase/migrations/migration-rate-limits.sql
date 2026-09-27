-- Rate limit condiviso tra istanze serverless (la Map in-memory è per-istanza).
-- Usata da src/lib/rate-limit.ts (supabaseRateLimit) con fallback memoria.
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits(key, created_at DESC);
