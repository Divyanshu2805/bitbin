# Items and Files Endpoints

Items are created and changed through [server actions](server-actions.md#items); these three route handlers cover what needs HTTP: loading an item into the drawer, and moving file bytes.

## `GET /api/items/[id]`

The full item for the drawer: content, type, tags and collections (`getItemById(userId, id)`).

| Status | When |
|---|---|
| `200` | The item |
| `401` | No session |
| `404` | No such item, **or** it belongs to someone else |
| `500` | Unexpected error |

## `POST /api/upload`

Multipart form data, in one of two shapes. A file of 4 MB or less is sent whole; a larger one (the host refuses request bodies over about 4.5 MB) is first sent in parts to [`PUT /api/upload/part`](#put-apiuploadpart), and this request then names them:

| Field | Whole file | From parts |
|---|---|---|
| `itemType` | `file` or `image` | `file` or `image` |
| `file` | The file | — |
| `uploadId` | — | The UUID the parts were sent under |
| `partCount` | — | How many parts (1 to 5) |
| `fileName`, `mimeType` | — | The file's name and declared type |

From parts, the server reads `{userId}/parts/{uploadId}/0…n` back from storage, joins them (refusing a missing part or a total over the type's limit), runs the same checks as a whole file, and deletes the parts whether or not the file was accepted.

| Status | When |
|---|---|
| `200` | `{ fileUrl, fileName, fileSize }` — pass these to `createItem`. `fileSize` is the size of what was **stored**, which for a photo can differ from what was uploaded |
| `400` | No file, an invalid `itemType`, a bad `uploadId` / `partCount` / `fileName`, a missing part, or the file fails validation (extension, MIME type, size, contents that don't match the extension, or an image that can't be decoded) |
| `401` | No session |
| `403` | Not Pro (read from the database, not the session), or a request a browser says came from another site |
| `429` | `upload` limit — 10 / hour per IP + user |
| `500` | Storage error or missing R2 configuration |

The stored `Content-Type` comes from the extension, not from what the browser sent. After the name, size and type checks, the bytes are checked too: PNG, JPEG, GIF, WebP and PDF signatures must match; every other type must be valid UTF-8 without NUL bytes; and an SVG may not contain `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, `on…=` handlers or `javascript:`.

Then **photos are written out again** (`lib/image-sanitize.ts`, `sharp`). A PNG, JPEG or WebP is decoded, rotated to its EXIF orientation and encoded again without metadata, so GPS coordinates, the camera model and timestamps are not stored, and bytes that merely start like an image are refused ("Could not read this image"). Images above 50 megapixels are refused as decompression bombs. GIF and SVG are stored as uploaded (an SVG is already checked for script).

Every check runs in `ingestFile` (`src/lib/file-ingest.ts`), which [`POST /api/v1/files`](token-api.md#post-apiv1files) and the [ZIP import](export-format.md#importing-a-zip) use too.

Limits per type are in the [file uploads flow](../architecture/flows/file-uploads.md#limits). The object key is `{userId}/{timestamp}-{name}`, with every character outside `A–Z a–z 0–9 . -` replaced by `_`.

## `PUT /api/upload/part`

`?uploadId={uuid}&index={0–4}`, with up to 4 MB of the raw bytes as the body. Stores the part at `{userId}/parts/{uploadId}/{index}` until `POST /api/upload` (a file) or `POST /api/import` (a ZIP) joins it. The token API has the same route for the desktop app, [`PUT /api/v1/files/part`](token-api.md#put-apiv1filespart). Nothing is checked as a file until then; parts that are never joined are deleted by the weekly sweep once they are a day old.

| Status | When |
|---|---|
| `200` | `{ success: true }` |
| `400` | A bad `uploadId` (not a lowercase UUID) or `index`, or an empty or oversized body |
| `401` / `403` | No session; not Pro (read from the database), or a cross-site request |
| `413` | `Content-Length` over 4 MB, refused before the body is read |
| `429` | The `uploadPart` limit, 30 / hour per IP + user |
| `500` | Storage error |

## `GET /api/download/[...path]`

`/api/download/{userId}/{timestamp}-{name}` — the object key. The bucket is private: this route is the only way to read a file. It reads the object with the server's R2 credentials and **streams** it (`streamFromR2`), with its `Content-Length`, so a file of any size downloads without being held in memory or hitting the host's response limit. It is returned with `Content-Disposition: attachment`, the stored content type and `X-Content-Type-Options: nosniff`.

With `?inline=1` (the app's previews) it's served `inline` instead: a PDF as `application/pdf`; an image as its type, chosen from the file extension (PNG, JPEG, GIF, WebP or SVG); anything else as `text/plain; charset=utf-8`. Everything but a PDF carries `Content-Security-Policy: sandbox` and always `X-Content-Type-Options: nosniff`, so an uploaded file can't run script on the app's origin. Responses are `Cache-Control: private, max-age=3600`.

| Status | When |
|---|---|
| `200` | The file |
| `401` | No session |
| `403` | The key isn't a plain path inside the caller's own `{userId}/` folder: another user's folder, a look-alike id prefix, or a `.` / `..` segment (encoded or not) |
| `404` | The object doesn't exist |
| `500` | Storage error or missing R2 configuration |

## Related

- [Items flow](../architecture/flows/items.md) · [File uploads flow](../architecture/flows/file-uploads.md)
