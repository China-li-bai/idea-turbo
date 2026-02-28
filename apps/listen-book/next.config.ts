import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  allowedDevOrigins: ['192.168.0.101'],
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  compress: true,
  
  productionBrowserSourceMaps: false,
};

export default nextConfig;
