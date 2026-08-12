import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the Turbopack workspace root explicitly.
  // This project lives inside a folder with many sibling projects
  // (C:\Users\Utente\Documents\Progetti\Web), and Turbopack's automatic
  // workspace-root detection can pick the wrong directory if a stray lockfile
  // ever appears in an ancestor folder. That misdetection causes runaway
  // module resolution (100% CPU / RAM exhaustion / frozen computer).
  // Setting turbopack.root makes the root deterministic and disables the
  // "inferred your workspace root" warning path entirely.
  turbopack: {
    root: import.meta.dirname,
  },
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
