import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Paquetes Node.js que solo deben ejecutarse en el servidor
  serverExternalPackages: ['postgres', '@react-pdf/renderer'],
  async headers() {
    return [
      {
        // Solo aplicar a páginas HTML, no a assets estáticos (CSS/JS/imágenes)
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
