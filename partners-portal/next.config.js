/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker deployment
  output: 'standalone',

  reactStrictMode: true,

  // Disable static image optimization for flexibility
  images: {
    domains: ['localhost', 'pdflab.pro', 'partners.pdflab.pro'],
    unoptimized: true,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006',
  },
}

module.exports = nextConfig
