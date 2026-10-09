import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { isAllowedRedirectUri, issuerFromRequest, signAuthCode } from '@/lib/mcp-oauth'

/**
 * Endpoint di autorizzazione OAuth (authorization code + PKCE).
 *
 * - Gli utenti non autenticati vengono mandati a `/login` conservando
 *   `callbackUrl`, così il flusso riprende da dove si era interrotto.
 * - Il `redirect_uri` viene validato: solo loopback, origin dell'app o host
 *   elencati in `MCP_OAUTH_REDIRECT_URIS`.
 * - Il codice emesso è un JWT firmato (stateless), non una Map in-memory.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const issuer = issuerFromRequest(request)
  const redirectUri = searchParams.get('redirect_uri') || ''
  const state = searchParams.get('state') || ''
  const clientId = searchParams.get('client_id') || undefined
  const codeChallenge = searchParams.get('code_challenge') || ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') || ''

  // Un redirect_uri non autorizzato non viene mai usato per l'errore: si
  // risponde con un errore JSON sulla risorsa corrente.
  if (!isAllowedRedirectUri(redirectUri, issuer)) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'redirect_uri non autorizzato' }, { status: 400 })
  }

  // PKCE S256 è obbligatorio: i client MCP sono pubblici, senza client_secret
  // il codice deve essere legato a chi l'ha richiesto.
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge S256 obbligatorio' },
      { status: 400 },
    )
  }

  const fail = (error: string, description: string) => {
    const url = new URL(redirectUri, issuer)
    url.searchParams.set('error', error)
    url.searchParams.set('error_description', description)
    if (state) url.searchParams.set('state', state)
    return NextResponse.redirect(url.toString())
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    const loginUrl = new URL('/login', issuer)
    loginUrl.searchParams.set('mode', 'login')
    loginUrl.searchParams.set(
      'callbackUrl',
      `/api/mcp/oauth/authorize?${new URLSearchParams({
        redirect_uri: redirectUri,
        ...(state ? { state } : {}),
        ...(clientId ? { client_id: clientId } : {}),
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
      }).toString()}`,
    )
    return NextResponse.redirect(loginUrl.toString())
  }

  if (user.credits <= 0) {
    return fail('access_denied', 'Crediti esauriti: ricarica il piano per usare il server MCP.')
  }

  const code = signAuthCode({
    userId: user.id,
    email: user.email,
    clientId,
    redirectUri,
    codeChallenge,
  })

  const callbackUrl = new URL(redirectUri, issuer)
  callbackUrl.searchParams.set('code', code)
  if (state) callbackUrl.searchParams.set('state', state)

  return NextResponse.redirect(callbackUrl.toString())
}
