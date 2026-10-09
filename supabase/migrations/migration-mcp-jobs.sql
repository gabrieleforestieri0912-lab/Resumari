-- Tabella snapshot job MCP (fallback cross-istanza serverless).
-- La Map in-memory di src/lib/mcp-jobs.ts resta il path veloce; questa
-- tabella conserva gli snapshot best-effort (upsert fire-and-forget).
CREATE TABLE IF NOT EXISTS mcp_jobs (
  job_id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'processing',
  result JSONB,
  error TEXT,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_jobs_status ON mcp_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mcp_jobs_user_id ON mcp_jobs(user_id);

-- La versione precedente della tabella (senza ownership né crediti) resta
-- valida: si aggiungono solo le colonne usate dal codice.
ALTER TABLE mcp_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE mcp_jobs ADD COLUMN IF NOT EXISTS credits_charged INTEGER NOT NULL DEFAULT 0;

-- RLS: la tabella è gestita solo dal service role (le API MCP scrivono e
-- leggono i job lato server), nessun accesso diretto dal browser.
ALTER TABLE mcp_jobs ENABLE ROW LEVEL SECURITY;
