import crypto from 'crypto'
import { findApiKeyByKeyHash, touchApiKey, findUserById } from '@/lib/db'
import type { User } from '@/lib/types'

// Configurazione del rate limit specifico per le chiamate via API Key.
// Doppio backend come in `@/lib/rate-limit`: Supabase (`rate_limits`,
// chiave `apikey:<id>`) quando disponibile, Map in-memory come fallback.
const RATE_LIMIT_WINDOW = 60 * 1000
const MAX_PER_MINUTE = 30
// Store in-memory per il tracciamento delle richieste per chiave API
const memoryStore = new Map<string, number[]>()

function memoryCheckRateLimit(keyId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const timestamps = memoryStore.get(keyId) || []
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW)
  if (valid.length >= MAX_PER_MINUTE) return { allowed: false, remaining: 0 }
  valid.push(now)
  memoryStore.set(keyId, valid)
  return { allowed: true, remaining: MAX_PER_MINUTE - valid.length }
}

async function supabaseCheckRateLimit(keyId: string): Promise<{ allowed: boolean; remaining: number } | null> {
  try {
    const { getServiceClient } = await import('@/lib/supabase')
    const client = getServiceClient()
    const now = Date.now()
    const windowStart = new Date(now - RATE_LIMIT_WINDOW).toISOString()
    const key = `apikey:${keyId}`

    void client.from('rate_limits').delete().lt('created_at', windowStart).then(
      () => {},
      () => {},
    )

    const { count } = await client
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart)
    const used = count || 0
    if (used >= MAX_PER_MINUTE) return { allowed: false, remaining: 0 }
    const { error } = await client.from('rate_limits').insert({ key })
    if (error) return null
    return { allowed: true, remaining: MAX_PER_MINUTE - used - 1 }
  } catch {
    return null
  }
}

/**
 * Risultato dell'operazione di autenticazione tramite API Key.
 */
export type ApiAuthResult = {
  authenticated: true
  user: User & { id: string }
  creditsRemaining: number
  rateLimitRemaining: number
} | {
  authenticated: false
  error: string
  status: number
}

/**
 * Autentica una richiesta basandosi sulla presenza e validità di una chiave API.
 *
 * Il processo prevede:
 * 1. Estrazione della chiave dall'header 'x-api-key'.
 * 2. Hashing della chiave (SHA-256) per confrontarla con l'hash salvato nel DB.
 * 3. Verifica del rate limit specifico per la chiave.
 * 4. Recupero dell'utente associato alla chiave.
 * 5. Aggiornamento del timestamp di ultimo utilizzo della chiave.
 *
 * @param request La richiesta HTTP entrante.
 * @returns Un oggetto ApiAuthResult che indica se l'accesso è consentito e i dati dell'utente.
 */
export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return { authenticated: false, error: 'missing_api_key', status: 401 }
  }

  // Calcola l'hash SHA-256 della chiave per evitare di salvare chiavi in chiaro nel database
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex')
  const keyRecord = await findApiKeyByKeyHash(hash)
  if (!keyRecord) {
    return { authenticated: false, error: 'invalid_api_key', status: 401 }
  }

  // Controllo del rate limit per prevenire abusi delle API
  // (Supabase condiviso tra istanze, fallback memoria se tabella assente).
  const rl = (await supabaseCheckRateLimit(keyRecord.id)) || memoryCheckRateLimit(keyRecord.id)
  if (!rl.allowed) {
    return { authenticated: false, error: 'rate_limited', status: 429 }
  }

  const user = await findUserById(keyRecord.user_id)
  if (!user) {
    return { authenticated: false, error: 'invalid_api_key', status: 401 }
  }

  // Aggiorna l'ultimo utilizzo della chiave (fire-and-forget: non blocca la risposta)
  void touchApiKey(keyRecord.id).catch(() => {})

  return {
    authenticated: true,
    user: user as User & { id: string },
    creditsRemaining: user.credits,
    rateLimitRemaining: rl.remaining,
  }
}
