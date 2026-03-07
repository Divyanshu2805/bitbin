# Deployment

The recommended setup is **Vercel** (app) + **Neon** (Postgres) +
Cloudflare R2 + Upstash + Stripe + Resend. Any Node 20 host that can run
`next start` works too.

## 1. Database

1. Create a Neon project and copy the pooled connection string.
2. Apply migrations from your machine or CI:

   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate:deploy
   ```

3. Seed the system item types once (the demo user is optional in production):

   ```bash
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

## 2. Vercel

1. Import `github.com/Divyanshu2805/bitbin`.
2. Framework preset: **Next.js**. The build command is already
   `prisma generate && next build` via `npm run build`.
3. Add every variable from [environment-variables.md](environment-variables.md).
   In production:
   - `AUTH_URL` and `NEXT_PUBLIC_APP_URL` → `https://YOUR_DOMAIN`
   - `SKIP_EMAIL_VERIFICATION` → `false` (or leave unset)
   - Stripe keys → **live** keys
4. Deploy.

## 3. Third-party callbacks

| Service | Setting |
| --- | --- |
| GitHub OAuth | Callback URL `https://YOUR_DOMAIN/api/auth/callback/github` |
| Stripe | Webhook `https://YOUR_DOMAIN/api/webhooks/stripe` with `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET` |
| Resend | Verify the sending domain and update `FROM_EMAIL` in `src/lib/email.ts` if you use your own |
| R2 | Public bucket URL in `R2_PUBLIC_URL`. `next.config.ts` already allows `*.r2.dev` images |

## 4. Smoke test

- [ ] Homepage loads and the ⌘K hint shows
- [ ] Register → verification email arrives → sign in
- [ ] GitHub sign-in lands on `/dashboard` in one click
- [ ] Create a snippet, pin it, favorite it, find it with ⌘K
- [ ] Upgrade with a Stripe test card → `isPro` flips → file upload works
- [ ] Export JSON downloads

## Vercel Analytics

`@vercel/analytics` is mounted in the root layout and starts reporting once the
project is deployed on Vercel. It needs no configuration.
