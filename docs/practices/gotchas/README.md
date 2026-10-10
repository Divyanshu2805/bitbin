# Known Pitfalls

Traps this stack has hit — mostly ones that fail silently or far from their cause. Check here first when something "should work" but doesn't.

| Page | Covers |
|---|---|
| [Next.js and NextAuth](nextjs-and-auth.md) | The edge-safe config split, `proxy.ts`, the app shell, server-side GitHub sign-in, sessions, `'use server'` exports, the React Compiler |
| [Prisma and PostgreSQL](prisma.md) | The generated client, migrations, nullable unique keys, the seed, transactions, locked limits, the search indexes |
| [Integrations](integrations.md) | Stripe webhooks, R2 URLs, Upstash failing open, Resend, AI providers without JSON mode |
| [Security mechanisms](security-and-csp.md) | Migrating before deploying, the generated editor copy, the CSP trade-off, the download route's own policy, re-encoded uploads, normalised email keys |
| [Tooling and CI](tooling-and-ci.md) | The coverage floor, CI placeholders, the audit level, `.npmrc`, lockfile line endings, measuring Lighthouse, file-name case, the request-body limit |
