# Deployment

BitBin runs on **Vercel** — live at [bitbin.divyanshuagrahari.dev](https://bitbin.divyanshuagrahari.dev), with DNS on Cloudflare — and every stateful piece is a managed service: **Neon** PostgreSQL, **Cloudflare R2**, **Upstash** Redis, and Stripe, Resend, OpenAI and GitHub OAuth. Any Node 20 host that can run `next build` and `next start` works too; the provider callbacks are the same.

Pushing to `main` triggers a Vercel build (`npm run build` → `prisma generate && next build`) and deploy. Migrations and the seed are run by hand against the production `DATABASE_URL`; the build never touches the database.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, on Node 22 with the npm cache:

| Step | Command | Fails when |
|---|---|---|
| Audit | `npm audit --omit=dev --audit-level=high` | a production dependency has a high or critical advisory |
| Lint | `npm run lint` | any ESLint error |
| Tests | `npm run test:coverage` | a test fails, or coverage drops below the floor in `vitest.config.ts` |
| Build | `npm run build` | a type error or a build failure |

The build step uses placeholder values for the environment variables (the tests mock every service, and the build never contacts one), so CI needs no repository secrets. The coverage report is attached to each run as an artifact. The README's CI badge shows the latest result on `main`.

CI and Vercel are independent: Vercel deploys every push to `main` whether or not CI has finished, and CI neither deploys nor migrates. Treat a red run as a reason to fix forward immediately. To make CI gate deploys, add a branch-protection rule that requires the `verify` check and deploy from pull requests.

GitHub's secret scanning with push protection is on for the repository.

## Pages

| Page | Covers |
|---|---|
| [Vercel](vercel.md) | The database, the Vercel project, production environment variables, the custom domain, releasing a schema change |
| [Provider callbacks](providers.md) | What to configure in GitHub, Stripe, Resend and R2 so they reach the deployed app — including the email domain and Stripe test mode |
| [Smoke test](smoke-test.md) | The checklist to run after a deploy |

## Related

- [Configuration](../local-development/configuration.md) — every environment variable.
- [Migrations and seeding](../schema/migrations-and-seeding.md)
- [Testing](../practices/testing.md#coverage-and-ci) — what CI runs and the coverage floor.
- [Constraints and trade-offs](../known-gaps/constraints-and-trade-offs.md#operations) — what operating BitBin doesn't do yet.
