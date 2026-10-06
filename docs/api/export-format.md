# Export Endpoint and Format

## `GET /api/export?format=json|zip`

Session required. `format` defaults to `json`.

| Status | When |
|---|---|
| `200` | `bitbin-export-YYYY-MM-DD.json` (`application/json`) or `.zip` (`application/zip`), as an attachment |
| `400` | `format` is neither `json` nor `zip` |
| `401` | No session |
| `403` | `zip` requested by a Free user |
| `429` | Over the `export` limit |

Rate limited: 10 exports an hour per IP + user (`export`), because a ZIP reads every file from storage. A `429` carries `Retry-After`.

## The JSON manifest

Built by `getUserExportData` (`src/lib/db/export.ts`):

```json
{
  "version": 1,
  "exportedAt": "2026-03-01T10:00:00.000Z",
  "items": [
    {
      "title": "useDebounce hook",
      "type": "snippet",
      "content": "export function useDebounce…",
      "language": "typescript",
      "description": "Debounce any value",
      "url": null,
      "fileName": null,
      "fileSize": null,
      "fileUrl": null,
      "tags": ["react", "hooks"],
      "collections": ["React Patterns"],
      "isFavorite": true,
      "isPinned": false,
      "createdAt": "…",   // kept on import
      "updatedAt": "…"
    }
  ],
  "collections": [
    { "name": "React Patterns", "description": "…", "isFavorite": false, "isPinned": false }
  ]
}
```

- No ids: items name their type, tags and collections, so an export can be imported into any account.
- A collection's `isPinned` is optional on import (older exports don't have it) and defaults to `false`.
- `version` is `1`. A change that older imports can't read should bump it and teach `importData` both shapes.

## The ZIP

`bitbin-export.json` (the manifest above), then the same items as ordinary files so they can be read without BitBin, then a `files/` folder with every file and image item's binary (read from the private R2 bucket by key and compressed with `archiver`):

```
bitbin-export.json
snippets/   one file per snippet, extension from its language (.ts, .py, .sh, .sql, …; .txt if none)
prompts/    one .md per prompt
commands/   one .sh per command (or its language's extension)
notes/      one .md per note
links.md    every link as a Markdown list, with descriptions
files/      the uploaded files and images
```

File names come from the item titles with path separators and characters Windows refuses replaced by `-`, cut to 80 characters; two items with the same title in a folder become `name.ext` and `name-2.ext`. Only the JSON can be imported again.

## Importing

The manifest is what `previewImport` and `importData` accept — see [server actions](server-actions.md#import-and-export) and the [import and export flow](../architecture/flows/import-export.md). ZIPs can't be imported; the binaries in them are for the user's own backup.
