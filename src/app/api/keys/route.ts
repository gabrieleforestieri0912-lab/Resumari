import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthenticatedUser } from '@/lib/auth'
import { findApiKeysByUserId, createApiKey } from '@/lib/db'

const KEY_PREFIX = 'rsm_live_'

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const fullKey = KEY_PREFIX + raw
  const prefix = fullKey.substring(0, 12) + '...'
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex')
  return { fullKey, prefix, hash }
}

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

  return NextResponse.json({ key: fullKey, name, key_prefix: prefix })
}
