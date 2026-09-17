-- Add transcripts table to collect the user's video transcriptions
-- (used by the Chrome extension side panel and the site's transcript list)
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Video',
  channel TEXT,
  thumbnail TEXT,
  duration_sec INTEGER DEFAULT 0,
  language TEXT,
  is_generated BOOLEAN NOT NULL DEFAULT FALSE,
  transcript JSONB NOT NULL DEFAULT '[]',
  credits_used INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_created ON transcripts(user_id, created_at DESC);
