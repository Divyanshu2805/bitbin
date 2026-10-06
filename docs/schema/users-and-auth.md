# Users and Auth Tables

The account itself, the three tables NextAuth's Prisma adapter needs, and the API tokens used by the browser extension.

## `users`

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | `cuid()` |
| `email` | text, unique | Sign-in identity for both providers |
| `emailVerified` | timestamp, nullable | Set by `/api/auth/verify`, at registration when `SKIP_EMAIL_VERIFICATION` is on, or by the adapter for GitHub users |
| `name`, `image` | text, nullable | From the register form or the GitHub profile |
| `password` | text, nullable | bcrypt hash (cost 12). `null` for GitHub-only accounts — which is also how the app tells them apart |
| `isPro` | boolean, default `false` | The plan. Written only by the Stripe webhook; read into every session |
| `stripeCustomerId` | text, unique, nullable | Set at first checkout |
| `stripeSubscriptionId` | text, unique, nullable | Set by `checkout.session.completed`, cleared by `customer.subscription.deleted` |
| `sessionVersion` | integer, default `0` | Bumped on password change and reset. A session token issued with an older value is rejected, which is how sessions are revoked |
| `editorPreferences` | jsonb, nullable | Monaco settings; `null` means the defaults in `src/lib/constants/editor.ts` |
| `createdAt`, `updatedAt` | timestamp | |

Deleting a user cascades to `items`, `collections`, `item_types` owned by the user, `accounts`, `sessions` and `api_tokens`.

## `accounts`

One row per linked OAuth provider account (GitHub), written by the adapter.

| Column | Notes |
|---|---|
| `userId` | FK → `users.id`, cascade |
| `provider`, `providerAccountId` | Unique together |
| `type`, `access_token`, `refresh_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state` | The provider's token response, as NextAuth stores it |

When GitHub sign-in is refused for an email that has a password account, the `signIn` callback deletes the row the adapter just created.

## `sessions`

`id`, unique `sessionToken`, `userId` (cascade), `expires`. Required by the adapter's schema but **unused**: BitBin runs JWT sessions, so no rows are written.

## `verification_tokens`

| Column | Notes |
|---|---|
| `identifier` | The email for verification tokens; `password-reset:{email}` for reset tokens |
| `token` | Unique; 32 random bytes, hex |
| `expires` | 24 hours for verification, 1 hour for password reset |

Unique on (`identifier`, `token`). **`token` holds the SHA-256 of the token, never the token itself**: the raw value exists only in the emailed link, so reading this table doesn't give anyone a working link. Creating a token first deletes any earlier token with the same identifier, so each email has at most one live token of each kind. A token is deleted by the same statement that checks it exists, so it works exactly once even if the link is opened twice at the same moment; expired tokens are deleted only when someone tries to use them (`lib/tokens.ts`).

## `api_tokens`

Personal access tokens for the [token API](../api/token-api.md), created in Settings → Browser extension. Added by migration `20260924225247_add_api_tokens`.

| Column | Type | Notes |
|---|---|---|
| `id` | text, PK | `cuid()` |
| `userId` | text, FK → `users.id`, cascade | Indexed |
| `name` | text | Chosen by the user, up to 50 characters |
| `tokenHash` | text, unique | SHA-256 (hex) of the token. The token itself is never stored |
| `prefix` | text | The token's first 10 characters (`bb_…`), shown in Settings to tell tokens apart |
| `lastUsedAt` | timestamp, nullable | Updated by `/api/v1` requests, at most once a minute |
| `expiresAt` | timestamp, nullable | When the token stops working. `null` = never expires (tokens created before migration `20261005120000_add_api_token_expiry` stay `null`) |
| `createdAt` | timestamp | |

At most 10 per user (`MAX_API_TOKENS`, checked in `createApiToken`). A token expires after 30 days, 90 days (the default), 1 year or never, chosen when it's created; `authenticateApiRequest` rejects an expired one with `401`. Revoking one deletes the row. Tokens are **not** exported or imported.

## Related

- [Authentication flow](../architecture/flows/authentication.md)
- [Billing flow](../architecture/flows/billing.md)
