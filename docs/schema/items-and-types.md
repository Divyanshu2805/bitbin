# Items and Item Types

## `items`

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | `cuid()` |
| `title` | text | Required |
| `contentType` | `ContentType` enum | `TEXT`, `FILE` or `URL` — derived from the item type when the item is created |
| `content` | text, nullable | The payload for `TEXT` types |
| `fileUrl`, `fileName`, `fileSize` | text, text, int — nullable | The payload for `FILE` types: the public R2 URL, the original name, the size in bytes |
| `url` | text, nullable | The payload for `URL` types (links); `http(s)` only |
| `description` | text, nullable | |
| `language` | text, nullable | Syntax-highlighting language for Monaco (snippets, commands) |
| `isFavorite`, `isPinned` | boolean, default `false` | |
| `userId` | FK → `users.id`, cascade | The owner |
| `itemTypeId` | FK → `item_types.id` | No cascade — an item type in use can't be deleted |
| `createdAt`, `updatedAt` | timestamp | `updatedAt` orders "recent" lists |

Relations: many-to-many with `tags` (implicit `_ItemTags`) and with `collections` (explicit `item_collections`).

### Indexes

Added in the `add_query_indexes` migration to back the dashboard and list queries:

| Index | Serves |
|---|---|
| `items(userId)` | Every per-user query |
| `items(userId, isPinned)` | The dashboard's pinned section |
| `items(userId, isFavorite)` | `/favorites` |
| `items(userId, updatedAt)` | Recent items, search ordering |
| `items(itemTypeId)` | `/items/[type]` |
| `items(createdAt)` | Ordering |

### `ContentType`

| Value | Item types | Payload column(s) |
|---|---|---|
| `TEXT` | snippet, prompt, command, note | `content` |
| `FILE` | file, image | `fileUrl`, `fileName`, `fileSize` |
| `URL` | link | `url` |

The columns for the other content types are left `null`. Nothing in the database enforces that — see [conventions](conventions.md#what-the-schema-doesnt-enforce).

## `item_types`

| Column | Notes |
|---|---|
| `id` | `cuid()` |
| `name` | `snippet`, `prompt`, … |
| `icon` | A Lucide icon name, resolved by `ITEM_TYPE_ICONS` in `src/lib/constants/item-types.ts` |
| `color` | Hex colour used for the icon, accent strips and collection dominant colour |
| `isSystem` | `true` for the seven seeded types |
| `userId` | `null` for system types; FK → `users.id` (cascade) for a user's own type |

Unique on (`name`, `userId`). The seven system types and their behaviour are described in [item types](item-types.md).

Per-user custom types are allowed by the schema, but nothing in the app creates them, and `createItem` only looks up system types.

## Related

- [Items flow](../architecture/flows/items.md)
- [Item types](item-types.md)
