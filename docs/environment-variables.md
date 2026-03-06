# Environment variables

All configuration comes from `.env` (never committed). `.env.example` has a
placeholder for every variable. Replace each `YOUR_...` value with a real one.

## Required

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Prisma | Postgres connection string. Neon: copy the *pooled* URL and keep `?sslmode=require`. |
| `AUTH_SECRET` | NextAuth | Random 32+ byte secret. Generate with `npx auth secret`. |
| `AUTH_URL` | NextAuth | Base URL of the app (`http://localhost:3000` locally). |
| `NEXT_PUBLIC_APP_URL` | Emails, Stripe redirects | Public URL used to build absolute links. |

## Authentication

| Variable | Notes |
| --- | --- |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Callback: `{AUTH_URL}/api/auth/callback/github`. |
| `SKIP_EMAIL_VERIFICATION` | `"true"` lets unverified email/password users sign in. Use only in development. |

## Email

| Variable | Notes |
| --- | --- |
| `RESEND_API_KEY` | Sends verification and password-reset emails (`src/lib/email.ts`). Verify your sending domain in Resend for production. |

## Rate limiting

| Variable | Notes |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | From the Upstash console (REST API section). If unset, rate limiting is **disabled** (fails open) and a warning is logged. |

## File storage (Cloudflare R2)

| Variable | Notes |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 → Manage API tokens (Object Read & Write) |
| `R2_BUCKET_NAME` | Bucket for uploads |
| `R2_PUBLIC_URL` | Public bucket URL (`https://pub-xxxx.r2.dev` or a custom domain) |

## Billing (Stripe)

| Variable | Notes |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` locally, `sk_live_...` in production |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` / `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from `stripe listen` locally or the dashboard webhook in production |
| `STRIPE_PRICE_ID_MONTHLY` | Price ID of the $8/month plan |
| `STRIPE_PRICE_ID_YEARLY` | Price ID of the $72/year plan |

## AI

| Variable | Notes |
| --- | --- |
| `OPENAI_API_KEY` | Used by `src/lib/openai.ts`. Model is set in `AI_MODEL`. |

## What works without which key

| Missing | Effect |
| --- | --- |
| Resend | Sign-up works only with `SKIP_EMAIL_VERIFICATION="true"`; password reset emails fail |
| Upstash | No rate limiting |
| R2 | File/image uploads fail |
| Stripe | Upgrade/checkout and billing portal fail; build still passes if a dummy key is set |
| OpenAI | AI buttons show an error toast |
