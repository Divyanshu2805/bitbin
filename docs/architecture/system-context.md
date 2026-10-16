# System Context

BitBin is a single Next.js 16 App Router application. There is no separate API server: pages are React Server Components that read from PostgreSQL through Prisma, writes go through **server actions**, and a small set of **route handlers** covers what needs a real HTTP endpoint — authentication flows, file transfer, export and ZIP import, Stripe, a token-authenticated API for the browser extension and the desktop app, and two cron endpoints.

## Inside the app

| Layer | Location | Responsibility |
|---|---|---|
| Proxy | `src/proxy.ts` | Next 16's replacement for `middleware.ts`. Redirects unauthenticated requests for `/dashboard/*` to sign-in |
| Pages | `src/app/**/page.tsx` | Call `auth()`, redirect when signed out, load data in parallel from `lib/db`, render |
| Server actions | `src/actions/*.ts` | Every write from the UI: validate with Zod, check the session, plan and rate limit, call `lib/db` |
| Route handlers | `src/app/api/**/route.ts` | Auth flows, upload / download, export and ZIP import, the item detail fetch, the extension download, Stripe checkout / portal / webhook, the `/api/v1` token API, the demo-reset and file-sweep crons |
| Authentication | `src/auth.ts`, `src/auth.config.ts` | NextAuth v5 with the Prisma adapter and JWT sessions |
| Data access | `src/lib/db/*.ts` | Every Prisma query, always scoped by the caller's user id (the only exceptions are the token lookup and the cron jobs) |
| Integrations | `src/lib/{stripe,r2,openai,email,resend,rate-limit,monitoring}.ts` | Thin wrappers around each third-party SDK |
| Shared logic | `src/lib/{item-create,collection-create,ai-tags,ai-description,file-ingest}.ts` | Item and collection creation, AI helpers and file checks shared by the actions, the upload route and `/api/v1`, so no path skips a check |
| UI | `src/components/**` | Client and server components; shadcn/ui primitives in `components/ui` |

## External services

| Service | Used for | Called from | Required |
|---|---|---|---|
| PostgreSQL (Neon) | All application data | `lib/prisma.ts` through `@prisma/adapter-pg` | Yes |
| Upstash Redis | Sliding-window rate limits | `lib/rate-limit.ts` (REST) | Recommended — without it development has no limits and production a weaker per-instance limiter |
| Cloudflare R2 | File and image binaries (private bucket) | `lib/r2.ts` (S3 API); every read goes through `/api/download` or the export | For files and images |
| Stripe | Subscriptions, Customer Portal | `/api/stripe/*`; Stripe calls back into `/api/webhooks/stripe` | For upgrades |
| OpenAI (or an OpenAI-compatible provider) | The four AI helpers | `src/actions/ai.ts`, `lib/ai-tags.ts`, `lib/ai-description.ts` via `lib/openai.ts` | For AI |
| Resend | Verification and password-reset email | `lib/email.ts` | For email verification |
| GitHub OAuth | Sign-in provider | NextAuth | For GitHub sign-in |
| Sentry | Error monitoring | `src/instrumentation.ts`, `lib/monitoring.ts` | No — off without `SENTRY_DSN` |
| Vercel Analytics | Page analytics | `<Analytics />` in the root layout | No |
| Vercel Cron | Daily reset of the public demo account (21:00 UTC); weekly sweep of stored files no item points at (Sundays 03:00 UTC) | `vercel.json` → `/api/cron/reset-demo`, `/api/cron/sweep-files`, both authorised by `CRON_SECRET` | `CRON_SECRET` is needed for either to run |
| GitHub Actions | CI: audit, lint, tests with a coverage floor, build; the desktop installer release | `.github/workflows/ci.yml`, `desktop-release.yml` | No — development only |

## Clients

Besides the web UI, two small programs outside the Next build talk to BitBin through the [token API](../api/token-api.md) (`/api/v1`, Bearer tokens, Pro only):

- the Chrome / Edge **extension** (`extension/`) saves the selected text on a page — [flow](flows/save-from-extension.md);
- the Electron **desktop tray app** (`desktop/`) saves the clipboard, a screenshot or a file from a global shortcut — [flow](flows/save-from-desktop.md).

## Related

- [Module map](module-map.md) — the folders and routes behind each layer.
- [Security model](security-model.md) — what protects each layer.
- [Deployment](../deployment/README.md) — how this runs on Vercel.
