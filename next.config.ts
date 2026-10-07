import type { NextConfig } from 'next';

import { LIGHT_CSP, buildContentSecurityPolicy } from './src/lib/csp';

// Headers for every response. Framing is limited to the app itself (the PDF preview
// is an iframe of /api/download), never other sites.
const baseHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

// The full policy for pages (see src/lib/csp.ts). Read when the server starts, so a Turnstile
// site key set in the environment is allowed through.
const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const pagePolicy = buildContentSecurityPolicy({
  turnstile: !!turnstileKey && !turnstileKey.startsWith('YOUR_'),
  dev: process.env.NODE_ENV !== 'production',
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  // The extension download route zips extension/ at runtime; ship those files with it
  outputFileTracingIncludes: {
    '/api/extension/download': ['./extension/**/*'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: baseHeaders },
      // Pages and API responses get the full policy ...
      { source: '/((?!api/download/).*)', headers: [{ key: 'Content-Security-Policy', value: pagePolicy }] },
      // ... but file downloads and previews keep a minimal one: the route sets its own sandboxing
      // policy for the types it previews, and a PDF viewer needs room to work
      { source: '/api/download/:path*', headers: [{ key: 'Content-Security-Policy', value: LIGHT_CSP }] },
    ];
  },
  // No remote image hosts: files live in a private bucket and are shown through
  // /api/download (rendered with `unoptimized`, since they are per-user)
};

export default nextConfig;
