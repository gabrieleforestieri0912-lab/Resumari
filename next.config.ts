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
  // Routes solo in inglese: redirect alias italiani -> inglesi
  async redirects() {
    return [
      { source: '/impostazioni', destination: '/settings', permanent: true },
      { source: '/impostazioni/:path*', destination: '/settings/:path*', permanent: true },
      { source: '/profilo', destination: '/settings', permanent: true },
      { source: '/profilo/:path*', destination: '/settings/:path*', permanent: true },
      { source: '/trascrizioni', destination: '/videos', permanent: true },
      { source: '/trascrizioni/:path*', destination: '/videos/:path*', permanent: true },
      { source: '/cruscotto', destination: '/dashboard', permanent: true },
      { source: '/bacheca', destination: '/dashboard', permanent: true },
      { source: '/contatti', destination: '/contact', permanent: true },
      { source: '/contatto', destination: '/contact', permanent: true },
      { source: '/accedi', destination: '/login', permanent: true },
      { source: '/registrati', destination: '/signup', permanent: true },
      { source: '/registrazione', destination: '/signup', permanent: true },
      { source: '/prezzi', destination: '/#pricing', permanent: true },
      { source: '/prezzo', destination: '/#pricing', permanent: true },
      { source: '/strumenti', destination: '/tools', permanent: true },
      { source: '/strumenti/:path*', destination: '/tools/:path*', permanent: true },
      { source: '/supporto', destination: '/support', permanent: true },
      { source: '/termini', destination: '/terms', permanent: true },
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/chiavi-api', destination: '/api-keys', permanent: true },
    ]
  },
}

export default nextConfig
