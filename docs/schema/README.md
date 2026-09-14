# Data Model

BitBin's data lives in one PostgreSQL database, defined by `prisma/schema.prisma` and accessed through Prisma 7 with the `@prisma/adapter-pg` driver adapter (`src/lib/prisma.ts`). The generated client is written to `src/generated/prisma/` (git-ignored).

## Tables

| Table | Model | Holds | Page |
|---|---|---|---|
| `users` | `User` | Accounts, the plan (`isPro`), Stripe ids, editor preferences | [Users and auth](users-and-auth.md) |
| `accounts` | `Account` | OAuth links (GitHub) — NextAuth adapter | [Users and auth](users-and-auth.md) |
| `sessions` | `Session` | NextAuth adapter table; unused with JWT sessions | [Users and auth](users-and-auth.md) |
| `verification_tokens` | `VerificationToken` | Email verification and password-reset tokens | [Users and auth](users-and-auth.md) |
| `items` | `Item` | Every saved snippet, prompt, command, note, file, image and link | [Items and item types](items-and-types.md) |
| `item_types` | `ItemType` | The seven system types (and, in principle, per-user custom types) | [Items and item types](items-and-types.md) |
| `collections` | `Collection` | Named groups of items | [Collections and tags](collections-and-tags.md) |
| `item_collections` | `ItemCollection` | Explicit many-to-many join between items and collections | [Collections and tags](collections-and-tags.md) |
| `tags` | `Tag` | Globally unique tag names | [Collections and tags](collections-and-tags.md) |
| `_ItemTags` | — | Prisma's implicit many-to-many join between items and tags | [Collections and tags](collections-and-tags.md) |

## Relationships at a glance

```
User 1───* Item *───1 ItemType
  │          │
  │          *──* Tag            (implicit join _ItemTags)
  │          │
  │          *──* Collection     (explicit join item_collections)
  │
  1───* Collection
  1───* Account / Session        (NextAuth)
```

Every user-owned row cascades on user delete, so deleting a user removes all of their data in the database.

## Reference

| Page | Covers |
|---|---|
| [Item types](item-types.md) | The seven system types — icon, colour, content type, route, Pro gating |
| [Conventions](conventions.md) | Ids, timestamps, naming, ownership, cascades, and what the schema doesn't enforce |
| [Migrations and seeding](migrations-and-seeding.md) | The migration history, how to add one, and what the seed creates |

## Related

- [Security model](../architecture/security-model.md#tenancy) — how rows are kept per user.
- [Export format](../api/export-format.md) — the portable shape of a user's data.
