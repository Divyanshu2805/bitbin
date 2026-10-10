# Export and Import Endpoints and Format

## `GET /api/export`

Session required.

| Query | Values |
|---|---|
| `format` | `json` (default) or `zip` |
| `collection` | Optional. A collection id: export that collection and its items instead of the whole library |

| Status | When |
|---|---|
| `200` | An attachment: `bitbin-export-YYYY-MM-DD.json` / `.zip`, or `bitbin-collection-{name}-YYYY-MM-DD.json` / `.zip` for one collection (`application/json` or `application/zip`) |
| `400` | `format` is neither `json` nor `zip`, or `collection` is empty or longer than 100 characters |
| `401` | No session |
| `403` | `zip` requested by a Free user |
| `404` | The collection doesn't exist or belongs to someone else |
| `429` | Over the `export` limit (10 an hour per IP + user, because a ZIP reads every file from storage), with `Retry-After` |

## The JSON manifest

Built by `getUserExportData` or `getCollectionExportData` (`src/lib/db/export.ts`):

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
      "zipPath": null,
      "tags": ["react", "hooks"],
      "collections": ["React Patterns"],
      "isFavorite": true,
      "isPinned": false,
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "collections": [
    { "name": "React Patterns", "description": "…", "isFavorite": false, "isPinned": false }
  ]
}
```

- No ids: items name their type, tags and collections, so an export can be imported into any account.
- `zipPath` is set only inside a ZIP export, on file and image items: where that item's bytes are in the archive.
- A collection's `isPinned` is optional on import (older exports don't have it) and defaults to `false`; a description longer than 1,000 characters is cut rather than refused.
- `version` is `1`. A change that older imports can't read should bump it and teach `importDataSchema` (`src/lib/import-schema.ts`) both shapes.

## The ZIP

```
bitbin-export.json   the manifest above (the part that can be imported again)
snippets/            one file per snippet, extension from its language (.ts, .py, .sh, .sql, …; .txt if none)
prompts/             one .md per prompt
commands/            one .sh per command (or its language's extension)
notes/               one .md per note
links.md             every link as a Markdown list, with descriptions
files/               the uploaded files and images, read from the private R2 bucket by key
```

Built by `buildExportZip` (`src/lib/export-zip.ts`) with `archiver`. File names come from the item titles with path separators and characters Windows refuses replaced by `-`, cut to 80 characters; two items with the same title in a folder become `name.ext` and `name-2.ext`. Only the manifest and `files/` are read back on import; the readable folders are for the user.

## Importing JSON

The manifest is what the `previewImport` and `importData` server actions accept: see [server actions](server-actions.md#import-and-export) and the [import and export flow](../architecture/flows/import-export.md).

## Importing a ZIP

### `POST /api/import`

Session and Pro required, and refused for the demo account. Multipart form:

| Field | Value |
|---|---|
| `mode` | `preview` or `import` |
| `file` | The export ZIP, at most 4 MB (hosts refuse larger request bodies) |
| `skipDuplicates` | `import` only. Anything but `false` skips items the account already has |

| Status | When |
|---|---|
| `200` | `preview`: `{ success: true, data: { …counts, fileCount } }`. `import`: `{ success: true, data: { itemsImported, itemsSkipped, collectionsImported, collectionsSkipped }, warning }`, where `warning` names the first file that couldn't be restored, if any |
| `400` | A bad `mode`, no file, not a ZIP, an archive over a limit (8 MB manifest, 10 MB per file, 100 files, 40 MB inflated), or a manifest that isn't a BitBin export |
| `401` | No session |
| `403` | Not Pro, the demo account, or a cross-site request |
| `413` | The ZIP is over 4 MB |
| `429` | Over the `importPreview` (20 / hour) or `import` (5 / hour) limit |
| `500` | The import failed and was rolled back; the files it had stored are deleted again |

Each file in the archive goes through the same checks as an upload before it is stored in the caller's folder, and the item is pointed at it. A file item whose bytes are missing or refused is dropped from the import, not created empty.

## Related

- [Import and export flow](../architecture/flows/import-export.md)
- [Data model](../schema/README.md)
