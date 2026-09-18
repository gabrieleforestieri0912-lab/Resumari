import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthenticatedUser } from '@/lib/auth'
import { findApiKeysByUserId, createApiKey } from '@/lib/db'

// Prefisso utilizzato per identificare le chiavi API di Resumari
const KEY_PREFIX = 'rsm_live_'

/**
 * Genera una nuova chiave API sicura.
 * La chiave completa viene restituita solo una volta all'utente.
 * Nel database viene salvato solo l'hash SHA-256 della chiave per motivi di sicurezza.
 *
 * @returns Un oggetto contenente la chiave completa, il prefisso leggibile e l'hash.
 */
function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const fullKey = KEY_PREFIX + raw
  const prefix = fullKey.substring(0, 12) + '...'
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex')
  return { fullKey, prefix, hash }
}

/**
 * Endpoint API per elencare tutte le chiavi API di un utente.
 * Restituisce i dati della chiave, ma non la chiave stessa (solo il prefisso).
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 })

  const keys = await findApiKeysByUserId(user.id)
  const safe = keys.map(k => ({
    id: k.id,
    name: k.name,
    key_prefix: k.key_prefix,
    created_at: k.created_at,
    last_used_at: k.last_used_at,
    revoked: k.revoked,
  }))

  return NextResponse.json({ keys: safe })
}

/**
 * Endpoint API per generare una nuova chiave API per l'utente autenticato.
 *
 * Aspetta un JSON con il campo 'name' per identificare la chiave.
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 })

  const body = await request.json()
  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ message: 'Nome richiesto' }, { status: 400 })

  const { fullKey, prefix, hash } = generateApiKey()

  await createApiKey({
    user_id: user.id,
    name,
    key_prefix: prefix,
    key_hash: hash,
  })

  // Restituisce la chiave completa all'utente. È l'unico momento in cui la chiave è visibile.
  return NextResponse.json({ key: fullKey, name, key_prefix: prefix })
}
