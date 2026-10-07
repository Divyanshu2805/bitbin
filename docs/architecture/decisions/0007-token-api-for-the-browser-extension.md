# 0007. A small token-authenticated API for the browser extension

**Status:** Accepted, amended (tokens now expire, and the desktop app is a second client). Amends the "there is no public API" consequence of [0001](0001-one-nextjs-app-no-separate-api.md).

## Context

"Save from anywhere" is a Pro feature: select text on any page, press a shortcut, and the selection lands in BitBin through a small popup. It ships as a Chrome / Edge (Manifest V3) extension, and a desktop tray app uses the same API.

Neither client can use BitBin's existing entry points. Server actions are an internal Next.js protocol tied to the app's own build, and the session cookie belongs to the BitBin site. Sending it from an extension would mean requesting cookie permissions and relying on the user being signed in in that browser profile. A client outside the browser needs a credential that doesn't depend on a browser session.

## Decision

Add a small, versioned JSON API under `/api/v1/`, authenticated only by **personal access tokens**:

- A user on Pro creates tokens in **Settings → Browser extension**. A token is `bb_` + 32 random bytes (base64url). It is shown once. Only its SHA-256 hash (`api_tokens.tokenHash`) and a 10-character display prefix are stored.
- Every request sends `Authorization: Bearer bb_…`. `authenticateApiRequest` in `src/lib/api-auth.ts` hashes the token, looks it up, **re-reads `isPro` from the database on every request** (a cancelled subscription loses access on its next call), applies the `api` rate limit per user, and records `lastUsedAt` at most once a minute. A token carries an `expiresAt` (30 days, 90 days by default or 1 year, chosen at creation; there is no "never") and is refused with `401` once it has passed.
- Cookies are ignored, so the API is origin-agnostic and has no CSRF surface. There are no CORS headers: MV3 extension pages with `host_permissions` for the site aren't subject to CORS.
- The endpoints are the minimum the clients need: `GET /me`, `GET /collections`, `POST /items`, `POST /ai/tags` and `POST /ai/description`. They don't duplicate logic. `POST /items` and the `createItem` action both call `createItemForUser` (`src/lib/item-create.ts`), and the AI endpoints share `suggestTagsForUser` (`src/lib/ai-tags.ts`) and `describeItemForUser` (`src/lib/ai-description.ts`) with their actions.
- Files and images can't be created through the API. They need an upload, and taking a `fileUrl` from a new client would add one more place that has to check ownership (`isOwnedFileUrl`).

## Consequences

- BitBin now has an external contract. Changes to `/api/v1/*` responses must stay backward compatible, or ship as `/api/v2/` while `v1` keeps working until the extension is updated.
- Tokens are long-lived bearer credentials. Revoking one (Settings → Browser extension) takes effect on the next request. A token expires after the lifetime picked when it is created (30 days, 90 days by default, or a year), and carries scopes (`collections:read`, `items:write`, `ai`) chosen at creation and checked on every request, so a leaked token can do only what its client needed. A user can hold at most 10.
- The token lookup is the one query not scoped by user id, because the token is what identifies the user. Everything after it is scoped by the token owner's id, exactly like a session.
- Collection ids sent to the create path are filtered to the caller's own collections in `lib/db/items.ts`. The `createItem` / `updateItem` actions do the same.
- The same API serves the desktop tray app, and could serve a CLI, without further server changes.
