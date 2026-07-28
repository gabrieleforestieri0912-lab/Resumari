import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://resumari.it'
  return NextResponse.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/mcp/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/mcp/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
    scopes_supported: ['openid', 'profile', 'email'],
  })
}
