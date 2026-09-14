# Configuration

All configuration comes from environment variables, read from `.env` locally (git-ignored) and from the project settings on Vercel. `.env.example` has a `YOUR_…` placeholder for every variable.

## Core

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | Prisma (`src/lib/prisma.ts`, `prisma.config.ts`) | PostgreSQL connection string. For Neon, copy the pooled URL and keep `?sslmode=require` |
| `AUTH_SECRET` | Yes | NextAuth | Signs the session JWT. Generate with `npx auth secret`. Rotating it signs everyone out |
| `AUTH_URL` | Yes | NextAuth | Base URL of the app — `http://localhost:3000` locally |
| `NEXT_PUBLIC_APP_URL` | Yes | Email links, Stripe redirect URLs | Public URL used to build absolute links |

## Authentication

| Variable | Notes |
|---|---|
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Callback URL: `{AUTH_URL}/api/auth/callback/github` |
| `SKIP_EMAIL_VERIFICATION` | `"true"` marks new accounts verified at registration and lets unverified password accounts sign in. Development only |

## Email

| Variable | Notes |
|---|---|
| `RESEND_API_KEY` | Sends verification and password-reset emails (`src/lib/email.ts`) |
| `FROM_EMAIL` | Optional sender, e.g. `BitBin <noreply@bitbin.yourdomain.com>`. Defaults to Resend's shared sandbox sender, `BitBin <onboarding@resend.dev>` |

**Resend's sandbox sender only delivers to the address your Resend account was created with.** That's enough to test sign-up locally with your own email. To email anyone else, verify a domain in Resend (Domains → Add Domain) and set `FROM_EMAIL` to an address on it — a sender on an unverified domain is rejected with a `403`, and registration fails.

## Rate limiting

| Variable | Notes |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | From the Upstash console's REST section. If either is unset, still a `YOUR_…` placeholder, or invalid (say, a URL without `https://`), rate limiting is **disabled** — a warning or error is logged and every check passes. See [rate limits](../rate-limiting.md) |

## File storage (Cloudflare R2)

| Variable | Notes |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID; the S3 endpoint is built from it |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 → Manage API tokens, with *Object Read & Write* on the bucket |
| `R2_BUCKET_NAME` | The bucket uploads go to |
| `R2_PUBLIC_URL` | The bucket's public URL (`https://pub-….r2.dev` or a custom domain). Stored item URLs are built from it, and deletes derive the object key by stripping it — changing it later orphans existing items' files |

## Billing (Stripe)

| Variable | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` locally; `sk_live_…` in production once the Stripe account is activated — see [Stripe test mode in production](../deployment.md) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from `stripe listen` locally, or from the dashboard's webhook endpoint in production |
| `STRIPE_PRICE_ID_MONTHLY` | Price ID of the $8 / month plan |
| `STRIPE_PRICE_ID_YEARLY` | Price ID of the $72 / year plan |

## AI

`src/lib/openai.ts` works with OpenAI or any OpenAI-compatible API, such as OpenRouter.

| Variable | Notes |
|---|---|
| `OPENAI_API_KEY` | Key for the provider you use — an OpenAI key, or an OpenRouter `sk-or-…` key |
| `OPENAI_BASE_URL` | Optional. Unset for OpenAI; `https://openrouter.ai/api/v1` for OpenRouter |
| `AI_MODEL` | Optional, default `gpt-5-nano`. The model name as the provider spells it — prefixed on OpenRouter, e.g. `openai/gpt-5-nano` |

See [AI features](../ai-features.md) for choosing a model.

## What works without which key

| Missing | Effect |
|---|---|
| Resend | Registration only works with `SKIP_EMAIL_VERIFICATION="true"`; password-reset emails fail |
| `FROM_EMAIL` on a verified domain | Emails reach only the Resend account owner's address |
| GitHub | The GitHub button fails; email + password still works |
| Upstash | No rate limiting anywhere |
| R2 | File and image uploads and ZIP exports fail |
| Stripe | Checkout and the billing portal fail. The build still passes with a placeholder key |
| AI key | AI buttons show an error toast |

## Related

- [Deployment configuration](../deployment.md) — what changes for production.
- [Security guardrails](../README.md) — what must never be committed.
