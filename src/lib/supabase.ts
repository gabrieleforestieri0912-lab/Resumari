import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// URL di Supabase recuperata dalle variabili d'ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// Chiave di servizio per operazioni amministrative (solo lato server)
const supabaseServiceKey = typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : ''

if (!supabaseUrl && typeof process !== 'undefined') {
  console.warn('NEXT_PUBLIC_SUPABASE_URL non configurata')
}

/**
 * Restituisce un client Supabase per l'utilizzo lato client (browser).
 * Utilizza la anon key per rispettare le policy RLS.
 */
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, anonKey)
}

/**
 * Client Supabase lato server con Service Role.
 * Permette di bypassare le policy RLS per operazioni di amministrazione.
 * Implementato con lazy loading per ottimizzare le prestazioni.
 *
 * NOTA: lancia un errore se le env mancano (fail-fast a runtime) invece di
 * ritornare `null`: i caller non devono più fare `if (!client)` — quel ramo
 * era irraggiungibile. Per un check preventivo usare `isSupabaseConfigured()`.
 */
let _supabase: SupabaseClient | null = null
export function getServiceClient(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase service client not configured — check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL')
    }
    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    })
  }
  return _supabase
}

/** `true` se il service client può essere creato (env presenti). */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey)
}

/**
 * Costanti per i nomi delle tabelle del database Supabase.
 * Centralizzare i nomi evita errori di battitura in tutto il progetto.
 */
export const TABLES = {
  USERS: 'users',
  CHATS: 'chats',
  VERIFICATION_CODES: 'verification_codes',
  MESSAGES: 'messages',
  ACCOUNTS: 'nextauth_accounts',
  SESSIONS: 'nextauth_sessions',
  VERIFICATION_TOKENS: 'nextauth_verification_tokens',
  API_KEYS: 'api_keys',
  TRANSCRIPTS: 'transcripts',
} as const
