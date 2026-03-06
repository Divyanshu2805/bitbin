# Import & export

Found under **Settings → Data**.

## Export

| Format | Plan | Endpoint | File name |
| --- | --- | --- | --- |
| JSON | Free + Pro | `GET /api/export?format=json` | `bitbin-export-YYYY-MM-DD.json` |
| ZIP | Pro | `GET /api/export?format=zip` | `bitbin-export-YYYY-MM-DD.zip` |

The JSON manifest is built by `getUserExportData` (`src/lib/db/export.ts`):

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

The ZIP export contains `bitbin-export.json` plus a `files/` folder with every
file/image item pulled from R2 (compressed with `archiver`). JSON exports keep
the file metadata but not the binaries.

## Import

1. **Settings → Data → Import** opens `import-dialog.tsx`
2. Drop a `.json` export. `previewImport` validates it with Zod and shows
   counts by type, collections and tags
3. Choose **Skip duplicates** (matches title + type + content/URL)
4. `importData` runs everything inside a single Prisma transaction:
   collections first, then items (`connectOrCreate` tags), then collection
   links

Rules:

- Free plan limits still apply. The import stops at 50 items / 3 collections
  and reports what was skipped.
- File and image items are skipped for Free users, and their binaries are never
  re-uploaded on import.
- A file that isn't a BitBin export fails with *"Invalid export format. Please
  use a file exported from BitBin."*

## Tests

`src/actions/export.test.ts` and `src/actions/import.test.ts` cover the
manifest shape, validation, duplicate detection and free-tier limits.
