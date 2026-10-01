# Constraints and Trade-offs

Limits that come from how BitBin is built, not from missing work. Each is fine at today's scale; each names what would have to change.

## Sessions and plans

- **A database read per session evaluation.** The `jwt` callback re-reads `isPro` every time it runs ([ADR 0003](../architecture/decisions/0003-jwt-sessions-with-live-plan.md)). Cheap on a primary key, but it's a query on every authenticated request and proxy check. Caching it would reintroduce the stale-plan problem the design avoids.
- **Session revocation is all-or-nothing.** A password change or reset ends every session for the user (`users.sessionVersion`), but there's no per-device list or "sign out everywhere" button.

## Billing

- **Webhooks cost a Stripe call.** Each plan-changing event lists the customer's subscriptions from Stripe to compute `isPro`. That makes handlers idempotent and order-independent, at the price of one API call per event and a dependency on Stripe being reachable (a failure returns `500` and Stripe retries). Processed event ids still aren't recorded.
- **One flag for the whole plan.** `isPro` is a boolean; there's no record of which price, period end or trial state a user has. A second paid tier or proration rules would need a subscription table.

## Storage

- **Files are served through the app.** The bucket is private ([ADR 0004](../architecture/decisions/0004-files-in-r2-behind-a-download-proxy.md)), so every image and download passes through a function: no CDN cache, no image resizing, and function time proportional to the file (images cap at 5 MB, files at 10 MB). If that becomes a cost, use short-lived presigned URLs for large downloads from the same ownership check.
- **Orphans accumulate.** Uploads whose item is never created, failed deletes, and deleted accounts all leave objects in R2. There's no sweeper.

## Data and scale

- **Search loads everything.** The ⌘K index is every item and collection the user has, sent on each dashboard load and filtered in the browser. Fine for hundreds of items; thousands would call for server-side search (PostgreSQL full-text or `pg_trgm`).
- **Offset pagination.** `?page=` with `skip` — simple, but deep pages get slower and rows shift while paging.
- **Plan limits are exact for Free creates, not for every path.** Creating an item or a collection, and importing, re-check the cap in a transaction under a lock on the user's row, so concurrent requests can't overshoot it. The cheaper pre-check in `lib/usage.ts` still runs first for a quick message. Any new way to create items must go through the same locked path.
- **Global tags.** Tag names are shared by everyone and never deleted. Harmless today; per-user tag management (rename, merge, delete) would need per-user tags.
- **Exports run in one function call.** A ZIP export fetches every file from R2 and compresses it inside a single serverless invocation, so a large library can hit Vercel's function time or memory limit.

## Operations

- **Rate limits fail open when unconfigured** ([ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md)): a deploy without the `UPSTASH_*` variables has no brute-force protection. A Redis *error* fails closed for the credential limits, so an outage blocks sign-in and registration until it ends.
- **Logs only.** No error tracker, metrics or alerting — failures are visible only in Vercel's function logs.
- **One database for development and production** today — see [not yet built](not-yet-built.md#email-and-operations).
- **Manual migrations.** Migrations are applied by hand before a deploy; nothing enforces the order.
- **No CI.** Lint, tests and build are run locally before pushing; nothing runs them on push.
