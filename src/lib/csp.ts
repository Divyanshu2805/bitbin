// The Content Security Policy sent with every page (next.config.ts). Kept here so it can be tested.
//
// What it does: scripts, styles, fonts, images, connections, frames and workers may only come from
// this site (plus, when Turnstile is on, Cloudflare's challenge, and GitHub's avatar host for
// profile pictures). No `eval`, no plugins, no third-party script, and nothing can post data to
// another origin with fetch. The code editor is served from this site too (public/monaco), which is
// why no CDN appears here.
//
// What it does not do: `script-src` allows `'unsafe-inline'`, so an injected inline script would
// still run. A strict policy needs a per-request nonce on every inline script, and a nonce makes
// every page render dynamically, which gives up the static homepage, auth and legal pages. The
// pages that show other people's text (items, collections) render it through React, which escapes
// it, and markdown is rendered without raw HTML, so there is no known injection to defend against;
// the policy limits what an injection could do, it isn't the only protection.

export const LIGHT_CSP = "frame-ancestors 'self'; base-uri 'self'; object-src 'none'";

export interface CspOptions {
  /** Turnstile is configured: allow Cloudflare's challenge script, frame and verification call. */
  turnstile?: boolean;
  /** `next dev` needs eval for React refresh and a websocket for hot reload. */
  dev?: boolean;
}

const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
const GITHUB_AVATARS = 'https://avatars.githubusercontent.com';

export function buildContentSecurityPolicy({ turnstile = false, dev = false }: CspOptions = {}): string {
  const challenge = turnstile ? ` ${TURNSTILE_ORIGIN}` : '';
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}${challenge}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${GITHUB_AVATARS}`,
    "font-src 'self' data:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}${challenge}`,
    `frame-src 'self'${challenge}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ];
  return directives.join('; ');
}
