# Constraints and Trade-offs

Limits that come from how BitBin is built, not from missing work. Each is fine at today's scale; each names what would have to change.

## Sessions and plans

- **A database read per session evaluation.** The `jwt` callback re-reads `isPro` and `sessionVersion` every time it runs ([ADR 0003](../architecture/decisions/0003-jwt-sessions-with-live-plan.md)). Cheap on a primary key, but it's a query on every authenticated request and proxy check. Caching it would reintroduce the stale-plan problem the design avoids.

## Billing

- **Webhooks cost a Stripe call.** Each plan-changing event lists the customer's subscriptions from Stripe to compute `isPro`. That makes handlers idempotent and order-independent, at the price of one API call per event and a dependency on Stripe being reachable (a failure returns `500` and Stripe retries). Processed event ids aren't recorded.
- **One flag for the whole plan.** `isPro` is a boolean; there's no record of which price, period end or trial state a user has. A second paid tier or proration rules would need a subscription table.

## Storage

- **Files are served through the app.** The bucket is private ([ADR 0004](../architecture/decisions/0004-files-in-r2-behind-a-download-proxy.md)), so every image and download passes through a function: no CDN cache, no image resizing, and function time proportional to the file (images cap at 5 MB, files at 10 MB). If that becomes a cost, use short-lived presigned URLs for large downloads from the same ownership check.

## Data and scale

- **Exports and imports run in one function call.** A ZIP export fetches every file from R2 and compresses it inside a single serverless invocation, and an import is one transaction capped at 5,000 entries, so a very large library can hit Vercel's function time or memory limit.

## Operations

- **Rate limits need Upstash to be strong** ([ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md)): without the `UPSTASH_*` variables production falls back to a per-instance in-memory limiter (each serverless instance counts separately, so an attacker gets a multiple of a limit). A Redis *error* fails closed for the credential limits, so an outage blocks sign-in and registration until it ends.
- **Errors are tracked, nothing else is.** Sentry (`lib/monitoring.ts`) captures server errors and every `console.error`, with cookies, tokens and personal data stripped, and alert rules for 5xx and webhook failures. There are no metrics, uptime checks or tracing; Vercel's function logs hold the rest.
- **Development has its own database branch; the live site has one production database.** Local work uses a Neon `dev` branch (schema only, no user data). `db:seed` and `db:cleanup` refuse to run against a host that isn't listed in `SAFE_DATABASE_HOSTS` ([`lib/db-safety.ts`](../../src/lib/db-safety.ts)). There is no staging environment: every push to `main` deploys straight to production.
- **Migrations are applied by hand** before a deploy; nothing enforces the order ([releasing a schema change](../deployment/vercel.md#releasing-a-schema-change)).
- **CI checks; it doesn't deploy or migrate.** Vercel deploys independently, so a red CI run doesn't stop a deploy ([ADR 0009](../architecture/decisions/0009-ci-checks-and-a-coverage-floor.md)).
- **Unit tests cover server code only.** Coverage spans `src/actions`, `src/lib` and `src/app/api`. Components, the proxy, NextAuth callbacks, the extension and real third-party services are checked by hand, and there are no end-to-end tests.
