# Constraints and Trade-offs

Limits that come from how BitBin is built, not from missing work. Each is fine at today's scale; each names what would have to change.

## Sessions and plans

- **A database read per session evaluation.** The `jwt` callback re-reads `isPro` every time it runs ([ADR 0003](../architecture/decisions/0003-jwt-sessions-with-live-plan.md)). Cheap on a primary key, but it's a query on every authenticated request and proxy check. Caching it would reintroduce the stale-plan problem the design avoids.
- **No session revocation.** JWTs can't be invalidated server-side, so "sign out everywhere" isn't possible, and a password change doesn't end other sessions. Fixing this means database sessions or a token version checked in `jwt`.

## Billing

- **Webhooks aren't idempotent or ordered.** Each event is applied as it arrives: nothing records processed event ids, and nothing compares timestamps. A retried or out-of-order event can briefly — or, for a late `invoice.paid` after a cancellation, lastingly — set the wrong `isPro`. Storing processed event ids and deriving `isPro` from the subscription's current status (fetched from Stripe) would make it robust.
- **One flag for the whole plan.** `isPro` is a boolean; there's no record of which price, period end or trial state a user has. A second paid tier or proration rules would need a subscription table.

## Storage

- **Public bucket.** Every file and image is readable by anyone with its URL ([ADR 0004](../architecture/decisions/0004-files-in-r2-behind-a-download-proxy.md)). Private files need a private bucket and signed URLs, and then images can't render from a plain URL.
- **Orphans accumulate.** Uploads whose item is never created, failed deletes, and deleted accounts all leave objects in R2. There's no sweeper.

## Data and scale

- **Search loads everything.** The ⌘K index is every item and collection the user has, sent on each dashboard load and filtered in the browser. Fine for hundreds of items; thousands would call for server-side search (PostgreSQL full-text or `pg_trgm`).
- **Offset pagination.** `?page=` with `skip` — simple, but deep pages get slower and rows shift while paging.
- **Plan limits aren't atomic.** Counting then inserting lets concurrent requests overshoot the Free caps by a few rows.
- **Global tags.** Tag names are shared by everyone and never deleted. Harmless today; per-user tag management (rename, merge, delete) would need per-user tags.
- **Exports run in one function call.** A ZIP export fetches every file from R2 and compresses it inside a single serverless invocation, so a large library can hit Vercel's function time or memory limit.

## Operations

- **Rate limits fail open** ([ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md)) — an Upstash outage silently removes brute-force protection.
- **Logs only.** No error tracker, metrics or alerting — failures are visible only in Vercel's function logs.
- **One database for development and production** today — see [not yet built](not-yet-built.md#email-and-operations).
- **Manual migrations.** Migrations are applied by hand before a deploy; nothing enforces the order.
- **No CI.** Lint, tests and build are run locally before pushing; nothing runs them on push.
