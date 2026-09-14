# Export Endpoint and Format

## `GET /api/export?format=json|zip`

Session required. `format` defaults to `json`.

| Status | When |
|---|---|
| `200` | `bitbin-export-YYYY-MM-DD.json` (`application/json`) or `.zip` (`application/zip`), as an attachment |
| `400` | `format` is neither `json` nor `zip` |
| `401` | No session |
| `403` | `zip` requested by a Free user |

Not rate limited.

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
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "collections": [
    { "name": "React Patterns", "description": "…", "isFavorite": false }
  ]
}
```

- No ids: items name their type, tags and collections, so an export can be imported into any account.
- `version` is `1`. A change that older imports can't read should bump it and teach `importData` both shapes.

## The ZIP

`bitbin-export.json` (the manifest above) plus a `files/` folder containing every file and image item's binary, fetched from R2 and compressed with `archiver`.

## Importing

The manifest is what `previewImport` and `importData` accept — see [server actions](server-actions.md#import-and-export) and the [import and export flow](../architecture/flows/import-export.md). ZIPs can't be imported; the binaries in them are for the user's own backup.
