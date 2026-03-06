# Items

An **item** is anything saved in BitBin: a snippet, prompt, command, note,
file, image or link. See [item-types.md](item-types.md) for the per-type rules
and [item-crud-architecture.md](item-crud-architecture.md) for the original
design write-up.

## Where the code lives

| Concern | File |
| --- | --- |
| Queries | `src/lib/db/items.ts` |
| Server actions | `src/actions/items.ts` |
| Card (grid) | `src/components/dashboard/item-card.tsx` |
| File row / image tile | `src/components/items/file-list-row.tsx`, `image-thumbnail-card.tsx` |
| Drawer (view + edit) | `src/components/items/item-drawer.tsx` + `item-drawer-provider.tsx` |
| Create dialog | `src/components/items/new-item-dialog.tsx` |
| Editors | `code-editor.tsx` (Monaco), `markdown-editor.tsx` |
| Type page | `src/app/items/[type]/page.tsx` |

## Lifecycle

### Create

`createItem(input)`:

1. Validates with Zod (title required, URL fields must be `http(s)`)
2. Rejects `file` / `image` types for non-Pro users
3. Enforces the free-tier cap of **50 items** (`src/lib/usage.ts`)
4. Creates the item, `connectOrCreate`s tags and links any selected collections

### Read

- Dashboard: `getPinnedItems`, `getRecentItems` (10), `getDashboardStats`
- Type pages: `getItemsByType(userId, type, page, 21)` paginated
- Drawer: `getItemById` loads full content, tags and collections via
  `GET /api/items/[id]`

### Update

The drawer switches to edit mode in place. `updateItem` replaces the tag set
and collection links in one call, so a save always mirrors the form.

### Delete

`deleteItem` removes the row. For file/image items it also deletes the object
from R2 (`deleteFromR2`).

## Pin & favorite

`toggleItemPin` / `toggleItemFavorite` flip a boolean and return the new value
so the UI can update optimistically and show a toast. Pinned items get their
own section at the top of the dashboard. Favorites appear on `/favorites`.

## Card anatomy

```
┌─ type-colored accent strip ──────────────┐
│ [icon]  Title ★ 📌                        │
│         Two-line description…             │
│                                           │
│ #tag #tag #tag +2           3d ago  [⧉]   │
└───────────────────────────────────────────┘
```

- The whole card is keyboard focusable (`Enter` / `Space` opens the drawer)
- The copy button copies `content` or `url` and is always visible on touch
  screens
- Hover lifts the card and tints the border with the item type color
  (`card-lift` utility, see [design-system.md](design-system.md))

## Editor preferences

Snippets and commands open in Monaco. Font size, tab size, word wrap, minimap
and theme (`vs-dark`, `monokai`, `github-dark`) are stored per user in
`users.editorPreferences` and edited on `/settings`.
