import { NextResponse } from 'next/server'
import { issuerFromRequest } from '@/lib/mcp-oauth'

/**
 * Metadati dell'authorization server OAuth (RFC 8414).
 * Esposti anche su `/.well-known/oauth-authorization-server` (rewrite in
 * next.config.ts).
 *
 * L'issuer è derivato dall'host della richiesta quando `NEXT_PUBLIC_APP_URL`
 * non coincide: un issuer diverso dall'host effettivo fa fallire la
 * validazione del discovery da parte del client MCP.
 */
export async function GET(request: Request) {
  const issuer = issuerFromRequest(request)
  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/api/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/api/mcp/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    // Solo PKCE S256: i client MCP sono pubblici e non hanno un client_secret.
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp:read'],
  })
}
