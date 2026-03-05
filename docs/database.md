# Database

PostgreSQL via Prisma 7 (`prisma/schema.prisma`). The generated client is
written to `src/generated/prisma` (git-ignored) and uses the `@prisma/adapter-pg`
driver adapter (`src/lib/prisma.ts`).

## Models

```
User 1───* Item *───1 ItemType
  │          │
  │          *──* Tag            (implicit many-to-many "ItemTags")
  │          │
  │          *──* Collection     (explicit join: ItemCollection)
  │
  1───* Collection
  1───* Account / Session        (NextAuth)
```

| Model | Purpose |
| --- | --- |
| `User` | Account, `isPro`, Stripe ids, `editorPreferences` JSON |
| `Item` | One saved thing. Content lives in `content` (TEXT), `fileUrl`/`fileName`/`fileSize` (FILE) or `url` (URL) depending on `contentType` |
| `ItemType` | Snippet, prompt, command, note, file, image, link. System types have `isSystem = true` and `userId = null` |
| `Collection` | Named group of items, can be favorited |
| `ItemCollection` | Join table with `addedAt`. Lets an item live in many collections |
| `Tag` | Globally unique tag names, attached to items with `connectOrCreate` |
| `Account`, `Session`, `VerificationToken` | NextAuth adapter tables. `VerificationToken` is also reused for email verification and password reset |

All user-owned rows cascade on user delete, so deleting an account removes
everything.

## Indexes

Added in the `add_query_indexes` migration to back the dashboard queries:

- `items(userId)`, `items(userId, isPinned)`, `items(userId, isFavorite)`,
  `items(userId, updatedAt)`, `items(itemTypeId)`, `items(createdAt)`
- `collections(userId)`, `collections(userId, isFavorite)`,
  `collections(userId, updatedAt)`

## Migrations

```bash
npm run db:migrate            # prisma migrate dev: create + apply locally
npm run db:migrate:deploy     # prisma migrate deploy: apply in CI / production
```

| Migration | Change |
| --- | --- |
| `init` | Base schema |
| `add_query_indexes` | Composite indexes listed above |
| `add_editor_preferences` | `users.editorPreferences` JSON column |

`prisma db push` is intentionally blocked (`npm run db:push` exits with an
error). Always create a migration so every environment stays in sync.

## Seeding

`npm run db:seed` runs `prisma/seed.ts`, which is idempotent:

1. Upserts the 7 system item types with their icon and color
2. Upserts a demo user (`demo@bitbin.dev` / `12345678`, free plan, email verified)
3. Wipes that user's previous demo data and recreates the demo collections
   and items (React patterns, AI prompts, DevOps commands, etc.)

`scripts/cleanup-users.ts` (`npm run db:cleanup`) deletes every user except the
demo user. It's handy after testing sign-ups locally.
