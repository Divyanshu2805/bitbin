# Prisma and PostgreSQL Pitfalls

## The client is generated into `src/generated/prisma`

The generator's `output` is `../src/generated/prisma`, which is git-ignored. A fresh clone, a new branch with schema changes, or a CI job must run `prisma generate` (`npm run db:generate`, or `npm run build`, which does it first) before the app or the type-check can find `@/generated/prisma`.

## Never `db push`

`npm run db:push` is overridden to fail. `npx prisma db push` still works if typed directly — and silently diverges the database from the migration history. Always `npm run db:migrate`. See [ADR 0006](../../architecture/decisions/0006-schema-changes-only-through-migrations.md).

## Vercel doesn't run migrations

The build is `prisma generate && next build`; it never touches the database. Deploying code that expects a new column before running `npm run db:migrate:deploy` against production fails at runtime, not at build time.

## A unique key with a `null` column isn't unique

`item_types` is unique on (`name`, `userId`), but system types have `userId = null`, and PostgreSQL treats `null`s as distinct — so the constraint doesn't stop two system `snippet` rows. The seed avoids duplicates by checking first. Anything else that creates system types must do the same.

## The seed doesn't update system types

The seed creates a system type only if it's missing. Changing an icon or colour in `prisma/seed.ts` has no effect on a database that already has the type — write a migration (or a one-off update) instead.

## Multi-step writes aren't transactional by default

`updateItem` deletes an item's collection links, recreates them, then updates the item — three statements, no transaction. Only `importData` uses `prisma.$transaction`. When several writes must succeed together, wrap them.

## Limits are checked, then written

`canCreateItem` counts, then `createItem` inserts. Two concurrent creates at 49 items both pass. That's accepted for the Free plan; don't copy the pattern for anything that must be exact.

## Implicit many-to-many tables

`Item.tags` uses Prisma's implicit relation, stored in `_ItemTags` with columns `A` and `B`. Raw SQL against it needs those names; it has no timestamps or extra columns, and adding any means converting it to an explicit model (like `ItemCollection`) with a migration.
