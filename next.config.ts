import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Paquetes Node.js que solo deben ejecutarse en el servidor
  serverExternalPackages: ['postgres'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Type', value: 'text/html; charset=utf-8' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
