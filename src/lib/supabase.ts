import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : ''

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL non configurata')
}

// For client-side usage (browser)
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, anonKey)
}

// Lazy server-side client with service role for admin operations
let _supabase: any = null
export function getServiceClient(): any {
  if (!_supabase && supabaseUrl && supabaseServiceKey) {
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
  if (!_supabase) {
    throw new Error('Supabase service client not configured — check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL')
  }
  return _supabase
}

// Table name constants
export const TABLES = {
  USERS: 'users',
  CHATS: 'chats',
  VERIFICATION_CODES: 'verification_codes',
  MESSAGES: 'messages',
  ACCOUNTS: 'nextauth_accounts',
  SESSIONS: 'nextauth_sessions',
  VERIFICATION_TOKENS: 'nextauth_verification_tokens',
  API_KEYS: 'api_keys',
} as const
