# API Reference

BitBin has no public API — every endpoint here exists for BitBin's own UI and authenticates with the browser session cookie. There are two kinds:

- **Route handlers** under `src/app/api/` — real HTTP endpoints, used where the browser, NextAuth or Stripe needs a URL.
- **Server actions** under `src/actions/` — async functions called from client components, which Next.js turns into POST requests. Every UI write goes through one ([ADR 0002](../architecture/decisions/0002-server-actions-for-writes.md)).

## Route handlers

| Method | Path | Auth | Purpose | Page |
|---|---|---|---|---|
| `GET`, `POST` | `/api/auth/[...nextauth]` | — | NextAuth: sign-in, callbacks, sign-out, session | [Auth](auth.md) |
| `POST` | `/api/auth/register` | Public | Create an account | [Auth](auth.md) |
| `GET` | `/api/auth/verify` | Public | Verify an email with a token | [Auth](auth.md) |
| `POST` | `/api/auth/resend-verification` | Public | Send a fresh verification link | [Auth](auth.md) |
| `POST` | `/api/auth/check-login-limit` | Public | Check the sign-in rate limit before calling NextAuth | [Auth](auth.md) |
| `POST` | `/api/auth/forgot-password` | Public | Email a password-reset link | [Auth](auth.md) |
| `POST` | `/api/auth/reset-password` | Public | Set a new password with a reset token | [Auth](auth.md) |
| `POST` | `/api/auth/change-password` | Session | Change the password | [Auth](auth.md) |
| `DELETE` | `/api/auth/delete-account` | Session | Delete the account | [Auth](auth.md) |
| `GET` | `/api/items/[id]` | Session | Full item for the drawer | [Items and files](items-and-files.md) |
| `POST` | `/api/upload` | Session, Pro | Upload a file or image to R2 | [Items and files](items-and-files.md) |
| `GET` | `/api/download/[...path]` | Session, owner | Download a file with its name | [Items and files](items-and-files.md) |
| `GET` | `/api/export` | Session (ZIP: Pro) | Download a JSON or ZIP export | [Export format](export-format.md) |
| `POST` | `/api/stripe/checkout` | Session | Start a Checkout Session | [Billing](billing.md) |
| `POST` | `/api/stripe/portal` | Session | Open the Customer Portal | [Billing](billing.md) |
| `POST` | `/api/webhooks/stripe` | Stripe signature | Receive subscription events | [Billing](billing.md) |

## Server actions

| File | Actions | Page |
|---|---|---|
| `items.ts` | `createItem`, `updateItem`, `deleteItem`, `toggleItemFavorite`, `toggleItemPin` | [Server actions](server-actions.md#items) |
| `collections.ts` | `createCollection`, `updateCollection`, `deleteCollection`, `toggleCollectionFavorite`, `getUserCollections` | [Server actions](server-actions.md#collections) |
| `ai.ts` | `generateAutoTags`, `generateDescription`, `explainCode`, `optimizePrompt` | [Server actions](server-actions.md#ai) |
| `import.ts`, `export.ts` | `previewImport`, `importData`, `exportData` | [Server actions](server-actions.md#import-and-export) |
| `search.ts`, `settings.ts`, `auth.ts` | `getSearchData`, `updateEditorPreferences`, `signInWithGitHub` | [Server actions](server-actions.md#search-settings-and-sign-in) |

## Conventions

- Route handlers return JSON; errors are `{ "error": "…" }` with a meaningful status. Server actions return an `ActionResult`. Both are described in [errors and rate limits](errors-and-rate-limits.md).
- The user is always taken from the session. No endpoint accepts a user id as input.

## Related

- [Architecture flows](../architecture/README.md) — how these fit into end-to-end requests.
- [Security model](../architecture/security-model.md#what-protects-each-route)
