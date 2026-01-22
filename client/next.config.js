/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack configuration (replaces webpack config when using --turbo)
  experimental: {
    turbo: {
      // No special config needed for now
    },
  },
}

module.exports = nextConfig
