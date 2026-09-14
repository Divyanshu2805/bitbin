# Items Flow

Creating, reading, editing and deleting items — the core of BitBin. The per-type rules (which columns each type uses, which editor it opens in) are in [item types](../../item-types.md).

| Concern | File |
|---|---|
| Queries | `src/lib/db/items.ts` |
| Server actions | `src/actions/items.ts` |
| Item detail endpoint | `src/app/api/items/[id]/route.ts` |
| Card (grid) | `src/components/dashboard/item-card.tsx` |
| File row / image tile | `src/components/items/file-list-row.tsx`, `image-thumbnail-card.tsx` |
| Drawer (view + edit) | `src/components/items/item-drawer.tsx`, `item-drawer-provider.tsx` |
| Create dialog | `src/components/items/new-item-dialog.tsx` |
| Editors | `code-editor.tsx` (Monaco), `markdown-editor.tsx` |
| Type page | `src/app/items/[type]/page.tsx` |

## Create

`createItem(input)`:

1. `getAuthedSession()`, then Zod validation — title required, tags trimmed and empties dropped, `url` and `fileUrl` must be `http(s)`.
2. `file` and `image` types are rejected unless the session is Pro.
3. `canCreateItem` enforces the Free cap of **50 items** (`src/lib/usage.ts`).
4. A `link` must have a URL.
5. `lib/db/items.createItem` looks up the system item type by name, derives the content type (`link` → `URL`, `file` / `image` → `FILE`, everything else → `TEXT`), creates the row for the session user, `connectOrCreate`s the tags and links the selected collections.

The dialog then shows a toast and calls `router.refresh()`.

## Read

| Where | Query |
|---|---|
| Dashboard | `getPinnedItems`, `getRecentItems` (10), `getDashboardStats` |
| `/items/[type]` | `getItemsByType(userId, type, page, 21)`, paginated |
| Drawer | `GET /api/items/[id]` → `getItemById(userId, id)` — full content, tags and collections |

List queries select only what a card needs (`ItemWithType`); only the drawer loads full content.

## Update

The drawer switches to edit mode in place. `updateItem` checks ownership, then replaces the item's collection links (delete all, recreate) and its tag set, so a save always mirrors the form. The collection links and the item update are separate statements, not one transaction.

## Delete

`deleteItem` checks ownership, deletes the R2 object named by the item's `fileUrl` if it has one (a failure is logged, not surfaced), then deletes the row. Collection links and tag links go with it.

## Pin and favorite

`toggleItemPin` and `toggleItemFavorite` flip a boolean and return the new value, so the UI can update immediately and show a toast. Pinned items get their own dashboard section; favorites appear on `/favorites`.

## Card anatomy

```
┌─ type-coloured accent strip ──────────────┐
│ [icon]  Title ★ 📌                        │
│         Two-line description…             │
│                                           │
│ #tag #tag #tag +2           3d ago  [⧉]   │
└───────────────────────────────────────────┘
```

- The whole card is keyboard focusable; Enter or Space opens the drawer.
- The copy button copies `content` or `url`, and is always visible on touch screens.
- Hover lifts the card and tints its border with the item type's colour (`card-lift`, see the [design system](../../design-system.md)).

## Editor preferences

Types with a language (snippets, commands) open in Monaco; the other text types use the markdown editor with a GitHub-flavoured preview. Monaco's font size, tab size, word wrap, minimap and theme are stored per user in `users.editorPreferences`, edited on `/settings` through `updateEditorPreferences`.

## Related

- [Item types](../../item-types.md) · [Items table](../../database.md)
- [Server actions](../README.md)
- [File uploads](file-uploads.md) — how file and image items get their `fileUrl`.
