# API

BitBin's own UI talks to the server two ways: **server actions** for every write, and **route handlers** where a real URL is needed. Other clients (the browser extension, the desktop app, scripts and AI assistants) use the **token API** under `/api/v1`.

| | |
|---|---|
| Auth | The NextAuth session cookie. `/api/v1` takes `Authorization: Bearer bb_…` instead and ignores cookies |
| User id | Always from the session or the token. No endpoint accepts one as input |
| Not yours | A row that belongs to someone else is a `404`, the same as a missing one |
| Cross-site | Cookie-authenticated routes that change state answer `403 Cross-site request blocked` to a request a browser marks as coming from another site |
| Body size | Vercel refuses bodies over about 4.5 MB, so files over 4 MB go up in 4 MB parts, and large responses are streamed |

## Errors

Route handlers answer `{ "error": "…" }` with a status. Server actions never throw; they return an `ActionResult`:

```ts
{ success: true, data }
{ success: false, error: 'Validation failed', fieldErrors: { title: ['Title is required'] } }
{ success: false, error: 'You have reached the free tier limit of 50 items. Upgrade to Pro for unlimited items.' }
```

| Status | Meaning |
|---|---|
| `400` | Invalid input, or an invalid or expired link token. The Stripe webhook also uses it for a bad signature |
| `401` | No session, or for `/api/v1` no valid token |
| `403` | Signed in but not allowed: not Pro, not the owner, the demo account, a token without the scope, a cross-site request |
| `404` | Not found, including rows that belong to someone else |
| `413` | A body larger than the route accepts (the part routes, `/api/import`, `/api/v1/files`) |
| `429` | Rate limited, with `Retry-After` |
| `502` | `/api/v1/ai/*` only: the model failed or answered in an unexpected format |
| `500` | Unexpected. The real error is logged; the message is generic |

## Rate limits

Upstash sliding windows in `src/lib/rate-limit.ts`, keyed by IP plus the user or the email address. Limits that protect an inbox are keyed by the address alone, so rotating IPs can't flood one person.

| Name | Limit | Applied to |
|---|---|---|
| `login` | 5 / 15 min | Every credentials sign-in, inside `authorize()` |
| `register`, `registerEmail` | 3 / hour per IP, 3 / hour per address | `POST /api/auth/register` |
| `forgotPassword`, `forgotPasswordEmail` | 3 / hour per IP, 3 / hour per address | `POST /api/auth/forgot-password` |
| `resetPassword` | 5 / 15 min | `POST /api/auth/reset-password` |
| `resendVerification`, `resendVerificationEmail` | 3 / 15 min, 3 / hour per address | `POST /api/auth/resend-verification` |
| `changePassword` | 5 / 15 min | `POST /api/auth/change-password` |
| `sessions` | 5 / hour | `signOutEverywhere` |
| `search` | 240 / min | `searchLibrary` (the ⌘K palette) |
| `create` | 120 / min | Creating items and collections, renaming and deleting tags |
| `upload`, `uploadPart` | 10 / hour, 30 / hour | Uploads from the web and `/api/v1/files`, and their parts |
| `import`, `importPreview` | 5 / hour, 20 / hour | JSON and ZIP imports |
| `export` | 10 / hour | `GET /api/export` |
| `checkout`, `portal` | 10 / hour, 20 / hour | Stripe |
| `ai` | 20 / hour | The four AI actions and `/api/v1/ai/*` |
| `api` | 60 / min | Every `/api/v1` request, each MCP message included |

The client IP is `x-vercel-forwarded-for`, then `x-real-ip`, then the last `x-forwarded-for` entry, never the first, which a client can set. Without Upstash, production counts per instance in memory and development lets everything through. If Redis errors, the credential limits refuse the request for 60 seconds and the rest let it through.

## Route handlers

