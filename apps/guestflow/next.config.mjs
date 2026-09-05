/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'Browns GuestFlow',
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV || 'development',
  },
};

export default nextConfig;
