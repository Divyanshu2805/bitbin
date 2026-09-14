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
| `400` | No file, an invalid `itemType`, or the file fails validation (extension, MIME type, size) |
| `401` | No session |
| `403` | Not Pro (read from the database, not the session) |
| `429` | `upload` limit — 10 / hour per IP + user |
| `500` | Storage error or missing R2 configuration |

Limits per type are in the [file uploads flow](../architecture/flows/file-uploads.md#limits). The object key is `{userId}/{timestamp}-{name}`, with every character outside `A–Z a–z 0–9 . -` replaced by `_`.

## `GET /api/download/[...path]`

`/api/download/{userId}/{timestamp}-{name}` — the object key. Streams the object with `Content-Disposition: attachment` and the original content type.

| Status | When |
|---|---|
| `200` | The file |
| `401` | No session |
| `403` | The path doesn't start with the caller's user id |
| `404` | No such object |
| `500` | Storage error or missing R2 configuration |

## Related

- [Items flow](../architecture/flows/items.md) · [File uploads flow](../architecture/flows/file-uploads.md)
