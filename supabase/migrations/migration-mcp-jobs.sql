-- Tabella snapshot job MCP (fallback cross-istanza serverless).
-- La Map in-memory di src/lib/mcp-jobs.ts resta il path veloce; questa
-- tabella conserva gli snapshot best-effort (upsert fire-and-forget).
CREATE TABLE IF NOT EXISTS mcp_jobs (
  job_id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_jobs_status ON mcp_jobs(status);
