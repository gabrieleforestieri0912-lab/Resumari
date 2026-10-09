import crypto from 'crypto'
import jwt from 'jsonwebtoken'

/**
 * Utilità condivise dal flusso OAuth di Resumari (usato dal server MCP).
 *
 * Tutto è stateless: il codice di autorizzazione è un JWT firmato con
 * `JWT_SECRET`, non una voce in una Map in-memory. Su Vercel ogni richiesta
 * può atterrare su un'istanza diversa, quindi una Map farebbe fallire lo
 * scambio del codice ("invalid_grant") senza alcun errore apparente.
 */

/** Durata del codice di autorizzazione (breve, come da best practice OAuth). */
export const AUTH_CODE_TTL_SECONDS = 120
/** Durata del token d'accesso emesso per i client MCP. */
export const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 3600

function secret(): string {
  const value = process.env.JWT_SECRET
  if (!value) throw new Error('JWT_SECRET non configurata: il flusso OAuth non può firmare i token')
  return value
}

type AuthCodePayload = {
  typ: 'mcp_auth_code'
  userId: string
  email?: string
  clientId?: string
  redirectUri: string
  codeChallenge: string
}

/**
 * Origin dell'issuer OAuth.
 *
 * `NEXT_PUBLIC_APP_URL` viene usata solo se il suo host coincide con quello
 * della richiesta: un errore di battitura nell'env (è successo: un dominio
 * inesistente) renderebbe l'issuer diverso dall'host usato dal client e il
 * client MCP rifiuterebbe la configurazione.
 */
export function issuerFromRequest(request: Request): string {
  const origin = new URL(request.url).origin
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    try {
      if (new URL(configured).origin === origin) return origin
    } catch {
      // env malformata: si usa comunque l'origin della richiesta
    }
  }
  return origin
}

/**
 * `true` se il `redirect_uri` richiesto è accettabile.
 *
 * I client MCP locali (Claude Desktop, Cursor,...) callbacks su
 * `http://localhost:<porta>/...` con porta casuale: sono ammessi. Gli host
 * remoti devono essere esplicitamente autorizzati via
 * `MCP_OAUTH_REDIRECT_URIS` (lista separata da virgole), altrimenti il
 * codice di autorizzazione potrebbe essere dirottato verso un attaccante.
 */
export function isAllowedRedirectUri(redirectUri: string, origin: string): boolean {
  let url: URL
  try {
    url = new URL(redirectUri)
  } catch {
    return false
  }

  const allowList = (process.env.MCP_OAUTH_REDIRECT_URIS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (allowList.includes(url.origin)) return true
  if (url.origin === origin) return true
  // Callback locali dei client MCP: loopback su porta qualsiasi.
  if ((url.protocol === 'http:' || url.protocol === 'https:') && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    return true
  }
  return false
}

/** Firma un codice di autorizzazione monouso con TTL breve. */
export function signAuthCode(params: Omit<AuthCodePayload, 'typ'>): string {
  return jwt.sign({ typ: 'mcp_auth_code', ...params }, secret(), { expiresIn: AUTH_CODE_TTL_SECONDS })
}

/**
 * Verifica il codice di autorizzazione e restituisce il payload.
 * Il codice non viene "invalidato" (è stateless): la protezione dalla
 * riutilizzazione è il TTL di 120 secondi e la corrispondenza con
 * `redirect_uri`/`client_id`/`code_verifier` richiesti al momento dello scambio.
 */
export function verifyAuthCode(code: string, expected: { redirectUri: string; clientId?: string }) {
  const payload = jwt.verify(code, secret()) as AuthCodePayload
  if (payload.typ !== 'mcp_auth_code') throw new Error('invalid_grant')
  if (payload.redirectUri !== expected.redirectUri) throw new Error('invalid_grant')
  if (expected.clientId && payload.clientId && payload.clientId !== expected.clientId) {
    throw new Error('invalid_grant')
  }
  return payload
}

/** Verifica PKCE S256: `S256(code_verifier) === code_challenge`. */
export function verifyPkce(codeChallenge: string, codeVerifier: string): boolean {
  const computed = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return computed === codeChallenge
}

/** Firma il token d'accesso usato dai client MCP per autenticare le chiamate. */
export function signAccessToken(params: { userId: string; email?: string; clientId?: string }) {
  return jwt.sign({ typ: 'mcp_access', scope: 'mcp:read', ...params }, secret(), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  })
}

/** Verifica un token d'accesso MCP e ne restituisce il payload. */
export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, secret()) as { typ?: string; userId?: string }
  if (payload.typ !== 'mcp_access' || !payload.userId) throw new Error('invalid_token')
  return payload
}
