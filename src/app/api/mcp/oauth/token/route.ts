import { NextResponse } from 'next/server'
import { isAllowedRedirectUri, signAccessToken, verifyAuthCode, verifyPkce } from '@/lib/mcp-oauth'

/**
 * Endpoint di scambio del codice di autorizzazione in token d'accesso.
 *
 * Sono supportati solo `authorization_code` con PKCE S256: il vecchio grant
 * `client_credentials` (dove il `client_id` veniva trattato come email e
 * bastava conoscere un'email registrata per ottenere un token) è stato
 * rimosso perché era un bypass di autenticazione.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const grantType = body.grant_type
  const code = typeof body.code === 'string' ? body.code : ''
  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri : ''
  const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier : ''
  const clientId = typeof body.client_id === 'string' ? body.client_id : undefined

  if (grantType !== 'authorization_code') {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }

  if (!code || !redirectUri || !codeVerifier) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  try {
    const issuer = new URL(request.url).origin
    if (!isAllowedRedirectUri(redirectUri, issuer)) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    }

    const payload = verifyAuthCode(code, { redirectUri, clientId })

    if (!verifyPkce(payload.codeChallenge, codeVerifier)) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'code_verifier non valido' }, { status: 400 })
    }

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email, clientId })

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 3600,
      scope: 'mcp:read',
    })
  } catch {
    // Codice scaduto, firmato con un altro segreto o PKCE non corrispondente:
    // stessa risposta per ogni caso, senza distinguere i dettagli.
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
  }
}