| Method | Path | Auth | Does |
|---|---|---|---|
| `GET`, `POST` | `/api/auth/[...nextauth]` | | NextAuth: sign-in, callbacks, sign-out |
| `POST` | `/api/auth/register` | Public | Create an account and email a verification link |
| `GET` | `/api/auth/verify` | Public | Verify an email with its link |
| `POST` | `/api/auth/resend-verification` | Public | Send a new verification link |
| `POST` | `/api/auth/forgot-password` | Public | Email a reset link. The same answer for every address |
| `POST` | `/api/auth/reset-password` | Public | Set a new password with a reset link. Ends every session |
| `POST` | `/api/auth/change-password` | Session | Change the password. Ends every session |
| `DELETE` | `/api/auth/delete-account` | Session | Cancel the subscription, delete stored files, delete the account |
| `GET` | `/api/items/[id]` | Session | The full item, for the drawer |
| `POST` | `/api/upload` | Session, Pro | Upload a file or image, whole or joined from parts |
| `PUT` | `/api/upload/part` | Session, Pro | One 4 MB part of a larger file |
| `GET` | `/api/download/[...path]` | Session, owner | Stream a file, as a download or with `?inline=1` as a sandboxed preview |
| `GET` | `/api/export` | Session | `?format=json` or `zip` (Pro), optionally `&collection={id}` |
| `POST` | `/api/import` | Session, Pro | Preview or import an export ZIP, files included |
| `GET` | `/api/extension/download` | Session, Pro | The browser extension as a ZIP, built from `extension/` |
| `POST` | `/api/stripe/checkout` | Session | Start a Checkout Session. `409` for an account already on Pro |
| `POST` | `/api/stripe/portal` | Session | Open the Customer Portal |
| `POST` | `/api/webhooks/stripe` | Stripe signature | Subscription events |
| `GET` | `/api/cron/reset-demo` | `Bearer CRON_SECRET` | Restore the demo library. Daily, 21:00 UTC |
| `GET` | `/api/cron/sweep-files` | `Bearer CRON_SECRET` | Delete stored files no item points at. Sundays, 03:00 UTC. `?dryRun=1` only reports |

The Stripe webhook handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` and `customer.subscription.deleted`. The cron routes compare the secret in constant time and refuse everyone when it isn't set.

## Server actions

| File | Actions |
|---|---|
| `items.ts` | `createItem`, `updateItem`, `deleteItem`, `toggleItemFavorite`, `toggleItemPin`, `getItemCollections`, `setItemCollection` |
| `collections.ts` | `createCollection`, `updateCollection`, `deleteCollection`, `toggleCollectionFavorite`, `toggleCollectionPin`, `getUserCollections` |
| `tags.ts` | `renameTag` (merges into an existing tag), `deleteTag` |
| `ai.ts` | `generateAutoTags`, `generateDescription`, `explainCode`, `optimizePrompt` |
| `import.ts` | `previewImport`, `importData` |
| `api-tokens.ts` | `createApiToken`, `revokeApiToken` |
| `search.ts` | `searchLibrary` |
| `settings.ts` | `updateEditorPreferences`, `updateName`, `signOutEverywhere` |
| `auth.ts` | `signInWithGitHub` |

- `createItem` takes `{ typeName, title, description?, content?, url?, language?, tags, collectionIds?, fileUrl?, fileName?, fileSize? }`. Files and images need Pro, a link needs a URL, collection ids that aren't the caller's are dropped, and a snippet or command without a language gets one detected.
- `updateItem` replaces the item's fields, tags and collection links in one transaction.
- The AI actions all run session, Pro, Zod, then the `ai` limit, and send the model the first 2,000 characters of an item.
- `importData` runs in one transaction, keeps the original dates, applies the Free limits and can skip duplicates (same title, type and content).
- The demo account can't save links, items over 5,000 characters or imports, and can't rename itself or sign out everywhere.

## Token API

```
Authorization: Bearer bb_…
```

Tokens are made in **Settings → Browser extension** (Pro), shown once, stored as a SHA-256 hash, and expire after 30, 90 (default) or 365 days. Each one carries the scopes it was made with:

| Scope | Allows |
|---|---|
| `collections:read` | `GET /api/v1/collections` |
| `items:read` | `GET /api/v1/items`, `GET /api/v1/items/{id}` |
| `items:write` | `POST /api/v1/items`, `POST /api/v1/collections` |
| `files:write` | `POST /api/v1/files`, `PUT /api/v1/files/part` |
| `ai` | `POST /api/v1/ai/tags`, `POST /api/v1/ai/description` |

| Method | Path | Does |
|---|---|---|
| `GET` | `/api/v1/me` | Check a token: email, name, plan and scopes |
| `GET` | `/api/v1/collections` | The caller's collections, by name |
| `POST` | `/api/v1/collections` | Create a collection (`{ "name": "…" }`) |
| `GET` | `/api/v1/items` | Search with `?q=` (the ⌘K search, `#tag` included) or list the newest. `limit` 1 to 20 |
| `GET` | `/api/v1/items/{id}` | One item in full. A file reports its name and size only |
| `POST` | `/api/v1/items` | Create a snippet, prompt, command, note or link |
| `POST` | `/api/v1/files` | Upload a file or image and create its item in one request |
| `PUT` | `/api/v1/files/part` | `?uploadId=&index=`, one 4 MB part of a larger file |
| `POST` | `/api/v1/ai/tags` | 3 to 5 suggested tags |
| `POST` | `/api/v1/ai/description` | A one- or two-sentence description |
| `POST` | `/api/v1/mcp` | The MCP server |

