# 0010. A Content Security Policy that blocks third parties, without script nonces

**Status:** Accepted

## Context

The app sent only the non-script parts of a CSP (`frame-ancestors`, `base-uri`, `object-src`), because a full policy has two costs:

- the code editor loaded from a public CDN, so the policy had to name it, and nothing checked that what the CDN served was what we expected (a supply-chain risk);
- a strict `script-src` needs a nonce on every inline script (the theme and view-mode bootstrap, the structured data, Next's own hydration data), and a per-request nonce forces **every page to render dynamically**, giving up the static homepage, auth and legal pages and their caching.

## Decision

Send a real policy (`src/lib/csp.ts`, applied from `next.config.ts`): `default-src 'self'`, `connect-src 'self'`, `frame-src 'self'`, `worker-src 'self' blob:`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `img-src` limited to this site, data and blob URLs and GitHub's avatar host, and `script-src 'self' 'unsafe-inline'` with **no `eval`**. Cloudflare's challenge origin is added only when Turnstile is configured.

Remove the CDN: `scripts/copy-monaco.mjs` copies the pinned `monaco-editor` into `public/monaco` before `dev` and `build`, and the editor loads from `/monaco/vs`. File downloads keep a minimal policy, because the download route sets its own sandboxing policy and a PDF viewer needs room.

## Consequences

- No third-party script can run in a page, and injected code can't make a request to or post data to another origin (`connect-src 'self'`). The editor's version is the one in `package.json`, not whatever a CDN serves.
- **An injected inline script would still run.** The policy limits damage; it does not replace escaping. Today every place that renders other people's text goes through React (which escapes it), and markdown is rendered without raw HTML, so there is no known injection. This is an accepted trade-off.
- The static pages stay static, and Lighthouse numbers are unaffected.
- A new third-party script, font host or API call from the browser needs a deliberate edit to `csp.ts`, which is the point.
- Moving to nonces later would mean making the layouts dynamic (or hashing the inline scripts at build time); this decision doesn't prevent that.
- `public/monaco` is generated (about 13 MB, git-ignored); a start that skips `npm run dev` / `build` needs `node scripts/copy-monaco.mjs`.
