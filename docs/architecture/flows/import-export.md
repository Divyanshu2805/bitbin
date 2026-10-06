# Import and Export Flow

Both live under **Settings → Data**.

## Export

| Format | Plan | Endpoint | File name |
|---|---|---|---|
| JSON | Free and Pro | `GET /api/export?format=json` | `bitbin-export-YYYY-MM-DD.json` |
| ZIP | Pro (`403` otherwise) | `GET /api/export?format=zip` | `bitbin-export-YYYY-MM-DD.zip` |

The manifest is built by `getUserExportData` (`src/lib/db/export.ts`) — every item with its type name, tags and collection names, and every collection. Items refer to collections **by name**, not id, so an export is portable between accounts. The full shape is in the [export format](../../api/export-format.md).

The ZIP holds `bitbin-export.json`, the text items as plain files (`snippets/`, `prompts/`, `commands/`, `notes/` and a `links.md`, built by `lib/export-files.ts`), and a `files/` folder with every file and image item's binary, read from the private R2 bucket by key. See the [export format](../../api/export-format.md#the-zip).

## Import

1. **Settings → Data → Import** opens `import-dialog.tsx`.
2. The user drops a `.json` export. `previewImport` parses it, validates it with Zod, and shows counts by type, collections and tags.
3. The user chooses whether to **skip duplicates**: an item counts as one already saved if it has the same title and type and the same content (a link: the same URL; a file or image: the same file name). Repeats inside the file itself are skipped too (`isDuplicateItem` in `lib/import-utils.ts`).
4. `importData` runs in **one Prisma transaction**: collections first (an existing collection with the same name is reused rather than duplicated), then items (tags with `connectOrCreate`), then the collection links. Either everything is imported or nothing is.

Rules:

- Each item keeps its `createdAt` and `updatedAt` from the file (`updatedAt` falls back to `createdAt`). A date that can't be read is ignored, and one in the future is clamped to the moment of import.
- Free plan limits still apply: the import stops at 50 items and 3 collections in total, and reports what was skipped.
- File and image items are skipped for Free users. For Pro users their metadata and original `fileUrl` are kept — the binaries are never re-uploaded, so the item points at wherever the file was when it was exported.
- A file that isn't a BitBin export fails with *"Invalid export format. Please use a file exported from BitBin."*

## Related

- [Export endpoint and format](../../api/export-format.md)
- [Import actions](../../api/server-actions.md#import-and-export)
