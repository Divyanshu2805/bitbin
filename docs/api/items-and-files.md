# Items and Files Endpoints

Items are created and changed through [server actions](server-actions.md#items); these three route handlers cover what needs HTTP — loading an item into the drawer, and moving file bytes.

## `GET /api/items/[id]`

The full item for the drawer: content, type, tags and collections (`getItemById(userId, id)`).

| Status | When |
|---|---|
| `200` | The item |
| `401` | No session |
| `404` | No such item, **or** it belongs to someone else |
| `500` | Unexpected error |

## `POST /api/upload`

Multipart form data:

| Field | Value |
|---|---|
| `file` | The file |
| `itemType` | `file` or `image` |

| Status | When |
|---|---|
| `200` | `{ fileUrl, fileName, fileSize }` — pass these to `createItem` |
| `400` | No file, an invalid `itemType`, or the file fails validation (extension, MIME type, size, or contents that don't match the extension, see below) |
| `401` | No session |
| `403` | Not Pro (read from the database, not the session) |
| `429` | `upload` limit — 10 / hour per IP + user |
| `500` | Storage error or missing R2 configuration |

The stored `Content-Type` comes from the extension, not from what the browser sent. After the name, size and type checks, the bytes are checked too: PNG, JPEG, GIF, WebP and PDF signatures must match; every other type must be valid UTF-8 without NUL bytes; and an SVG may not contain `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, `on…=` handlers or `javascript:`.

Limits per type are in the [file uploads flow](../architecture/flows/file-uploads.md#limits). The object key is `{userId}/{timestamp}-{name}`, with every character outside `A–Z a–z 0–9 . -` replaced by `_`.

## `GET /api/download/[...path]`

`/api/download/{userId}/{timestamp}-{name}` — the object key. Streams the object with `Content-Disposition: attachment` and the original content type.

With `?inline=1` (the item panel's file preview) it's served `inline` instead: a PDF as `application/pdf`, anything else as `text/plain; charset=utf-8` with `Content-Security-Policy: sandbox`, and always `X-Content-Type-Options: nosniff`, so an uploaded file can't run script on the app's origin.

| Status | When |
|---|---|
| `200` | The file |
| `401` | No session |
| `403` | The path doesn't start with the caller's user id |
| `404` | No such object |
| `500` | Storage error or missing R2 configuration |

## Related

- [Items flow](../architecture/flows/items.md) · [File uploads flow](../architecture/flows/file-uploads.md)
