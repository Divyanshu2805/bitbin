# Resetting Data

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
