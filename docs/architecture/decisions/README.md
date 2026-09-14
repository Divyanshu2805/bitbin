# Architecture Decisions

Short records of the decisions that shape BitBin, each with the context that forced it and the trade-offs it accepts. They explain *why* the app looks the way it does; the rest of the architecture docs explain *what* it is.

| # | Decision | Status |
|---|---|---|
| [0001](0001-one-nextjs-app-no-separate-api.md) | Build BitBin as one Next.js application, with no separate API server | Accepted |
| [0002](0002-server-actions-for-writes.md) | Send every write from the UI through a server action that returns an `ActionResult` | Accepted |
| [0003](0003-jwt-sessions-with-live-plan.md) | Use JWT sessions, and re-read the plan from the database on every evaluation | Accepted |
| [0004](0004-files-in-r2-behind-a-download-proxy.md) | Store binaries in Cloudflare R2, and download them through an app route | Accepted |
| [0005](0005-rate-limits-fail-open.md) | Let rate limiting fail open when Redis is missing or down | Accepted |
| [0006](0006-schema-changes-only-through-migrations.md) | Change the schema only through committed Prisma migrations | Accepted |

## Writing a new record

Add a file named `NNNN-short-title.md` with the next number, using the same sections as the existing records: **Status**, **Context**, **Decision**, **Consequences**. Once a record is accepted, don't rewrite it; if a decision changes, add a new record that supersedes it and update the old one's status.
