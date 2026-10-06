# Migrations and Seeding

## Migrations

Schema changes only ever go through Prisma migrations, committed under `prisma/migrations/` — see [ADR 0006](../architecture/decisions/0006-schema-changes-only-through-migrations.md).

```bash
npm run db:migrate            # prisma migrate dev — create a migration from schema changes and apply it locally
npm run db:migrate:deploy     # prisma migrate deploy — apply pending migrations (production, CI)
```

`prisma.config.ts` points Prisma at `prisma/schema.prisma`, `prisma/migrations`, the seed command, and `DATABASE_URL` (loaded with `dotenv`).

### History

| Migration | Change |
|---|---|
| `20260108054512_init` | The base schema: users and the NextAuth tables, items, item types, collections, the joins and tags |
| `20260119063307_add_query_indexes` | The composite indexes on `items` and `collections` that back the dashboard |
| `20260210052148_add_editor_preferences` | `users.editorPreferences` (`jsonb`) |
| `20260924225247_add_api_tokens` | The `api_tokens` table: hashed personal access tokens for the token API |
| `20260927120000_add_collection_pin` | `collections.isPinned`, so a collection can be pinned to the top |
| `20260930150000_add_session_version` | `users.sessionVersion`, bumped on password change and reset to revoke sessions |
| `20261005120000_add_api_token_expiry` | `api_tokens.expiresAt`; existing tokens stay `null` (never expire) |

### Adding one

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` and give the migration a descriptive name (`add_item_archived_flag`).
3. Read the generated `migration.sql` — especially for dropped columns or new `NOT NULL` columns on existing tables.
4. Commit the migration folder together with the schema and the code that uses it.
5. Before deploying that code, apply it to production with `npm run db:migrate:deploy` — the Vercel build doesn't run migrations.

`npm run db:push` is disabled on purpose; it exits with an error.

## Seeding

`npm run db:seed` runs `prisma/seed.ts` with `tsx`. It overwrites the demo account, so it refuses to run until the database is marked safe (`SAFE_DATABASE_HOSTS`) or confirmed once (`CONFIRM_DATABASE_HOST`): see [resetting data](../local-development/resetting-data.md#before-you-run-either-script). It's idempotent:

1. **System item types** — creates each of the seven types that doesn't exist yet. Existing rows are left as they are, so changing an icon or colour in the seed doesn't update a database that already has the type.
2. **Demo user** — upserts `demo@bitbin.dev` with password `12345678` (bcrypt), Free plan, email verified.
3. **Demo content** — `resetDemoContent` (`prisma/demo-content.ts`) deletes the demo user's items and collections in a transaction, then recreates the sample library: three collections (React patterns, AI workflows, DevOps) and eighteen items. The same function is what the daily demo reset runs.

Production needs step 1. The demo user is the public sandbox account: see [the demo account](#the-demo-account).

`npm run db:cleanup` (`scripts/cleanup-users.ts`) deletes every user except the demo user — handy after testing sign-ups locally, never for production.

## Related

- [Setup](../local-development/setup.md) · [Resetting data](../local-development/resetting-data.md)
- [Deployment](../deployment/vercel.md#database)

## The demo account

`demo@bitbin.dev` / `12345678` is published (README, setup docs) so anyone can try BitBin, which makes it a sandbox rather than a real account:

- **What visitors can do:** add, edit, delete, favorite and pin items and collections, import and export, search, change editor preferences. They stay a Free user, so no files, images, AI or tokens.
- **What is blocked** (`403` or an error message, `lib/demo.ts`): changing its password or name, deleting the account, starting a checkout, and the forgot-password email.
- **The daily reset:** `GET /api/cron/reset-demo`, called once a day by the cron in `vercel.json` (21:00 UTC), puts the library back to the seeded one in a transaction. It requires `Authorization: Bearer $CRON_SECRET` and refuses to run at all if `CRON_SECRET` isn't set. Vercel sends that header itself when the variable exists in the project.
- **Never seed against production by hand without meaning to:** the seed also resets this account's password.
