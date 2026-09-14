# Collections and Tags

## `collections`

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | `cuid()` |
| `name` | text | Not unique — two collections may share a name (imports match by name, though) |
| `description` | text, nullable | |
| `isFavorite` | boolean, default `false` | Favorites show in the sidebar and on `/favorites` |
| `userId` | FK → `users.id`, cascade | The owner |
| `defaultTypeId` | FK → `item_types.id`, nullable | Reserved for a per-collection default item type; not used by the app yet |
| `createdAt`, `updatedAt` | timestamp | |

Indexes: `collections(userId)`, `collections(userId, isFavorite)`, `collections(userId, updatedAt)`.

A collection's colour isn't stored; it's computed from its items — see the [collections flow](../architecture/flows/collections.md#dominant-colour).

## `item_collections`

The explicit many-to-many join between items and collections.

| Column | Notes |
|---|---|
| `itemId` | FK → `items.id`, cascade |
| `collectionId` | FK → `collections.id`, cascade |
| `addedAt` | timestamp, default now |

Primary key (`itemId`, `collectionId`), so an item is in a collection at most once. Deleting either side deletes the link — deleting a collection never deletes its items.

## `tags` and `_ItemTags`

| Column | Notes |
|---|---|
| `id` | `cuid()` |
| `name` | **Globally** unique, case-sensitive |

Tags aren't owned by a user: `connectOrCreate` by name means every user who types `react` shares the same row. Items and tags are joined by Prisma's implicit table `_ItemTags` (columns `A` → `items.id`, `B` → `tags.id`). Tags are never deleted, even once no item uses them. Since a tag holds nothing but its name, sharing leaks nothing between users.

## Related

- [Collections flow](../architecture/flows/collections.md)
- [Conventions](conventions.md)
