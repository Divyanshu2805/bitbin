# Item Types

BitBin has seven system item types, seeded by `prisma/seed.ts` with `isSystem = true` and `userId = null`, shared by every user. The type decides where an item's payload is stored, which editor it opens in, which page lists it, and whether it needs Pro.

| Type | Icon | Colour | Content type | Route | Editor | Plan |
|---|---|---|---|---|---|---|
| `snippet` | `Code` | `#3b82f6` blue | `TEXT` | `/items/snippets` | Monaco, with `language` | Free |
| `prompt` | `Sparkles` | `#8b5cf6` purple | `TEXT` | `/items/prompts` | Markdown | Free |
| `command` | `Terminal` | `#f97316` orange | `TEXT` | `/items/commands` | Monaco, with `language` | Free |
| `note` | `StickyNote` | `#fde047` yellow | `TEXT` | `/items/notes` | Markdown | Free |
| `file` | `File` | `#6b7280` grey | `FILE` | `/items/files` | Upload | **Pro** |
| `image` | `Image` | `#ec4899` pink | `FILE` | `/items/images` | Upload | **Pro** |
| `link` | `Link` | `#10b981` emerald | `URL` | `/items/links` | URL field | Free |

## What each type is for

- **Snippet** — reusable code: functions, hooks, patterns, boilerplate. `language` drives syntax highlighting.
- **Prompt** — AI prompts, system messages and templates, often with `{{placeholder}}` variables. Pro users can run the prompt optimizer on them.
- **Command** — shell commands, scripts and CLI one-liners.
- **Note** — markdown notes, explanations and reference material.
- **File** — documents and configuration files (pdf, txt, md, json, yaml, xml, csv, toml, ini; up to 10 MB).
- **Image** — screenshots, diagrams and design assets (png, jpg, gif, webp, svg; up to 5 MB).
- **Link** — bookmarks to docs, tools and articles.

Every type also uses `title`, `description`, tags, collections, and the favorite and pinned flags.

## How the type is used in code

- **Icons** — the `icon` column holds a Lucide name, mapped to a component by `ITEM_TYPE_ICONS` / `getItemTypeIcon` in `src/lib/constants/item-types.ts` (falls back to `Code`).
- **Colours** — the `color` column tints the icon (`color`), its background (the same hex at 20% alpha) and card accents. It's data, not theme: the same in every theme. `ITEM_TYPE_COLORS` in the same constants file mirrors the seeded values for places that don't have the row.
- **Content type** — `createItem` derives it from the name: `link` → `URL`, `file` / `image` → `FILE`, everything else → `TEXT`. `VALID_ITEM_TYPES` in `src/lib/db/items.ts` is the list actions validate against.
- **Pro gating** — `createItem` rejects `file` and `image` for Free users, uploads require Pro, and the sidebar shows a "PRO" badge on both.
- **Routes** — `/items/[type]` takes the plural (`snippets`), mapped to the type name.

## Adding a type

1. Add it to the seed's `systemItemTypes` and run `npm run db:seed` (existing types are left alone).
2. Add its icon to `ITEM_TYPE_ICONS` and its colour to `ITEM_TYPE_COLORS`.
3. Add it to `VALID_ITEM_TYPES` and to the content-type mapping in `createItem` (and the import action's copy of it).
4. Add it to the sidebar and to the route mapping for `/items/[type]`.
5. Decide whether it's Pro, and gate it in `createItem` and the UI.

## Related

- [Items and item types tables](items-and-types.md)
- [Items flow](../architecture/flows/items.md)
- [Item CRUD architecture](../architecture/design-notes/item-crud-architecture.md) — the original design.
