# API Reference

Almost every endpoint here exists for BitBin's own UI and authenticates with the browser session cookie. The exception is the [token API](token-api.md) under `/api/v1`, which the browser extension and the desktop app call with a personal access token ([ADR 0007](../architecture/decisions/0007-token-api-for-the-browser-extension.md)). There are two kinds of endpoint:

- **Route handlers** under `src/app/api/` — real HTTP endpoints, used where the browser, NextAuth or Stripe needs a URL.
- **Server actions** under `src/actions/` — async functions called from client components, which Next.js turns into POST requests. Every UI write goes through one ([ADR 0002](../architecture/decisions/0002-server-actions-for-writes.md)).

## Route handlers

| Method | Path | Auth | Purpose | Page |
|---|---|---|---|---|
| `GET`, `POST` | `/api/auth/[...nextauth]` | — | NextAuth: sign-in, callbacks, sign-out, session | [Auth](auth.md) |
| `POST` | `/api/auth/register` | Public | Create an account | [Auth](auth.md) |
| `GET` | `/api/auth/verify` | Public | Verify an email with a token | [Auth](auth.md) |
| `POST` | `/api/auth/resend-verification` | Public | Send a fresh verification link | [Auth](auth.md) |
| `POST` | `/api/auth/forgot-password` | Public | Email a password-reset link | [Auth](auth.md) |
| `POST` | `/api/auth/reset-password` | Public | Set a new password with a reset token | [Auth](auth.md) |
| `POST` | `/api/auth/change-password` | Session | Change the password | [Auth](auth.md) |
| `DELETE` | `/api/auth/delete-account` | Session | Delete the account (password required for password accounts) | [Auth](auth.md) |
| `GET` | `/api/items/[id]` | Session | Full item for the drawer | [Items and files](items-and-files.md) |
| `POST` | `/api/upload` | Session, Pro | Upload a file or image to R2 | [Items and files](items-and-files.md) |
| `GET` | `/api/download/[...path]` | Session, owner | Download a file with its name | [Items and files](items-and-files.md) |
| `GET` | `/api/export` | Session (ZIP: Pro) | Download a JSON or ZIP export | [Export format](export-format.md) |
| `GET` | `/api/extension/download` | Session, Pro | Download the browser extension as a ZIP | [Token API](token-api.md#downloading-the-extension) |
| `POST` | `/api/stripe/checkout` | Session | Start a Checkout Session | [Billing](billing.md) |
| `POST` | `/api/stripe/portal` | Session | Open the Customer Portal | [Billing](billing.md) |
| `POST` | `/api/webhooks/stripe` | Stripe signature | Receive subscription events | [Billing](billing.md) |
| `GET` | `/api/cron/reset-demo` | `Bearer CRON_SECRET` | Restore the public demo account's library (called daily by Vercel Cron) | [Operations](#operations-endpoint) |
| `GET` | `/api/v1/me` | Token, Pro | Check an API token | [Token API](token-api.md) |
| `GET` | `/api/v1/collections` | Token, Pro | The caller's collections, for the extension's picker | [Token API](token-api.md) |
| `POST` | `/api/v1/items` | Token, Pro | Create a text or link item | [Token API](token-api.md) |
| `POST` | `/api/v1/ai/tags` | Token, Pro | AI tag suggestions | [Token API](token-api.md) |
| `POST` | `/api/v1/ai/description` | Token, Pro | AI-written description | [Token API](token-api.md) |

## Operations endpoint

`GET /api/cron/reset-demo` is called once a day by the cron in `vercel.json` (21:00 UTC), never by the UI. Vercel sends `Authorization: Bearer $CRON_SECRET` when the variable is set in the project.

| Status | When |
|---|---|
| `200` | `{ success: true }` — the demo library was restored in one transaction (and its name, plan and Stripe ids reset). `{ success: true, skipped: true }` when the database has no demo account |
| `401` | Missing or wrong bearer value (compared in constant time), or `CRON_SECRET` isn't set, in which case the route refuses every caller |
| `500` | The reset failed; logged as `Demo reset failed` |

## Pages that need no API

The public [Privacy Policy](../../src/app/privacy/page.tsx) (`/privacy`) and [Terms of Service](../../src/app/terms/page.tsx) (`/terms`) are static pages; they call nothing and need no session.

## Server actions

| File | Actions | Page |
|---|---|---|
| `items.ts` | `createItem`, `updateItem`, `deleteItem`, `toggleItemFavorite`, `toggleItemPin` | [Server actions](server-actions.md#items) |
| `collections.ts` | `createCollection`, `updateCollection`, `deleteCollection`, `toggleCollectionFavorite`, `toggleCollectionPin`, `getUserCollections` | [Server actions](server-actions.md#collections) |
| `ai.ts` | `generateAutoTags`, `generateDescription`, `explainCode`, `optimizePrompt` | [Server actions](server-actions.md#ai) |
| `import.ts`, `export.ts` | `previewImport`, `importData`, `exportData` | [Server actions](server-actions.md#import-and-export) |
| `api-tokens.ts` | `createApiToken`, `revokeApiToken` | [Server actions](server-actions.md#api-tokens) |
| `search.ts`, `settings.ts`, `auth.ts` | `getSearchData`, `updateEditorPreferences`, `updateName`, `signInWithGitHub` | [Server actions](server-actions.md#search-settings-and-sign-in) |

## Conventions

- Route handlers return JSON; errors are `{ "error": "…" }` with a meaningful status. Server actions return an `ActionResult`. Both are described in [errors and rate limits](errors-and-rate-limits.md).
- The user is always taken from the session, or for `/api/v1`, from the token. No endpoint accepts a user id as input.

## Related

- [Architecture flows](../architecture/README.md) — how these fit into end-to-end requests.
- [Security model](../architecture/security-model.md#what-protects-each-route)
