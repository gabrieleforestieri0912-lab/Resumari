import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { createAuthCode } from '../token/route'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const redirectUri = searchParams.get('redirect_uri') || '/mcp'
  const state = searchParams.get('state') || ''

  const user = await getAuthenticatedUser(request)
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', `/api/mcp/oauth/authorize?redirect_uri=${encodeURIComponent(redirectUri)}${state ? `&state=${encodeURIComponent(state)}` : ''}`)
    return NextResponse.redirect(loginUrl.toString())
  }

  const code = createAuthCode(user.id)
  const callbackUrl = new URL(redirectUri, request.url)
  callbackUrl.searchParams.set('code', code)
  if (state) callbackUrl.searchParams.set('state', state)

  return NextResponse.redirect(callbackUrl.toString())
}
