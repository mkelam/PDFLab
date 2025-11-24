/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: false, // Enable Next.js image optimization
    formats: ['image/webp', 'image/avif'],
  },
  output: 'standalone',

  // Webpack configuration for bundle optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize client-side bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // React/Next.js framework bundle
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Radix UI components (used heavily)
            radix: {
              name: 'radix-ui',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              priority: 35,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Lucide icons
            lucide: {
              name: 'lucide-icons',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 35,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Large libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                if (!module.context) return 'npm.unknown'
                const match = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )
                if (!match || !match[1]) return 'npm.unknown'
                const packageName = match[1]
                return `npm.${packageName.replace('@', '')}`
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common components used across multiple pages
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    return config
  },
}

export default nextConfig
