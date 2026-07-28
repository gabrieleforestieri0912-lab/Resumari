import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/mcp/oauth/config',
      },
    ]
  },
}

export default nextConfig
