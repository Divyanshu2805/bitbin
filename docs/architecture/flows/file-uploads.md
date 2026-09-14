# File Uploads Flow

File and image items are a **Pro** feature. The bytes live in a Cloudflare R2 bucket; the database only stores `fileUrl`, `fileName` and `fileSize`.

## Limits

Defined in `FILE_CONSTRAINTS` (`src/lib/r2.ts`):

| Type | Max size | Extensions |
|---|---|---|
| `image` | 5 MB | png, jpg, jpeg, gif, webp, svg |
| `file` | 10 MB | pdf, txt, md, json, yaml / yml, xml, csv, toml, ini |

Both the extension and the MIME type are checked.

## Upload

1. `FileUpload` (drag and drop) posts multipart `{ file, itemType }` to `POST /api/upload`.
2. The handler requires a session (`401`), re-reads `isPro` from the database (`403`), applies the `upload` rate limit (10 / hour per IP + user, `429`), and validates the file (`400`).
3. `uploadToR2` stores the object under `{userId}/{timestamp}-{sanitised name}` and returns `{ fileUrl, fileName, fileSize }`, where `fileUrl` is `{R2_PUBLIC_URL}/{key}`.
4. The dialog then calls `createItem({ …, fileUrl, fileName, fileSize })`.

Upload and item creation are two steps. An upload whose item is never created leaves an orphaned object in the bucket.

## Viewing and downloading

- **Images** render directly from their public R2 URL through `next/image` (`next.config.ts` allows `*.r2.dev` and `*.r2.cloudflarestorage.com`).
- **Downloads** go through `GET /api/download/{userId}/{file}`, because browsers won't reliably apply a filename to a cross-origin download. The handler requires a session, requires the path to start with the caller's user id (`403`), and streams the object with `Content-Disposition: attachment`.

The bucket is public, so the proxy is a convenience, not an access control — anyone with an object's URL can read it. See the [security model](../security-model.md#files).

## Deletion

Deleting a file or image item calls `deleteFromR2(fileUrl)`, which strips `R2_PUBLIC_URL` from the stored URL to get the key. A failure is logged and the row is deleted anyway. Deleting an account does **not** delete its files — see [known gaps](../../known-gaps/not-yet-built.md).

## R2 setup checklist

1. Create a bucket and enable its public `r2.dev` URL (or attach a custom domain — and add it to `images.remotePatterns`).
2. Create an API token with *Object Read & Write* on that bucket.
3. Fill in the `R2_*` variables ([configuration](../../local-development/configuration.md#file-storage-cloudflare-r2)).

## Related

- [Upload and download endpoints](../../api/items-and-files.md)
- [ADR 0004](../decisions/0004-files-in-r2-behind-a-download-proxy.md)
