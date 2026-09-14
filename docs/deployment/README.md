# Deployment

BitBin runs on **Vercel** — live at [bitbin.divyanshuagrahari.dev](https://bitbin.divyanshuagrahari.dev), with DNS on Cloudflare — and every stateful piece is a managed service: **Neon** PostgreSQL, **Cloudflare R2**, **Upstash** Redis, and Stripe, Resend, OpenAI and GitHub OAuth. Any Node 20 host that can run `next build` and `next start` works too; the provider callbacks are the same.

Pushing to `main` triggers a Vercel build (`npm run build` → `prisma generate && next build`) and deploy. Migrations and the seed are run by hand against the production `DATABASE_URL`; the build never touches the database.

## Pages

| Page | Covers |
|---|---|
| [Vercel](vercel.md) | The database, the Vercel project, production environment variables, the custom domain, releasing a schema change |
| [Provider callbacks](providers.md) | What to configure in GitHub, Stripe, Resend and R2 so they reach the deployed app — including the email domain and Stripe test mode |
| [Smoke test](smoke-test.md) | The checklist to run after a deploy |

## Related

- [Configuration](../local-development/configuration.md) — every environment variable.
- [Migrations and seeding](../schema/migrations-and-seeding.md)
- [Constraints and trade-offs](../known-gaps/constraints-and-trade-offs.md#operations) — what operating BitBin doesn't do yet.
