# Token API (`/api/v1`)

The one API meant for clients other than the BitBin website: the [browser extension](../../extension/README.md), the [desktop tray app](../../desktop/README.md), your own scripts, and AI assistants through the [MCP endpoint](#post-apiv1mcp). Why it exists and how it's shaped is in [ADR 0007](../architecture/decisions/0007-token-api-for-the-browser-extension.md).

## Authentication

Every request sends a personal access token:

```
Authorization: Bearer bb_…
```

- Tokens are created and revoked in **Settings → Browser extension** (Pro only), at most 10 per user. The plain token is shown once. BitBin stores its SHA-256 hash.
- A token expires after the lifetime chosen when it's created: 30 days, 90 days (the default) or 1 year. There is no "never": a leaked token has to stop working eventually. Settings shows how long each token has left, and an expired one has to be replaced.
- A token carries **permissions** (scopes), chosen when it is created and checked on every request:

  | Scope | Label in Settings | Allows |
  |---|---|---|
  | `collections:read` | List collections | `GET /api/v1/collections` |
  | `items:read` | Search and read items | `GET /api/v1/items`, `GET /api/v1/items/{id}` |
  | `items:write` | Save items | `POST /api/v1/items`, `POST /api/v1/collections` |
  | `files:write` | Save files and images | `POST /api/v1/files`, `PUT /api/v1/files/part` |
  | `ai` | AI suggestions | `POST /api/v1/ai/tags`, `/ai/description` |

  `GET /api/v1/me` needs none, and `POST /api/v1/mcp` checks the scope of each tool it runs. The extension uses `collections:read`, `items:write` and `ai`; the desktop app adds `files:write`; an assistant needs `items:read`, plus `items:write` and `collections:read` to save. Neither app reads items, so a token made before `items:read` existed keeps working for them. A script that only saves items needs just `items:write`, and if it leaks it can't read collections, upload or spend the AI quota.
- Cookies are ignored. A request with a session cookie and no token is rejected.
- The owner's plan is re-read on every request, so a user who stops being Pro gets `403` from then on, even with a valid token.

| Status | When |
|---|---|
| `401` | No `Authorization` header, not `Bearer bb_…`, an unknown / revoked token, or an **expired** one ("API token has expired. Create a new one in Settings.") |
| `403` | The token's owner isn't on Pro, or the token lacks the permission the endpoint needs (`This token isn't allowed to do that. Create a token with the "…" permission.`) |
| `429` | Over the `api` limit (60 requests a minute per user), with `Retry-After` |

Errors are `{ "error": "…" }`, as for every [route handler](errors-and-rate-limits.md#route-handlers). Successful responses wrap their payload in `data`.

## `GET /api/v1/me`

Checks a token. Used by the extension's options page and the desktop app's settings window.

```json
{ "data": { "email": "you@example.com", "name": "You", "isPro": true, "scopes": ["collections:read", "items:write", "ai"] } }
```

`scopes` says what the token may do, so a client can switch off what it has no permission for.

## `GET /api/v1/collections`

The caller's collections, sorted by name, for the extension's picker.

```json
{ "data": [{ "id": "cm…", "name": "Snippets I like" }] }
```

## `POST /api/v1/collections`

Creates a collection, so the extension and the desktop app can file a save into a new one. It takes the `items:write` permission (creating the place a save goes is part of saving), which keeps existing tokens working. Validation and the plan check are shared with the [`createCollection` action](server-actions.md#collections) (`createCollectionForUser` in `src/lib/collection-create.ts`).

```json
{ "name": "Snippets I like" }
```

| Field | Rules |
|---|---|
| `name` | Required, trimmed, 1–100 characters |

`201` with `{ "data": { "id": "cm…", "name": "Snippets I like" } }`; `400` with `fieldErrors` for a bad name; `403` when a Free-limit applies (the 3-collection cap; the token API is Pro-only, so it is a safety net).

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
| `description`, `content`, `language` | Optional strings; `description` is at most 1000 characters (longer is a `400`). A `snippet` or `command` sent without `language` gets one detected from `content` (a command that matches nothing is `bash`) |
| `fileUrl`, `fileName`, `fileSize` | Ignored |

`201`:

```json
{ "data": { "id": "cm…", "title": "Debounce hook", "typeName": "snippet" } }
```

`400` for a body that isn't a JSON object, an unsupported `typeName`, or validation errors. Validation errors include `fieldErrors`:

```json
{ "error": "Validation failed", "fieldErrors": { "title": ["Title is required"] } }
```

## `GET /api/v1/items`

Searches the caller's items. Needs `items:read`. The same search as the ⌘K palette (`searchApiItems` in `src/lib/api-item.ts`).

| Query | Rules |
|---|---|
| `q` | Optional. Matched against titles, content, descriptions, URLs and tags; `#react` looks at tags only. Without it, the most recently edited items are listed |
| `limit` | Optional, 1 to 20, default 10. Anything else becomes the default |

```json
{ "data": { "items": [{ "id": "cm…", "title": "Tail pod logs", "typeName": "command", "preview": "kubectl logs -f deploy/api", "tags": ["k8s"] }] } }
```

`preview` is the first 100 characters of the content. `400` when `q` is longer than 400 characters.

## `GET /api/v1/items/{id}`

One item in full. Needs `items:read`.

```json
{ "data": { "id": "cm…", "title": "Tail pod logs", "typeName": "command", "description": null, "content": "kubectl logs -f deploy/api", "url": null, "language": "bash", "tags": ["k8s"], "collections": [{ "id": "cm…", "name": "Infra" }], "fileName": null, "fileSize": null, "isFavorite": false, "isPinned": false, "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-02T00:00:00.000Z" } }
```

A file or image item reports its `fileName` and `fileSize` only: the bucket is private and the bytes are served to a signed-in browser, not to a token. `404` for an item that doesn't exist or belongs to someone else.

## `POST /api/v1/mcp`

BitBin as a [Model Context Protocol](https://modelcontextprotocol.io) server, so an assistant such as Claude can use the bin. The protocol and the tools are in `src/lib/mcp.ts`.

Connect Claude Code with a token from Settings (Settings → AI assistants shows this command with the site's address filled in):

```bash
claude mcp add --transport http bitbin https://bitbin.divyanshuagrahari.dev/api/v1/mcp --header "Authorization: Bearer bb_…"
```

Any other MCP client adds a remote (Streamable HTTP) server at that address with the same header.

| Tool | Scope | Does |
|---|---|---|
| `search_items` | `items:read` | `query` (optional) and `limit`: the same search as `GET /api/v1/items` |
| `get_item` | `items:read` | `id`: the item in full, as `GET /api/v1/items/{id}` |
| `list_collections` | `collections:read` | Collection names and ids |
| `save_item` | `items:write` | `type` (snippet, prompt, command, note or link), `title`, and optionally `content`, `url`, `description`, `language`, `tags` and `collection`. `collection` is a name: it is matched without regard to case, and created when there is none |

- The token is checked like any other `/api/v1` request (`401`, `403` for a Free owner, `429` over the `api` limit), with no scope of its own. `tools/list` returns only the tools the token's scopes allow, and calling one it lacks answers with an error result naming the missing permission.
- Saving goes through `createItemForUser` and `createCollectionForUser`, so validation and plan limits are the ones every other save has.
- The transport is Streamable HTTP in its simplest form: each `POST` carries one JSON-RPC message (or a batch of up to 20) and gets one JSON answer. There are no sessions and no server-sent stream, so `GET` answers `405`. A notification is acknowledged with `202` and no body; a body that isn't JSON gets `400` with a JSON-RPC parse error.
- Methods: `initialize` (protocol revisions `2025-06-18`, `2025-03-26` and `2024-11-05`), `ping`, `tools/list` and `tools/call`. Anything else is "method not found".
- A tool that fails answers with `isError: true` and a sentence for the assistant; the real error is logged on the server.

## `POST /api/v1/files`

Uploads a file or image and creates its item in one request. Needs `files:write`. Used by the desktop app.

Multipart form:

| Field | Rules |
|---|---|
| `file` | The file, if it is 4 MB or less. The same rules as a web upload: images (png, jpg, jpeg, gif, webp, svg) up to 5 MB, files (pdf, txt, md, json, yaml, yml, xml, csv, toml, ini) up to 10 MB, bytes that match the extension, photos re-encoded without metadata |
| `uploadId`, `partCount`, `fileName` | Instead of `file`, for a larger file already sent to [`PUT /api/v1/files/part`](#put-apiv1filespart). The parts are deleted once read |
| `itemType` | Required. `file` or `image` |
| `title` | Optional; the file name when absent |
| `description` | Optional, at most 1000 characters |
| `tags` | Optional, comma-separated |
| `collectionId` | Optional. Dropped if it isn't the caller's |

`201` with `{ "data": { "id": "cm…", "title": "…", "typeName": "image" } }`.

| Status | When |
|---|---|
| `400` | Not a multipart form, no file, a bad `itemType`, a file that fails the checks, or validation errors (with `fieldErrors`) |
| `413` | `Content-Length` above 4 MB plus 64 KB, refused before the body is read (send the file in parts) |
| `429` | Over the `upload` limit (10 an hour per user, shared with the web uploader), with `Retry-After` |
| `500` | Storage failed, or the item couldn't be created, in which case the stored file is deleted again |

Hosts refuse request bodies above about 4.5 MB, so a larger file goes in parts.

## `PUT /api/v1/files/part`

`?uploadId={uuid}&index={0–4}`, with up to 4 MB of the file's raw bytes as the body. Needs `files:write`. Stores the part in the token owner's folder for `POST /api/v1/files` to join; parts never joined are deleted by the weekly sweep after a day. `200` with `{ "data": { "stored": true } }`; `400` for a bad id, index or body; `413` for a declared body over 4 MB; `429` over the `uploadPart` limit (30 an hour). The desktop app cuts a file over 4 MB into parts, sends each, then sends the save request naming them.

## `POST /api/v1/ai/tags`

Suggests 3–5 tags. Same prompt, parsing and `ai` rate limit (20 an hour) as the [`generateAutoTags` action](server-actions.md#ai) (`suggestTagsForUser` in `src/lib/ai-tags.ts`).

Request: `{ "title": "…", "content": "…", "language": null, "typeName": "snippet" }`. `title` and `typeName` are required.

```json
{ "data": { "tags": ["react", "hooks", "debounce"] } }
```

`400` for invalid input, `429` over the AI limit, `502` when the model fails or answers in an unexpected format.

## `POST /api/v1/ai/description`

Writes a 1–2 sentence description. Same prompt, parsing and `ai` rate limit as the [`generateDescription` action](server-actions.md#ai) (`describeItemForUser` in `src/lib/ai-description.ts`). The extension's ✦ Suggest calls it alongside `/ai/tags`, so one click uses two of the 20 AI requests an hour.

Request: `{ "title": "…", "content": "…", "url": null, "language": null, "typeName": "snippet" }`. `title` and `typeName` are required.

```json
{ "data": { "description": "Caches a calculation between re-renders." } }
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
