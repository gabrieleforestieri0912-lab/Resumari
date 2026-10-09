-- Add api_keys table for public API access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Allineamento delle installazioni create da una versione precedente di
-- schema.sql (dove key_hash non era UNIQUE e mancava l'indice su user_id).
ALTER TABLE api_keys ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- La tabella è gestita solo dal service role: nessun accesso diretto dal browser.
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
