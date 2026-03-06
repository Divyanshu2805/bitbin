# Collections

Collections group items by project, topic or workflow. The relationship is
**many-to-many** through `ItemCollection`, so one snippet can live in
"React Patterns" and "Interview Prep" at the same time.

## Code map

| Concern | File |
| --- | --- |
| Queries | `src/lib/db/collections.ts` |
| Actions | `src/actions/collections.ts` |
| Card | `src/components/dashboard/collection-card.tsx` |
| Dialogs | `src/components/collections/{new,edit,delete}-collection-dialog.tsx` |
| Picker (in item forms) | `src/components/items/collection-picker.tsx` |
| Pages | `src/app/collections/page.tsx`, `src/app/collections/[id]/page.tsx` |

## Actions

| Action | Notes |
| --- | --- |
| `createCollection` | Free plan capped at **3** collections |
| `updateCollection` | Name + description |
| `deleteCollection` | Removes the collection and its join rows. Items themselves are kept |
| `toggleCollectionFavorite` | Favorites show in the sidebar and on `/favorites` |
| `getUserCollections` | Lightweight list for the collection picker |

## Dominant color

Collection cards and the sidebar show a color taken from the item types inside
the collection. `getRecentCollections` samples up to 50 items per collection,
counts them by type and uses the most common type's color. An empty
collection falls back to neutral gray.

## Sidebar

`getSidebarCollections` returns two lists:

- `favorites`: starred collections (amber star)
- `recents`: most recently updated non-favorites (color swatch)

Both lists render under a collapsible **Collections** heading in
`sidebar-nav.tsx`. The desktop sidebar and the mobile sheet share that
component.

## Detail page

`/collections/[id]` splits the collection's items into three blocks: regular
items as cards, images as thumbnails and files as rows. The page is paginated
like the type pages.
