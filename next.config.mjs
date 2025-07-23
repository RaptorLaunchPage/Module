/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Skip API routes during build if Supabase credentials are missing
  generateBuildId: () => 'build',
  ...((!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && {
    // Skip static generation for API routes when credentials are missing
    exportPathMap: async function (defaultPathMap, { dev, dir, outDir, distDir, buildId }) {
      // Filter out API routes that require Supabase
      const filteredPaths = Object.keys(defaultPathMap).reduce((acc, path) => {
        if (!path.startsWith('/api/')) {
          acc[path] = defaultPathMap[path]
        }
        return acc
      }, {})
      return filteredPaths
    }
  })
}

export default nextConfig
