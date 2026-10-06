# Deploying to Vercel

The live site runs on Vercel at a subdomain of a domain you own (for example `bitbin.yourdomain.com`), with DNS on Cloudflare.

## Database

1. Create a Neon project and copy the **pooled** connection string (keep `?sslmode=require`).
2. Apply the migrations from your machine or CI:

   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate:deploy
   ```

3. Seed the system item types once — the app can't create items without them. `migrate deploy` doesn't generate the Prisma client, so generate it first or the seed fails with *Cannot find module '../src/generated/prisma/client'*:

   ```bash
   npx prisma generate
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

   The demo user the seed also creates is the public sandbox account (see [the demo account](../schema/migrations-and-seeding.md#the-demo-account)). If you keep it, set `CRON_SECRET` (below) so it is reset daily.

Use a separate Neon branch for local development, so test accounts and experimental migrations never reach live data. BitBin's own development setup does: the `dev` branch holds the schema and the seeded demo account only, its host is listed in `SAFE_DATABASE_HOSTS`, and the destructive scripts refuse any other host.

## Project

1. Import `github.com/Divyanshu2805/bitbin` into Vercel.
2. Framework preset: **Next.js**. Leave the build command as `npm run build` — it runs `prisma generate` first.
3. Add the environment variables below, then deploy.

`@vercel/analytics` is mounted in the root layout and starts reporting once the project is live; it needs no configuration.

## Environment variables

Every variable from [configuration](../local-development/configuration.md), with these production values:

| Variable | Production value |
|---|---|
| `AUTH_URL`, `NEXT_PUBLIC_APP_URL` | `https://bitbin.yourdomain.com` |
| `AUTH_SECRET` | A new secret — not the one from development |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | From a **production** GitHub OAuth app — see [providers](providers.md#github-oauth) |
| `SKIP_EMAIL_VERIFICATION` | `false`, or unset |
| `FROM_EMAIL` | An address on your verified Resend domain, e.g. `BitBin <noreply@bitbin.yourdomain.com>` — see [providers](providers.md#resend) |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the **dashboard** webhook endpoint, not the one `stripe listen` prints locally |
| `STRIPE_*` keys and price ids | Test-mode values until the Stripe account is activated for live mode — see [providers](providers.md#stripe-test-mode-in-production) |
| `UPSTASH_*` | Set them — without them production has no rate limiting at all |
| `SENTRY_DSN` | The DSN of your Sentry project; without it errors are only in Vercel's logs. See [Sentry](providers.md#sentry) |
| `CRON_SECRET` | A long random string (for example `openssl rand -hex 32`). Vercel's cron sends it to `/api/cron/reset-demo`, which resets the public demo account once a day (`vercel.json`). Without it that route refuses to run |
| `DATABASE_URL` | The Neon pooled URL |

Vercel keeps separate values for Production, Preview and Development. Point previews at a separate Neon branch and Stripe test keys, so preview deployments never touch production data.

## Custom domain (DNS on Cloudflare)

1. Vercel → Project → **Settings → Domains** → add `bitbin.yourdomain.com`.
2. Vercel shows a `CNAME` record (usually `cname.vercel-dns.com`). Add it in Cloudflare → DNS → Records.
3. Set the record to **DNS only (grey cloud)**, not *Proxied*. Proxying through Cloudflare in front of Vercel commonly causes redirect loops and certificate errors; Vercel issues the HTTPS certificate itself.

## Releasing a schema change

The build doesn't run migrations, so order matters:

1. Merge a migration that's **backwards compatible** with the code currently deployed (add columns as nullable or with defaults; don't drop or rename in the same step).
2. Run `npm run db:migrate:deploy` against production.
3. Let the deploy of the code that uses it go out.
4. Clean up (drop old columns) in a later migration, once no deployed code reads them.

## Related

- [Provider callbacks](providers.md) · [Smoke test](smoke-test.md)
