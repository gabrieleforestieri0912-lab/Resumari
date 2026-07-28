import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { findUserByEmail } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || ''

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { grant_type, code, client_id, client_assertion } = body

    if (grant_type === 'authorization_code' && code) {
      const userId = await validateAuthCode(code)
      if (!userId) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
      }

      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
      return NextResponse.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 604800,
      })
    }

    if (grant_type === 'client_credentials') {
      const user = await findUserByEmail(client_id || '')
      if (!user) {
        return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
      return NextResponse.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 604800,
      })
    }

    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
}

const authCodes = new Map<string, { userId: string; expires: number }>()

export function createAuthCode(userId: string): string {
  const crypto = require('crypto')
  const code = crypto.randomBytes(16).toString('hex')
  authCodes.set(code, { userId, expires: Date.now() + 60000 })
  return code
}

async function validateAuthCode(code: string): Promise<string | null> {
  const entry = authCodes.get(code)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    authCodes.delete(code)
    return null
  }
  authCodes.delete(code)
  return entry.userId
}
