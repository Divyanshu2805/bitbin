# Collections Flow

Collections group items by project, topic or workflow. Membership is **many-to-many** through `item_collections`, so one snippet can live in "React Patterns" and "Interview Prep" at the same time.

| Concern | File |
|---|---|
| Queries | `src/lib/db/collections.ts` |
| Actions | `src/actions/collections.ts` |
| Card | `src/components/dashboard/collection-card.tsx` |
| Dialogs | `src/components/collections/{new,edit,delete}-collection-dialog.tsx` |
| Picker (in item forms) | `src/components/items/collection-picker.tsx` |
| Pages | `src/app/collections/page.tsx`, `src/app/collections/[id]/page.tsx` |

## Actions

| Action | Behaviour |
|---|---|
| `createCollection` | Name and optional description. The Free plan is capped at **3** collections (`canCreateCollection`) |
| `updateCollection` | Name and description |
| `deleteCollection` | Deletes the collection; its `item_collections` rows cascade. The items themselves are kept |
| `toggleCollectionFavorite` | Favorites show in the sidebar and on `/favorites` |
| `getUserCollections` | A lightweight id + name list for the collection picker |

Items join a collection from the item side — the picker in the create dialog and the drawer sends `collectionIds` with `createItem` / `updateItem`.

## Dominant colour

Collection cards and the sidebar show a colour taken from the items inside. The query samples up to 50 of the collection's items, counts them by item type, and uses the most common type's colour. An empty collection falls back to neutral grey. Nothing is stored — the colour changes as the collection's contents do.

## Sidebar

`getSidebarCollections` returns two lists, rendered under a collapsible **Collections** heading in `sidebar-nav.tsx` (shared by the desktop sidebar and the mobile sheet):

- `favorites` — starred collections, with an amber star.
- `recents` — the most recently updated non-favorites, with a colour swatch.

## Detail page

`/collections/[id]` loads the collection with an ownership check (`findFirst({ where: { id, userId } })`) and splits its items into three blocks: regular items as cards, images as thumbnails, and files as rows. It's paginated like the type pages.

## Related

- [Collections tables](../../database.md)
- [Server actions](../README.md)
