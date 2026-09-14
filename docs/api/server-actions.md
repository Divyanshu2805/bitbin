# Server Actions

Every action in `src/actions/` starts with `getAuthedSession()` (except `signInWithGitHub`) and returns an [`ActionResult`](errors-and-rate-limits.md#server-actions). "Owned" below means the action passes the session's user id to `lib/db`, and a row belonging to someone else is reported as "not found or access denied".

## Items

`src/actions/items.ts`

| Action | Input | Returns | Checks |
|---|---|---|---|
| `createItem` | `{ typeName, title, description?, content?, url?, language?, tags, collectionIds?, fileUrl?, fileName?, fileSize? }` | `ItemDetail` | Zod; `file` / `image` need Pro; Free cap of 50 items; `link` needs `url` |
| `updateItem` | `itemId`, `{ title, description?, content?, url?, language?, tags, collectionIds? }` | `ItemDetail` | Zod; owned. Replaces tags and collection links |
| `deleteItem` | `itemId` | `null` | Owned. Also deletes the R2 object named by `fileUrl` |
| `toggleItemFavorite` | `itemId` | `{ isFavorite }` | Owned |
| `toggleItemPin` | `itemId` | `{ isPinned }` | Owned |

`typeName` is one of `snippet`, `prompt`, `command`, `note`, `file`, `image`, `link`. `url` and `fileUrl` must be `http(s)`.

## Collections

`src/actions/collections.ts`

| Action | Input | Returns | Checks |
|---|---|---|---|
| `createCollection` | `{ name, description? }` | The collection | Name 1–100, description ≤ 500; Free cap of 3 |
| `updateCollection` | `{ id, name, description? }` | The collection | Same limits; owned |
| `deleteCollection` | `{ id }` | `null` | Owned. Items are kept |
| `toggleCollectionFavorite` | `collectionId` | `{ isFavorite }` | Owned |
| `getUserCollections` | — | `{ id, name }[]` for the picker | |

## AI

`src/actions/ai.ts` — all four: session → Pro → Zod → `ai` rate limit (20 / hour per IP + user) → OpenAI. Content is truncated to 2,000 characters.

| Action | Input | Returns |
|---|---|---|
| `generateAutoTags` | `{ title, content?, language?, typeName }` | `string[]` — up to 5 lowercase tags |
| `generateDescription` | `{ title, content?, url?, language?, typeName }` | `string` |
| `explainCode` | `{ title, content, language?, typeName: 'snippet' \| 'command' }` | `string` (markdown) |
| `optimizePrompt` | `{ title, content }` | `string` |

## Import and export

| Action | Input | Returns |
|---|---|---|
| `previewImport` | The export file's text | Counts by type, collections and tags — or "Invalid JSON file" / "Invalid export format…" |
| `importData` | The export file's text, `skipDuplicates` | Imported and skipped counts. One transaction; Free limits apply; file and image items skipped for Free users |
| `exportData` | — | The manifest as data. Not used by the UI, which downloads through [`/api/export`](export-format.md) |

## Search, settings and sign-in

| Action | Input | Returns |
|---|---|---|
| `getSearchData` (`search.ts`) | — | `{ items, collections }` — the whole ⌘K index for the user |
| `updateEditorPreferences` (`settings.ts`) | `{ fontSize, tabSize, wordWrap, minimap, theme }` | Validated against the allowed values, saved to `users.editorPreferences` |
| `signInWithGitHub` (`auth.ts`) | — | Redirects to GitHub; see [authentication](../architecture/flows/authentication.md#github) |

## Related

- [Coding conventions](../practices/coding-conventions.md#server-actions) — how to write a new action.
