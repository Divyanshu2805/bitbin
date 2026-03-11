# Deployment

The recommended setup is **Vercel** (app) + **Neon** (Postgres) +
Cloudflare R2 + Upstash + Stripe + Resend, served from a subdomain of a
domain you own (e.g. `bitbin.yourdomain.com`). Any Node 20 host that can run
`next start` works too.

## 1. Database

1. Create a Neon project and copy the pooled connection string.
2. Apply migrations from your machine or CI:

   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate:deploy
   ```

3. Seed the system item types once (the demo user is optional in production).
   `migrate deploy` doesn't generate the Prisma client, so generate it first
   or the seed fails with *Cannot find module '../src/generated/prisma/client'*:

   ```bash
   npx prisma generate
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

## 2. Vercel

1. Import `github.com/Divyanshu2805/bitbin`.
2. Framework preset: **Next.js**. The build command is already
   `prisma generate && next build` via `npm run build`.
3. Add every variable from [environment-variables.md](environment-variables.md).
   In production:
   - `AUTH_URL` and `NEXT_PUBLIC_APP_URL` → `https://bitbin.yourdomain.com`
   - `SKIP_EMAIL_VERIFICATION` → `false` (or leave unset)
   - `FROM_EMAIL` → an address on your verified Resend domain (step 4)
   - `STRIPE_WEBHOOK_SECRET` → the secret of the **dashboard** webhook
     (step 5), not the one `stripe listen` prints locally
4. Deploy.

## 3. Custom domain (DNS on Cloudflare)

1. Vercel → Project → **Settings → Domains** → add `bitbin.yourdomain.com`.
2. Vercel shows a `CNAME` record (usually `cname.vercel-dns.com`). Add it in
   Cloudflare → DNS → Records.
3. Set that record to **DNS only (grey cloud)**, not *Proxied*. Proxying
   through Cloudflare in front of Vercel commonly causes redirect loops and
   certificate errors. Vercel issues the HTTPS certificate on its own.

## 4. Email domain (Resend)

1. Resend → **Domains → Add Domain** → `bitbin.yourdomain.com` (a subdomain
   keeps email reputation separate from your main domain).
2. Add the SPF/DKIM records Resend shows in Cloudflare DNS (or use Resend's
   one-click Cloudflare setup). Leave them **DNS only**.
3. Once Resend marks the domain *Verified*, set
   `FROM_EMAIL="BitBin <noreply@bitbin.yourdomain.com>"` in Vercel and redeploy.

Until the domain is verified, Resend only delivers to your own address and
other people's sign-ups can't receive their verification link.

## 5. Third-party callbacks

| Service | Setting |
| --- | --- |
| GitHub OAuth | An OAuth App allows **one** callback URL, so create a second app for production with callback `https://bitbin.yourdomain.com/api/auth/callback/github`, and use its ID/secret in Vercel. Keep the dev app for `localhost:3000`. |
| Stripe | Developers → Webhooks → add `https://bitbin.yourdomain.com/api/webhooks/stripe` with `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Put **its** signing secret in `STRIPE_WEBHOOK_SECRET`. |
| R2 | Public bucket URL in `R2_PUBLIC_URL`. `next.config.ts` already allows `*.r2.dev` images |

### Stripe test mode in production

Stripe live mode needs an activated account (in some countries, including
India, new accounts are invite-only). The deployed app works fine with
**test-mode** keys: visitors can upgrade with the `4242 4242 4242 4242` test
card and no real money moves. When live mode is available, swap in the
`sk_live_`/`pk_live_` keys, recreate the product, prices and webhook in live
mode, and update the price IDs and webhook secret.

## 6. Smoke test

- [ ] Homepage loads over HTTPS on your domain and the ⌘K hint shows
- [ ] Register with a non-owner email → verification email arrives → sign in
- [ ] GitHub sign-in lands on `/dashboard` in one click
- [ ] Create a snippet, pin it, favorite it, find it with ⌘K
- [ ] Upgrade with a Stripe test card → `isPro` flips → file upload works
- [ ] Stripe dashboard → Webhooks shows the deliveries as succeeded (200)
- [ ] Export JSON downloads

## Vercel Analytics

`@vercel/analytics` is mounted in the root layout and starts reporting once the
project is deployed on Vercel. It needs no configuration.
