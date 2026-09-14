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

### Adding one

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` and give the migration a descriptive name (`add_item_archived_flag`).
3. Read the generated `migration.sql` — especially for dropped columns or new `NOT NULL` columns on existing tables.
4. Commit the migration folder together with the schema and the code that uses it.
5. Before deploying that code, apply it to production with `npm run db:migrate:deploy` — the Vercel build doesn't run migrations.

`npm run db:push` is disabled on purpose; it exits with an error.

## Seeding

`npm run db:seed` runs `prisma/seed.ts` with `tsx`. It's idempotent:

1. **System item types** — creates each of the seven types that doesn't exist yet. Existing rows are left as they are, so changing an icon or colour in the seed doesn't update a database that already has the type.
2. **Demo user** — upserts `demo@bitbin.dev` with password `12345678` (bcrypt), Free plan, email verified.
3. **Demo content** — deletes the demo user's items and collections, then recreates the sample collections (React patterns, AI workflows, DevOps, …) and items.

Production needs step 1; the demo user is optional there.

`npm run db:cleanup` (`scripts/cleanup-users.ts`) deletes every user except the demo user — handy after testing sign-ups locally, never for production.

## Related

- [Setup](../local-development/setup.md) · [Resetting data](../local-development/resetting-data.md)
- [Deployment](../deployment.md)
