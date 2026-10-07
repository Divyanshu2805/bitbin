# Auth Endpoints

Route handlers under `src/app/api/auth/`. Sign-in itself goes through NextAuth (`/api/auth/[...nextauth]`, from `handlers` in `src/auth.ts`); these cover everything around it. The end-to-end behaviour is in the [authentication flow](../architecture/flows/authentication.md).

## `POST /api/auth/register`

```json
{ "name": "Ada", "email": "ada@example.com", "password": "…", "confirmPassword": "…", "turnstileToken": "…" }
```

`turnstileToken` is only needed when [Cloudflare Turnstile](../local-development/configuration.md#bot-protection-and-upload-scanning) is configured: a missing or failing token is a `400` before anything else happens. The same applies to `forgot-password`.

| Status | When |
|---|---|
| `201` | `message` says to check email (or "Account created successfully" when verification is skipped). **The same answer for a new address and one that's already registered**, so the endpoint can't be used to find accounts; no user object is returned |
| `400` | Missing or non-string fields, an invalid email (over 254 characters or not `a@b.c`), a name over 50 characters, passwords don't match, a password under 8 or over 128 characters. With verification skipped (development only) an existing email is also a `400` |
| `429` | `register` limit — 3 / hour per IP, or 3 / hour for the same address from any IP (`registerEmail`) |
| `500` | Unexpected error, including a failed verification email, in which case the just-created account is deleted so the address can register again |

Registering an address that already has an account never changes a verified or GitHub-only account and sends nothing. For an **unverified** password account it replaces the stored password and name with the new ones and resends the verification email, so a password set by someone who never controlled the mailbox doesn't survive the real owner registering.

## `GET /api/auth/verify?token=…`

| Status | When |
|---|---|
| `200` | Verified — or "Email already verified" |
| `400` | Missing, unknown or expired token (an expired token is deleted) |
| `404` | The token's email no longer has an account |
| `500` | Unexpected error |

## `POST /api/auth/resend-verification`

`{ "email": "…" }`. `400` without an email; `429` over the `resendVerification` limit (3 / 15 min per IP + email) or the per-address `resendVerificationEmail` limit (3 / hour). Otherwise `200` with the same message for an unknown address, a verified account and an unverified one (mail is only sent to the last).

## `POST /api/auth/forgot-password`

`{ "email": "…" }`. Always `200` with "If an account exists with this email, a password reset link has been sent." — it never reveals whether an account exists, and sends nothing for GitHub-only accounts or the public demo account. `400` without an email (or, with Turnstile on, a failing token), `429` over the `forgotPassword` limit (3 / hour per IP) or the per-address `forgotPasswordEmail` limit (3 / hour).

## `POST /api/auth/reset-password`

```json
{ "token": "…", "password": "…", "confirmPassword": "…" }
```

| Status | When |
|---|---|
| `200` | Password changed; every existing session ends (`sessionVersion` is bumped) and the token is deleted |
| `400` | Missing token or passwords, mismatch, under 8 or over 128 characters, invalid token, or expired token. The password is checked **before** the token is spent, so a typo doesn't burn the link |
| `404` | The token's account no longer exists |
| `429` | `resetPassword` limit — 5 / 15 min per IP |

## `POST /api/auth/change-password`

Session required. `{ "currentPassword": "…", "newPassword": "…" }`.

| Status | When |
|---|---|
| `200` | Changed. Every session ends, this one included (`sessionVersion` is bumped); the UI signs out and asks the user to sign in again |
| `400` | Missing or non-string fields, new password under 8 or over 128 characters, a GitHub-only account ("not available for OAuth accounts"), or a wrong current password |
| `401` | No session |
| `403` | The public demo account, whose password is published and can't be changed, or a request a browser says came from another site |
| `429` | `changePassword` limit, 5 / 15 min per IP + user |

## `DELETE /api/auth/delete-account`

Session required. `{ "password": "…" }` in the body — required, and checked with bcrypt, for accounts that have a password (GitHub-only accounts send nothing). Cancels the Stripe subscription first (the account is kept if that fails), deletes the user's `{userId}/` files from R2 (best effort, logged on failure), then deletes the user; items, collections, accounts and sessions cascade. `200` with `{ success: true }`, `400` for a wrong or missing password, `401` without a session, `403` for the public demo account or a cross-site request, `404` if the account is gone, `500` on failure (including a subscription that couldn't be cancelled, in which case nothing is deleted).

## Signing in (`POST /api/auth/callback/credentials`)

Handled by NextAuth, which calls `authorizeCredentials()` (`src/lib/credentials.ts`). The form posts `email` and `password`. NextAuth answers every failure with a redirect URL whose `error` and `code` query parameters tell the form what happened:

| `code` | Meaning | What the form does |
|---|---|---|
| `rate_limited` | The `login` limit (5 / 15 min per IP + email) was hit | Shows a try-again-later message |
| `credentials` | Wrong email or password, an unknown account and a GitHub-only account all look the same; an unverified email is `EmailNotVerified` | Shows "Invalid email or password" or the verify prompt |


## Related

- [Errors and rate limits](errors-and-rate-limits.md)
- [Users and auth tables](../schema/users-and-auth.md)
