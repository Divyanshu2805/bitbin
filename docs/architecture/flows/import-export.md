# Import and Export Flow

Both live under **Settings → Data**.

## Export

| Format | Plan | Endpoint | File name |
|---|---|---|---|
| JSON | Free and Pro | `GET /api/export?format=json` | `bitbin-export-YYYY-MM-DD.json` |
| ZIP | Pro (`403` otherwise) | `GET /api/export?format=zip` | `bitbin-export-YYYY-MM-DD.zip` |

The manifest is built by `getUserExportData` (`src/lib/db/export.ts`) — every item with its type name, tags and collection names, and every collection. Items refer to collections **by name**, not id, so an export is portable between accounts. The full shape is in the [export format](../README.md).

The ZIP holds `bitbin-export.json` plus a `files/` folder with every file and image item's binary, fetched from R2 and compressed with `archiver`. A JSON export keeps the file metadata but not the bytes.

## Import

1. **Settings → Data → Import** opens `import-dialog.tsx`.
2. The user drops a `.json` export. `previewImport` parses it, validates it with Zod, and shows counts by type, collections and tags.
3. The user chooses whether to **skip duplicates** — an existing item with the same title, type and content (or URL).
4. `importData` runs in **one Prisma transaction**: collections first (an existing collection with the same name is reused rather than duplicated), then items (tags with `connectOrCreate`), then the collection links. Either everything is imported or nothing is.

Rules:

- Free plan limits still apply: the import stops at 50 items and 3 collections in total, and reports what was skipped.
- File and image items are skipped for Free users. For Pro users their metadata and original `fileUrl` are kept — the binaries are never re-uploaded, so the item points at wherever the file was when it was exported.
- A file that isn't a BitBin export fails with *"Invalid export format. Please use a file exported from BitBin."*

## Related

- [Export endpoint and format](../README.md)
- [Import actions](../README.md)
