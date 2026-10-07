# Resetting Data

## Before you run either script

`db:seed` and `db:cleanup` overwrite or delete data, and they read the same `DATABASE_URL` as the app. If that points at the live database they would wipe it, so both **refuse to run** until you say which database you mean (`lib/db-safety.ts`):

- **A development database** (a Neon branch, a local Postgres): add its host to `SAFE_DATABASE_HOSTS` in `.env`, comma separated. Scripts then run without asking.
- **Any other database, once:** set `CONFIRM_DATABASE_HOST` to the exact host. The error message prints the host and the command.

```powershell
$env:CONFIRM_DATABASE_HOST="your-host.neon.tech"; npm run db:seed
```

```bash
CONFIRM_DATABASE_HOST=your-host.neon.tech npm run db:seed
```

## Restore the demo account

```bash
npm run db:seed
```

The seed is idempotent. It creates any of the seven system item types that are missing (existing ones aren't updated), upserts the demo user (`demo@bitbin.dev` / `12345678`, Free plan, email verified), then deletes the demo user's existing items and collections and recreates the sample set. Other users are untouched.

## Remove test accounts

```bash
npm run db:cleanup
```

Deletes every user except `demo@bitbin.dev`. Their items, collections, accounts and sessions go with them through the `onDelete: Cascade` relations. Two things are **not** cleaned up:

- Files they uploaded stay in the R2 bucket.
- Stripe customers and subscriptions stay in Stripe (in test mode this is harmless).

## Start from an empty database

```bash
npx prisma migrate reset    # drops every table, re-applies all migrations, then runs the seed
```

Only ever against a development database — it asks for confirmation, but it deletes everything.

## Clear rate limits

Rate-limit counters live in Upstash under `ratelimit:*` keys and expire on their own (15 minutes to an hour). To clear them early, delete the keys from the Upstash console's data browser, or unset the two `UPSTASH_*` variables to disable rate limiting locally.

## Related

- [Migrations and seeding](../schema/migrations-and-seeding.md)
- [Commands](commands.md)
