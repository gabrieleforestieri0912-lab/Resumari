import crypto from 'crypto'
import { findApiKeyByKeyHash, touchApiKey, findUserById } from '@/lib/db'
import type { User } from '@/lib/types'

const RATE_LIMIT_WINDOW = 60 * 1000
const MAX_PER_MINUTE = 30
const store = new Map<string, number[]>()

function checkRateLimit(keyId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const timestamps = store.get(keyId) || []
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW)
  if (valid.length >= MAX_PER_MINUTE) return { allowed: false, remaining: 0 }
  valid.push(now)
  store.set(keyId, valid)
  return { allowed: true, remaining: MAX_PER_MINUTE - valid.length }
}

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

export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return { authenticated: false, error: 'missing_api_key', status: 401 }
  }

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex')
  const keyRecord = await findApiKeyByKeyHash(hash)
  if (!keyRecord) {
    return { authenticated: false, error: 'invalid_api_key', status: 401 }
  }

  const rl = checkRateLimit(keyRecord.id)
  if (!rl.allowed) {
    return { authenticated: false, error: 'rate_limited', status: 429 }
  }

  const user = await findUserById(keyRecord.user_id)
  if (!user) {
    return { authenticated: false, error: 'invalid_api_key', status: 401 }
  }

  touchApiKey(keyRecord.id)

  return {
    authenticated: true,
    user: user as User & { id: string },
    creditsRemaining: user.credits,
    rateLimitRemaining: rl.remaining,
  }
}
