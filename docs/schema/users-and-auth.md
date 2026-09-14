# Users and Auth Tables

The account itself, and the three tables NextAuth's Prisma adapter needs.

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
| `editorPreferences` | jsonb, nullable | Monaco settings; `null` means the defaults in `src/lib/constants/editor.ts` |
| `createdAt`, `updatedAt` | timestamp | |

Deleting a user cascades to `items`, `collections`, `item_types` owned by the user, `accounts` and `sessions`.

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

Unique on (`identifier`, `token`). Creating a token first deletes any earlier token with the same identifier, so each email has at most one live token of each kind. Tokens are deleted when used; expired tokens are deleted only when someone tries to use them.

## Related

- [Authentication flow](../architecture/flows/authentication.md)
- [Billing flow](../architecture/flows/billing.md)
