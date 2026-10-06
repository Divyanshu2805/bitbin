# System Context

BitBin is a single Next.js 16 App Router application. There is no separate API server: pages are React Server Components that read from PostgreSQL through Prisma, writes go through **server actions**, and a small set of **route handlers** covers what needs a real HTTP endpoint — authentication flows, file transfer, export, Stripe, a token-authenticated API for the browser extension and the desktop app, and one cron endpoint.

## Inside the app

| Layer | Location | Responsibility |
|---|---|---|
| Proxy | `src/proxy.ts` | Next 16's replacement for `middleware.ts`. Redirects unauthenticated requests for `/dashboard/*` to sign-in |
| Pages | `src/app/**/page.tsx` | Call `auth()`, redirect when signed out, load data in parallel from `lib/db`, render |
| Server actions | `src/actions/*.ts` | Every write from the UI: validate with Zod, check the session, plan and rate limit, call `lib/db` |
| Route handlers | `src/app/api/**/route.ts` | Auth flows, upload / download, export, the item detail fetch, Stripe checkout / portal / webhook, the `/api/v1` token API, the demo-reset cron |
| Authentication | `src/auth.ts`, `src/auth.config.ts` | NextAuth v5 with the Prisma adapter and JWT sessions |
| Data access | `src/lib/db/*.ts` | Every Prisma query, always scoped by the caller's user id |
| Integrations | `src/lib/{stripe,r2,openai,email,resend,rate-limit,monitoring}.ts` | Thin wrappers around each third-party SDK |
| UI | `src/components/**` | Client and server components; shadcn/ui primitives in `components/ui` |

## External services

| Service | Used for | Called from | Required |
|---|---|---|---|
| PostgreSQL (Neon) | All application data | `lib/prisma.ts` through `@prisma/adapter-pg` | Yes |
| Upstash Redis | Sliding-window rate limits | `lib/rate-limit.ts` (REST) | No — rate limiting fails open without it |
| Cloudflare R2 | File and image binaries (private bucket) | `lib/r2.ts` (S3 API); every read goes through `/api/download` or the export | For files and images |
| Stripe | Subscriptions, Customer Portal | `/api/stripe/*`; Stripe calls back into `/api/webhooks/stripe` | For upgrades |
| OpenAI (or an OpenAI-compatible provider) | The four AI helpers | `src/actions/ai.ts` via `lib/openai.ts` | For AI |
| Resend | Verification and password-reset email | `lib/email.ts` | For email verification |
| GitHub OAuth | Sign-in provider | NextAuth | For GitHub sign-in |
| Sentry | Error monitoring | `src/instrumentation.ts`, `lib/monitoring.ts` | No — off without `SENTRY_DSN` |
| Vercel Analytics | Page analytics | `<Analytics />` in the root layout | No |
| Vercel Cron | Daily reset of the public demo account | `vercel.json` → `/api/cron/reset-demo`, authorised by `CRON_SECRET` | Only if the demo account is kept |
| GitHub Actions | CI: audit, lint, tests with a coverage floor, build | `.github/workflows/ci.yml` | No — development only |

## Clients

Besides the web UI, two small programs outside the Next build talk to BitBin through the [token API](../api/token-api.md) (`/api/v1`, Bearer tokens, Pro only):

- the Chrome / Edge **extension** (`extension/`) saves the selected text on a page — [flow](flows/save-from-extension.md);
- the Electron **desktop tray app** (`desktop/`) saves the clipboard from a global shortcut — [flow](flows/save-from-desktop.md).

## What BitBin is not

- **Not multi-user within an account.** Every row belongs to exactly one user; there is no sharing, team or public link.
- **Not offline.** Every read and write goes to the server; there is no client cache beyond what React holds for the current page.
- **Not a public API.** Server actions and most route handlers are for BitBin's own UI. The one exception is the small, versioned [token API](../api/token-api.md) (`/api/v1`) used by the extension and the desktop app; it stays backward compatible for them.

## Related

- [Module map](module-map.md) — the folders and routes behind each layer.
- [Security model](security-model.md) — what protects each layer.
- [Deployment](../deployment/README.md) — how this runs on Vercel.
