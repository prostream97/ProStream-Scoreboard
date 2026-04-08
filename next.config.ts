import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.213'],
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}

export default nextConfig
