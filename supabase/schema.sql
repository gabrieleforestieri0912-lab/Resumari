-- =============================================================================
-- SCHEMA DATABASE RESUMARI
-- Generato automaticamente per Supabase / PostgreSQL
-- =============================================================================

-- Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABELLA UTENTI (users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    name TEXT,
    picture TEXT,
    provider TEXT,
    credits INTEGER DEFAULT 10,
    plan TEXT DEFAULT 'free',
    locale TEXT DEFAULT 'it',
    stripe_subscription_id TEXT,
    reset_token TEXT,
    reset_token_expiry BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger per aggiornamento automatico updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. TABELLA CHAT (chats)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    title TEXT NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    video_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. TABELLA CODICI DI VERIFICA (verification_codes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. TABELLA MESSAGGI DI CONTATTO (messages)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    messaggio TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. TABELLA CHIAVI API (api_keys)
-- -----------------------------------------------------------------------------
-- Applicare anche supabase/migrations/migration-api-keys.sql: questa sezione
-- è lo schema di riferimento, la migration allinea le installazioni esistenti.
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT FALSE
);

-- -----------------------------------------------------------------------------
-- 5b. TABELLA RATE LIMIT (rate_limits)
-- -----------------------------------------------------------------------------
-- Contatore richieste usato dal rate limit di API key (30/min per chiave) e
-- dalla registrazione. Scritta solo dal service role.
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5c. TABELLA JOB MCP (mcp_jobs)
-- -----------------------------------------------------------------------------
-- Snapshot dei job di trascrizione esposti dal server MCP: senza questa tabella
-- un job avviato su un'istanza serverless non è recuperabile dalla successiva.
CREATE TABLE IF NOT EXISTS public.mcp_jobs (
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

-- -----------------------------------------------------------------------------
-- 6. TABELLA TRASCRIZIONI (transcripts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    channel TEXT,
    thumbnail TEXT,
    duration_sec INTEGER,
    language TEXT,
    is_generated BOOLEAN DEFAULT FALSE,
    transcript JSONB NOT NULL,
    credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_transcripts_updated_at
    BEFORE UPDATE ON public.transcripts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 7. TABELLE NEXTAUTH (Standard)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nextauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT
);

CREATE TABLE IF NOT EXISTS public.nextauth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nextauth_verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires BIGINT NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- -----------------------------------------------------------------------------
-- INDICI PER OTTIMIZZAZIONE
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_chat_id ON public.chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_jobs_status ON public.mcp_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mcp_jobs_user_id ON public.mcp_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON public.transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);
