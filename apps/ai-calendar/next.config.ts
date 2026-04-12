import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: [
    '@idea-turbo/local-first-sdk',
    '@idea-turbo/sherpa-onnx',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  allowedDevOrigins: [
    'http://107.175.214.20:3001',
    'http://107.175.214.20:3000',
    'http://localhost:3001',
    'http://localhost:3000',
  ],
};

export default nextConfig;
