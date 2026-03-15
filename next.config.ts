import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  devIndicators: false,
  // The extension download route zips extension/ at runtime; ship those files with it
  outputFileTracingIncludes: {
    '/api/extension/download': ['./extension/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
    ],
  },
};

export default nextConfig;
