import { NextResponse } from 'next/server'

/**
 * Metadati della risorsa protetta MCP (RFC 9728).
 *
 * È il documento che il client MCP legge per sapere quale authorization
 * server usare: senza `/.well-known/oauth-protected-resource` i client non
 * trovano l'OAuth e la connessione fallisce con errore di autenticazione.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ['mcp:read'],
    bearer_methods_supported: ['header'],
    resource_name: 'Resumari MCP',
  })
}
