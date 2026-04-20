import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@idea-turbo/local-first-sdk',
    '@idea-turbo/sherpa-onnx',
    '@idea-turbo/voice-input',
    '@idea-turbo/brain-trust',
    '@idea-turbo/wisdom-ui',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  allowedDevOrigins: isDev ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://107.175.214.20:3000',
    'http://107.175.214.20:3001',
  ] : undefined,
  headers: isDev
    ? async () => []
    : async () => [
        {
          source: '/sherpa-worker.js',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/javascript',
            },
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/sherpa-onnx-asr.js',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/javascript',
            },
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/sherpa-onnx-wasm-main-asr.js',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/javascript',
            },
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/sherpa-onnx-wasm-main-asr.wasm',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/wasm',
            },
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '/:path*.data',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/octet-stream',
            },
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ],
};

export default nextConfig;
