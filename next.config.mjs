/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Disable static optimization for API routes during build
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig
