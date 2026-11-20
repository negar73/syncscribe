import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle for the multi-stage Dockerfile.
  output: 'standalone',
}

export default nextConfig
