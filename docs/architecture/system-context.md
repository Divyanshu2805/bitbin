# System Context

BitBin is a single Next.js 16 App Router application. There is no separate API server: pages are React Server Components that read from PostgreSQL through Prisma, writes go through **server actions**, and a small set of **route handlers** covers what needs a real HTTP endpoint — authentication flows, file transfer, export, and Stripe.

## Inside the app

| Layer | Location | Responsibility |
|---|---|---|
| Proxy | `src/proxy.ts` | Next 16's replacement for `middleware.ts`. Redirects unauthenticated requests for `/dashboard/*` to sign-in |
| Pages | `src/app/**/page.tsx` | Call `auth()`, redirect when signed out, load data in parallel from `lib/db`, render |
| Server actions | `src/actions/*.ts` | Every write from the UI: validate with Zod, check the session, plan and rate limit, call `lib/db` |
| Route handlers | `src/app/api/**/route.ts` | Auth flows, upload / download, export, the item detail fetch, Stripe checkout / portal / webhook |
| Authentication | `src/auth.ts`, `src/auth.config.ts` | NextAuth v5 with the Prisma adapter and JWT sessions |
| Data access | `src/lib/db/*.ts` | Every Prisma query, always scoped by the caller's user id |
| Integrations | `src/lib/{stripe,r2,openai,email,resend,rate-limit}.ts` | Thin wrappers around each third-party SDK |
| UI | `src/components/**` | Client and server components; shadcn/ui primitives in `components/ui` |

## External services

| Service | Used for | Called from | Required |
|---|---|---|---|
| PostgreSQL (Neon) | All application data | `lib/prisma.ts` through `@prisma/adapter-pg` | Yes |
| Upstash Redis | Sliding-window rate limits | `lib/rate-limit.ts` (REST) | No — rate limiting fails open without it |
| Cloudflare R2 | File and image binaries | `lib/r2.ts` (S3 API); images are also served straight from the public bucket URL | For files and images |
| Stripe | Subscriptions, Customer Portal | `/api/stripe/*`; Stripe calls back into `/api/webhooks/stripe` | For upgrades |
| OpenAI (or an OpenAI-compatible provider) | The four AI helpers | `src/actions/ai.ts` via `lib/openai.ts` | For AI |
| Resend | Verification and password-reset email | `lib/email.ts` | For email verification |
| GitHub OAuth | Sign-in provider | NextAuth | For GitHub sign-in |
| Vercel Analytics | Page analytics | `<Analytics />` in the root layout | No |

## What BitBin is not

- **Not multi-user within an account.** Every row belongs to exactly one user; there is no sharing, team or public link.
- **Not offline.** Every read and write goes to the server; there is no client cache beyond what React holds for the current page.
- **Not a separate API.** Server actions and route handlers are for BitBin's own UI; there are no API keys or public, versioned endpoints.

## Related

- [Module map](module-map.md) — the folders and routes behind each layer.
- [Security model](security-model.md) — what protects each layer.
- [Deployment](../deployment/README.md) — how this runs on Vercel.
