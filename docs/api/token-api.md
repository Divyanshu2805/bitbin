# Token API (`/api/v1`)

The one API meant for clients other than the BitBin website: today the [browser extension](../../extension/README.md), and later possibly a desktop app or CLI. Why it exists and how it's shaped is in [ADR 0007](../architecture/decisions/0007-token-api-for-the-browser-extension.md).

## Authentication

Every request sends a personal access token:

```
Authorization: Bearer bb_…
```

- Tokens are created and revoked in **Settings → Browser extension** (Pro only). The plain token is shown once. BitBin stores its SHA-256 hash.
- Cookies are ignored. A request with a session cookie and no token is rejected.
- The owner's plan is re-read on every request, so a user who stops being Pro gets `403` from then on, even with a valid token.

| Status | When |
|---|---|
| `401` | No `Authorization` header, not `Bearer bb_…`, or an unknown / revoked token |
| `403` | The token's owner isn't on Pro |
| `429` | Over the `api` limit (60 requests a minute per user), with `Retry-After` |

Errors are `{ "error": "…" }`, as for every [route handler](errors-and-rate-limits.md#route-handlers). Successful responses wrap their payload in `data`.

## `GET /api/v1/me`

Checks a token. Used by the extension's options page.

```json
{ "data": { "email": "you@example.com", "name": "You", "isPro": true } }
```

## `GET /api/v1/collections`

The caller's collections, sorted by name, for the extension's picker.

```json
{ "data": [{ "id": "cm…", "name": "Snippets I like" }] }
```

## `POST /api/v1/items`

Creates an item. Validation and the insert are shared with the [`createItem` action](server-actions.md#items) (`createItemForUser` in `src/lib/item-create.ts`).

```json
{
  "typeName": "snippet",
  "title": "Debounce hook",
  "content": "export function useDebounce…",
  "description": "Saved from https://example.com/post",
  "url": null,
  "language": null,
  "tags": ["react", "hooks"],
  "collectionIds": ["cm…"]
}
```

| Field | Rules |
|---|---|
| `typeName` | Required. `snippet`, `prompt`, `command`, `note` or `link`. `file` and `image` are rejected: they need an upload |
| `title` | Required, trimmed, non-empty |
| `url` | `http(s)` only. Required for `link` |
| `tags` | Optional array of strings, default `[]`. Blanks are dropped |
| `collectionIds` | Optional. Ids that aren't the caller's are silently dropped |
| `description`, `content`, `language` | Optional strings |
| `fileUrl`, `fileName`, `fileSize` | Ignored |

`201`:

```json
{ "data": { "id": "cm…", "title": "Debounce hook", "typeName": "snippet" } }
```

`400` for a body that isn't a JSON object, an unsupported `typeName`, or validation errors. Validation errors include `fieldErrors`:

```json
{ "error": "Validation failed", "fieldErrors": { "title": ["Title is required"] } }
```

## `POST /api/v1/ai/tags`

Suggests 3–5 tags. Same prompt, parsing and `ai` rate limit (20 an hour) as the [`generateAutoTags` action](server-actions.md#ai) (`suggestTagsForUser` in `src/lib/ai-tags.ts`).

Request: `{ "title": "…", "content": "…", "language": null, "typeName": "snippet" }`. `title` and `typeName` are required.

```json
{ "data": { "tags": ["react", "hooks", "debounce"] } }
```

`400` for invalid input, `429` over the AI limit, `502` when the model fails or answers in an unexpected format.

## Downloading the extension

`GET /api/extension/download` isn't part of `/api/v1`. It's a session route behind the **Download extension** button in Settings → Browser extension.

- `401` without a session, `403` for Free users (the check uses the session's `isPro`).
- Returns `bitbin-extension-{version}.zip`, with the version taken from `extension/manifest.json`. It unzips to one `bitbin-extension/` folder to load unpacked.
- Built at runtime from `extension/` by `buildExtensionZip` (`src/lib/extension-package.ts`) and cached per server process. `README.md` is left out.
- In production (`NODE_ENV=production`), the `http://localhost:3000/*` host permission and the "Local development" site option are removed.
- `next.config.ts` lists `extension/**` under `outputFileTracingIncludes` for this route. Without it, Vercel wouldn't ship the files and the download would fail with a `500`.

Not rate limited: it needs a Pro session, and the ZIP is built once per process.

## Changing this API

External clients call it, so a change must not break them. Add optional fields freely. Anything else (renaming, removing, changing a field's meaning or a status code) goes in a new `/api/v2/` route while `v1` keeps working.
