/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mui/material', '@mui/x-data-grid', '@mui/x-date-pickers'],
  // Turbopack configuration (Next.js 16+)
  turbopack: {},
}

export default nextConfig
