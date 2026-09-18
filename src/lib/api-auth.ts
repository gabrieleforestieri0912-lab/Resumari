import crypto from 'crypto'
import { findApiKeyByKeyHash, touchApiKey, findUserById } from '@/lib/db'
import type { User } from '@/lib/types'

// Configurazione del rate limit specifico per le chiamate via API Key
const RATE_LIMIT_WINDOW = 60 * 1000
const MAX_PER_MINUTE = 30
// Store in-memory per il tracciamento delle richieste per chiave API
const store = new Map<string, number[]>()

/**
 * Verifica se una specifica chiave API ha superato il limite di richieste al minuto.
 * Utilizza un sistema di sliding window per monitorare l'utilizzo.
 */
function checkRateLimit(keyId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const timestamps = store.get(keyId) || []
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW)
  if (valid.length >= MAX_PER_MINUTE) return { allowed: false, remaining: 0 }
  valid.push(now)
  store.set(keyId, valid)
  return { allowed: true, remaining: MAX_PER_MINUTE - valid.length }
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
  const rl = checkRateLimit(keyRecord.id)
  if (!rl.allowed) {
    return { authenticated: false, error: 'rate_limited', status: 429 }
  }

  const user = await findUserById(keyRecord.user_id)
  if (!user) {
    return { authenticated: false, error: 'invalid_api_key', status: 401 }
  }

  // Aggiorna l'ultimo utilizzo della chiave
  touchApiKey(keyRecord.id)

  return {
    authenticated: true,
    user: user as User & { id: string },
    creditsRemaining: user.credits,
    rateLimitRemaining: rl.remaining,
  }
}
