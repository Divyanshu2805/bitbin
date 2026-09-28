# Collections Flow

Collections group items by project, topic or workflow. Membership is **many-to-many** through `item_collections`, so one snippet can live in "React Patterns" and "Interview Prep" at the same time.

| Concern | File |
|---|---|
| Queries | `src/lib/db/collections.ts` |
| Actions | `src/actions/collections.ts` |
| Card | `src/components/dashboard/collection-card.tsx` |
| Dialogs | `src/components/collections/{new,edit,delete}-collection-dialog.tsx` |
| Picker (in item forms) | `src/components/items/collection-picker.tsx` |
| Pages | `src/app/(app)/collections/page.tsx`, `src/app/(app)/collections/[id]/page.tsx` |

## Actions

| Action | Behaviour |
|---|---|
| `createCollection` | Name and optional description. The Free plan is capped at **3** collections (`canCreateCollection`) |
| `updateCollection` | Name and description |
| `deleteCollection` | Deletes the collection; its `item_collections` rows cascade. The items themselves are kept |
| `toggleCollectionFavorite` | Favorites show in the sidebar and on `/favorites` |
| `toggleCollectionPin` | Pinned collections come first on the dashboard, `/collections` and `/favorites` (then by last edit) |
| `getUserCollections` | A lightweight id + name list for the collection picker |

Items join a collection from the item side — the picker in the create dialog and the drawer sends `collectionIds` with `createItem` / `updateItem`. Two quicker ways add or remove one collection at a time through `setItemCollection` (both the item and the collection are checked for ownership):

- **The card menu**: ⋯ → *Add to collection* lists the user's collections with a check on the item's (`getItemCollections`); clicking one toggles it and the menu stays open.
- **Drag and drop**: item cards, rows and file/image cards are draggable (`components/items/item-drag.ts`); the sidebar's collections and collection cards take the drop. While dragging, `<html>` has `item-dragging` so every target shows a dashed lime outline.

## Dominant colour

Collection cards and the sidebar show a colour taken from the items inside. The query samples up to 50 of the collection's items, counts them by item type, and uses the most common type's colour. An empty collection falls back to neutral grey. Nothing is stored — the colour changes as the collection's contents do.

## Sidebar

`getSidebarCollections` (loaded once by `src/app/(app)/layout.tsx`) returns two lists, rendered under a collapsible **Collections** heading in `sidebar-nav.tsx` (shared by the desktop sidebar and the mobile sheet):

- `favorites` — starred collections, with an amber star.
- `recents` — the most recently updated non-favorites, with a colour swatch.

## Detail page

`/collections/[id]` loads the collection with an ownership check (`findFirst({ where: { id, userId } })`) and splits its items into three blocks: regular items as cards, images as thumbnails, and files as rows. It's paginated like the type pages.

## Related

- [Collections tables](../../schema/collections-and-tags.md)
- [Server actions](../../api/server-actions.md#collections)
