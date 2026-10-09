import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.stubEnv('JWT_SECRET', 'test-secret-oauth')
// Env con dominio sbagliato di proposito: l'issuer deve comunque combaciare
// con l'host della richiesta, altrimenti il client MCP rifiuta la config.
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://typo-resuamri.vercel.app')

const { authMocks } = vi.hoisted(() => ({ authMocks: { getAuthenticatedUser: vi.fn() } }))
vi.mock('@/lib/auth', () => authMocks)

import { GET as authorizeGET } from '@/app/api/mcp/oauth/authorize/route'
import { POST as tokenPOST } from '@/app/api/mcp/oauth/token/route'
import { GET as configGET } from '@/app/api/mcp/oauth/config/route'
import { GET as protectedResourceGET } from '@/app/api/mcp/oauth/protected-resource/route'
import { signAuthCode, verifyAuthCode, verifyPkce, isAllowedRedirectUri } from '@/lib/mcp-oauth'

const ORIGIN = 'https://resumari.vercel.app'
const REDIRECT = 'http://localhost:6274/oauth/callback'
const user = { id: 'u1', email: 'a@b.c', credits: 10, plan: 'free' }

function pkce() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

describe('metadata OAuth', () => {
  it('issuerderivato dall host della richiesta, non dall env sbagliato', async () => {
    const res = await configGET(new Request(`${ORIGIN}/api/mcp/oauth/config`))
    const body = await res.json()
    expect(body.issuer).toBe(ORIGIN)
    expect(body.authorization_endpoint).toBe(`${ORIGIN}/api/mcp/oauth/authorize`)
    expect(body.grant_types_supported).toEqual(['authorization_code'])
    expect(body.grant_types_supported).not.toContain('client_credentials')
    expect(body.code_challenge_methods_supported).toEqual(['S256'])
  })

  it('risorsa protetta dichiarata', async () => {
    const res = await protectedResourceGET(new Request(`${ORIGIN}/.well-known/oauth-protected-resource`))
    const body = await res.json()
    expect(body.resource).toBe(`${ORIGIN}/api/mcp`)
    expect(body.authorization_servers).toEqual([ORIGIN])
  })
})

describe('redirect_uri consentiti', () => {
  it('accetta loopback e origin dell app', () => {
    expect(isAllowedRedirectUri(REDIRECT, ORIGIN)).toBe(true)
    expect(isAllowedRedirectUri(`${ORIGIN}/callback`, ORIGIN)).toBe(true)
  })

  it('rifiuta host esterni non autorizzati', () => {
    expect(isAllowedRedirectUri('https://evil.example/cb', ORIGIN)).toBe(false)
    expect(isAllowedRedirectUri('not-a-url', ORIGIN)).toBe(false)
  })

  it('accetta gli host remoti esplicitamente autorizzati', () => {
    vi.stubEnv('MCP_OAUTH_REDIRECT_URIS', 'https://altro.example')
    expect(isAllowedRedirectUri('https://altro.example/cb', ORIGIN)).toBe(true)
    vi.unstubAllEnvs()
    vi.stubEnv('JWT_SECRET', 'test-secret-oauth')
  })
})

describe('GET /api/mcp/oauth/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.getAuthenticatedUser.mockResolvedValue(user)
  })

  it('400 su redirect_uri non autorizzato', async () => {
    const res = await authorizeGET(new Request(`${ORIGIN}/api/mcp/oauth/authorize?redirect_uri=https://evil.example/cb&code_challenge=abc&code_challenge_method=S256`))
    expect(res.status).toBe(400)
  })

  it('400 senza PKCE S256', async () => {
    const res = await authorizeGET(new Request(`${ORIGIN}/api/mcp/oauth/authorize?redirect_uri=${encodeURIComponent(REDIRECT)}&code_challenge=abc`))
    expect(res.status).toBe(400)
  })

  it('rimanda a /login conservando la richiesta quando l utente non è autenticato', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue(null)
    const { challenge } = pkce()
    const res = await authorizeGET(new Request(`${ORIGIN}/api/mcp/oauth/authorize?redirect_uri=${encodeURIComponent(REDIRECT)}&code_challenge=${challenge}&code_challenge_method=S256&state=xyz`))
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toContain('/api/mcp/oauth/authorize')
    expect(location.searchParams.get('callbackUrl')).toContain('state=xyz')
  })

  it('access_denied se l utente non ha crediti', async () => {
    authMocks.getAuthenticatedUser.mockResolvedValue({ ...user, credits: 0 })
    const { challenge } = pkce()
    const res = await authorizeGET(new Request(`${ORIGIN}/api/mcp/oauth/authorize?redirect_uri=${encodeURIComponent(REDIRECT)}&code_challenge=${challenge}&code_challenge_method=S256`))
    const location = new URL(res.headers.get('location')!)
    expect(location.searchParams.get('error')).toBe('access_denied')
  })

  it('redirect con code e state per utente autenticato con crediti', async () => {
    const { challenge } = pkce()
    const res = await authorizeGET(new Request(`${ORIGIN}/api/mcp/oauth/authorize?redirect_uri=${encodeURIComponent(REDIRECT)}&code_challenge=${challenge}&code_challenge_method=S256&state=xyz`))
    const location = new URL(res.headers.get('location')!)
    expect(location.origin + location.pathname).toBe(REDIRECT)
    expect(location.searchParams.get('state')).toBe('xyz')
    const payload = verifyAuthCode(location.searchParams.get('code')!, { redirectUri: REDIRECT })
    expect(payload.userId).toBe('u1')
  })
})

describe('POST /api/mcp/oauth/token', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rifiuta client_credentials (bypass basato su email)', async () => {
    const res = await tokenPOST(new Request(`${ORIGIN}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: 'utente@esempio.it' }),
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('unsupported_grant_type')
  })

  it('scambia il codice con un access token quando il PKCE combacia', async () => {
    const { verifier, challenge } = pkce()
    const code = signAuthCode({ userId: 'u1', email: 'a@b.c', redirectUri: REDIRECT, codeChallenge: challenge })
    const res = await tokenPOST(new Request(`${ORIGIN}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier }),
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.token_type).toBe('Bearer')
    expect(body.access_token).toBeTruthy()
  })

  it('invalid_grant con code_verifier sbagliato', async () => {
    const { challenge } = pkce()
    const code = signAuthCode({ userId: 'u1', redirectUri: REDIRECT, codeChallenge: challenge })
    const res = await tokenPOST(new Request(`${ORIGIN}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: 'verificatore-sbagliato' }),
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_grant')
  })

  it('invalid_grant con redirect_uri diverso da quello del codice', async () => {
    const { verifier, challenge } = pkce()
    const code = signAuthCode({ userId: 'u1', redirectUri: REDIRECT, codeChallenge: challenge })
    const res = await tokenPOST(new Request(`${ORIGIN}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: 'http://localhost:9999/altro', code_verifier: verifier }),
    }))
    expect(res.status).toBe(400)
  })
})

describe('verifyPkce', () => {
  it('accetta solo il challenge corretto', () => {
    const { verifier, challenge } = pkce()
    expect(verifyPkce(challenge, verifier)).toBe(true)
    expect(verifyPkce(challenge, 'altro')).toBe(false)
  })
})
