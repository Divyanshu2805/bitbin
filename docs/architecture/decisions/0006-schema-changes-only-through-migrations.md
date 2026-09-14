# 0006. Schema changes only through committed migrations

**Status:** Accepted

## Context

BitBin runs against at least two databases — a developer's and production on Neon — and often a preview branch too. `prisma db push` changes a database to match the schema without recording what changed, so environments drift apart silently and production can't be brought up to date reproducibly.

## Decision

Every schema change is a migration: edit `prisma/schema.prisma`, run `npm run db:migrate` (`prisma migrate dev`) to generate and apply it locally, and commit the new folder under `prisma/migrations/`. Production applies pending migrations with `npm run db:migrate:deploy`. `npm run db:push` is overridden to print a warning and exit with an error.

## Consequences

- Every environment's schema is the ordered list of committed migrations; the history doubles as a changelog of the data model.
- Migrations aren't applied by the Vercel build — they're run by hand (or in CI) against the production `DATABASE_URL` before deploying code that needs them.
- A migration has to be safe to apply while the previous version of the app is still serving traffic.
- `npx prisma db push` still works if typed directly; the guard is a convention backed by the script, not a hard block.
