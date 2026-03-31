import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['postgres', '@react-pdf/renderer', 'xlsx'],
}

export default nextConfig
