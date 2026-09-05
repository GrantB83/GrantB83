import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  
  // Webpack configuration for module resolution
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    };
    return config;
  },
};

export default nextConfig;
