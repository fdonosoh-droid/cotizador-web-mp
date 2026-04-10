import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['postgres', '@react-pdf/renderer', 'xlsx'],
  outputFileTracingIncludes: {
    '/**': ['./INPUT_FILES.xlsx'],
  },
}

export default nextConfig
