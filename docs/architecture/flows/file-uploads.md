# File Uploads Flow

File and image items are a **Pro** feature. The bytes live in a Cloudflare R2 bucket; the database only stores `fileUrl`, `fileName` and `fileSize`.

## Limits

Defined in `FILE_CONSTRAINTS` (`src/lib/r2.ts`):

| Type | Max size | Extensions |
|---|---|---|
| `image` | 5 MB | png, jpg, jpeg, gif, webp, svg |
| `file` | 10 MB | pdf, txt, md, json, yaml / yml, xml, csv, toml, ini |

The extension and the declared MIME type are checked, then the file's bytes (`validateFileContent` in `lib/r2.ts`): image and PDF signatures, valid UTF-8 for text formats, no script in SVGs. The object is stored with a content type derived from the extension, never the one the client sent.

## Upload

1. `FileUpload` (drag and drop) posts multipart `{ file, itemType }` to `POST /api/upload`.
2. The handler requires a session (`401`), re-reads `isPro` from the database (`403`), applies the `upload` rate limit (10 / hour per IP + user, `429`), and validates the file (`400`).
3. `uploadToR2` stores the object under `{userId}/{timestamp}-{sanitised name}` and returns `{ fileUrl, fileName, fileSize }`, where `fileUrl` is `{R2_PUBLIC_URL}/{key}`.
4. The dialog then calls `createItem({ …, fileUrl, fileName, fileSize })`.

Upload and item creation are two steps. An upload whose item is never created leaves an orphaned object in the bucket.

## Viewing and downloading

Nothing reads the bucket directly: it is private. The stored `fileUrl` only identifies the object, and the helpers in `lib/file-url.ts` turn it into a path on our own domain.

- **Images** render from `/api/download/{key}?inline=1` (`fileViewPath`), as `unoptimized` `next/image` or a plain `<img>`, with the type chosen from the file extension and a sandboxing `Content-Security-Policy`.
- **PDF and text previews** use the same `?inline=1` URL (a PDF as itself, anything else as sandboxed plain text).
- **Downloads** use `/api/download/{key}` (`fileDownloadPath`) with `Content-Disposition: attachment`.
- **The ZIP export** reads each of the caller's own files with `getFromR2`, by key.

The route requires a session (`401`), requires the key to be a plain path inside the caller's own `{userId}/` folder (`403`; no other user's folder, no `..`), and reads the object with the server's R2 credentials (`404` if it's missing). See the [security model](../security-model.md#files).

## Deletion

Deleting a file or image item calls `deleteFromR2(fileUrl)`, which strips `R2_PUBLIC_URL` from the stored URL to get the key. A failure is logged and the row is deleted anyway. Deleting an account does **not** delete its files — see [known gaps](../../known-gaps/not-yet-built.md).

## R2 setup checklist

1. Create a bucket and **leave public access off** (no `r2.dev` URL, no custom domain). Files are only read through the app.
2. Create an API token with *Object Read & Write* on that bucket.
3. Fill in the `R2_*` variables (`R2_PUBLIC_URL` is just the name stored file URLs are built from; nothing has to be reachable at it) ([configuration](../../local-development/configuration.md#file-storage-cloudflare-r2)).

## Related

- [Upload and download endpoints](../../api/items-and-files.md)
- [ADR 0004](../decisions/0004-files-in-r2-behind-a-download-proxy.md)