Successful responses wrap their payload in `data`:

```json
POST /api/v1/items
{ "typeName": "snippet", "title": "Debounce hook", "content": "export function useDebounce…", "tags": ["react", "hooks"], "collectionIds": ["cm…"] }

201
{ "data": { "id": "cm…", "title": "Debounce hook", "typeName": "snippet" } }
```

`POST /api/v1/items` and `POST /api/v1/files` share their validation and plan checks with the web form (`createItemForUser`), and the AI endpoints share their prompts and limit with the AI actions. `401` means no token, an unknown one or an expired one. `403` means the owner isn't on Pro or the token lacks the scope. `POST /api/v1/files` deletes the stored file again if creating the item fails.

The API stays backward compatible, because the extension and the desktop app depend on it. New optional fields are fine. A rename, a removal or a new meaning goes in `/api/v2`.

### MCP

```bash
claude mcp add --transport http bitbin https://bitbin.divyanshuagrahari.dev/api/v1/mcp --header "Authorization: Bearer bb_…"
```

| Tool | Scope | Does |
|---|---|---|
| `search_items` | `items:read` | The same search as `GET /api/v1/items` |
| `get_item` | `items:read` | One item in full |
| `list_collections` | `collections:read` | Collection names and ids |
| `save_item` | `items:write` | Save a snippet, prompt, command, note or link, filed into a collection by name (created if there is none) |

Each `POST` carries one JSON-RPC message, or a batch of up to 20, and gets one JSON answer. There are no sessions and no server-sent stream, so `GET` is a `405`. It supports `initialize` (protocol revisions `2025-06-18`, `2025-03-26` and `2024-11-05`), `ping`, `tools/list` and `tools/call`. `tools/list` shows only the tools the token's scopes allow.

## Export format

```json
{
  "version": 1,
  "exportedAt": "2026-03-01T10:00:00.000Z",
  "items": [
    {
      "title": "useDebounce hook", "type": "snippet", "content": "export function useDebounce…",
      "language": "typescript", "description": "Debounce any value", "url": null,
      "fileName": null, "fileSize": null, "fileUrl": null, "zipPath": null,
      "tags": ["react", "hooks"], "collections": ["React Patterns"],
      "isFavorite": true, "isPinned": false, "createdAt": "…", "updatedAt": "…"
    }
  ],
  "collections": [{ "name": "React Patterns", "description": "…", "isFavorite": false, "isPinned": false }]
}
```

Items name their type, tags and collections instead of holding ids, so an export imports into any account. A ZIP export (Pro) adds the text items as readable files and the uploaded files:

```
bitbin-export.json   the manifest above, the part read back on import
snippets/            one file per snippet, with its language's extension
prompts/             one .md per prompt
commands/            one .sh per command
notes/               one .md per note
links.md             every link as a Markdown list
files/               uploaded files and images; each item's zipPath points here
```

| Import | Limits |
|---|---|
| JSON, through `previewImport` and `importData` | 5,000 items and 5,000 collections |
| ZIP, through `POST /api/import` with `mode=preview` or `mode=import` | 20 MB, 100 files, 10 MB per file, 40 MB inflated, 8 MB manifest |
