# File Uploads Flow

File and image items are a **Pro** feature. The bytes live in a private Cloudflare R2 bucket; the database only stores `fileUrl`, `fileName` and `fileSize`. Files arrive three ways, and all three go through `ingestFile` (`src/lib/file-ingest.ts`), so none can skip a check:

| Way in | Route |
|---|---|
| The web uploader (drag and drop in the new-item dialog) | `POST /api/upload`, then the `createItem` action |
| The desktop app (file picker, drop, copied screenshot) | `POST /api/v1/files`, which stores the file and creates the item in one request |
| A ZIP import | `POST /api/import` ([import and export](import-export.md#importing-a-zip-pro)) |

## Limits

Defined in `FILE_CONSTRAINTS` (`src/lib/r2.ts`):

| Type | Max size | Extensions |
|---|---|---|
| `image` | 5 MB | png, jpg, jpeg, gif, webp, svg |
| `file` | 10 MB | pdf, txt, md, json, yaml / yml, xml, csv, toml, ini |

The extension and the declared MIME type are checked, then the file's bytes (`validateFileContent` in `lib/r2.ts`): image and PDF signatures, valid UTF-8 for text formats, no script in SVGs. The object is stored with a content type derived from the extension, never the one the client sent.

## Upload

1. `FileUpload` (drag and drop) posts multipart `{ file, itemType }` to `POST /api/upload`. A file over 4 MB can't go in one request (the host refuses bodies over about 4.5 MB), so it is first sent in 4 MB parts to `PUT /api/upload/part`, stored under `{userId}/parts/{uploadId}/{n}`, and the final `POST /api/upload` names the parts instead of carrying the file. Progress covers every part.
2. The handler refuses a cross-site request (`403`), requires a session (`401`), re-reads `isPro` from the database (`403`), applies the `upload` rate limit (10 / hour per IP + user, `429`), joins the parts if there are any (and deletes them afterwards), and validates the file (`400`).
3. **Processing.** A PNG, JPEG or WebP is decoded and written out again without metadata (`lib/image-sanitize.ts`), which removes GPS and device information and refuses anything that isn't a real image or is over 50 megapixels. GIF and SVG are stored as uploaded. The size reported back is that of the stored bytes.
4. `uploadToR2` stores the object under `{userId}/{timestamp}-{sanitised name}` and returns `{ fileUrl, fileName, fileSize }`, where `fileUrl` is `{R2_PUBLIC_URL}/{key}`.
5. The dialog then calls `createItem({ …, fileUrl, fileName, fileSize })`.

From the web, upload and item creation are two steps, so an upload whose item is never created leaves an orphaned object; the weekly sweep below removes it. `POST /api/v1/files` deletes its object again if creating the item fails.

## Viewing and downloading

Nothing reads the bucket directly: it is private. The stored `fileUrl` only identifies the object, and the helpers in `lib/file-url.ts` turn it into a path on our own domain.

- **Images** render from `/api/download/{key}?inline=1` (`fileViewPath`), as `unoptimized` `next/image` or a plain `<img>`, with the type chosen from the file extension and a sandboxing `Content-Security-Policy`.
- **PDF and text previews** use the same `?inline=1` URL (a PDF as itself, anything else as sandboxed plain text).
- **Downloads** use `/api/download/{key}` (`fileDownloadPath`) with `Content-Disposition: attachment`. Every read through this route is streamed from R2, so file size never meets the host's response limit.
- **The ZIP export** reads each of the caller's own files with `getFromR2`, by key.

The route requires a session (`401`), requires the key to be a plain path inside the caller's own `{userId}/` folder (`403`; no other user's folder, no `..`), and reads the object with the server's R2 credentials (`404` if it's missing). See the [security model](../security-model.md#files).

## Deletion

Deleting a file or image item calls `deleteFromR2(fileUrl)`, which strips `R2_PUBLIC_URL` from the stored URL to get the key. A failure is logged and the row is deleted anyway. Deleting an account removes the whole `{userId}/` folder (best effort).

## Orphaned files

A stored object with no item pointing at it (an abandoned upload, a delete that failed on the storage side, an account whose cleanup failed) is removed by a weekly cron, `GET /api/cron/sweep-files` (Sundays 03:00 UTC, `vercel.json`). `sweepOrphanedFiles` (`src/lib/orphan-sweep.ts`) lists the bucket, compares it with every `fileUrl` in the database, and is cautious because a delete can't be undone:

- only objects older than a day (a fresh upload may be mid-save);
- only keys shaped like BitBin's uploads (`{userId}/{timestamp}-{name}`), plus upload parts (`{userId}/parts/…`) a day old, which are always abandoned and don't count towards the safety check;
- at most 1,000 deletions a run;
- no deletions at all when more than half of at least 20 eligible objects look orphaned, which would mean it is reading the wrong database.

`?dryRun=1` reports what it would delete. The route needs `CRON_SECRET`; an aborted run is logged as an error, so Sentry reports it.

## R2 setup checklist

1. Create a bucket and **leave public access off** (no `r2.dev` URL, no custom domain). Files are only read through the app.
2. Create an API token with *Object Read & Write* on that bucket.
3. Fill in the `R2_*` variables (`R2_PUBLIC_URL` is just the name stored file URLs are built from; nothing has to be reachable at it) ([configuration](../../local-development/configuration.md#file-storage-cloudflare-r2)).

## Related

- [Upload and download endpoints](../../api/items-and-files.md)
- [ADR 0004](../decisions/0004-files-in-r2-behind-a-download-proxy.md)
