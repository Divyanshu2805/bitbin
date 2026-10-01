# Auth Endpoints

Route handlers under `src/app/api/auth/`. Sign-in itself goes through NextAuth (`/api/auth/[...nextauth]`, from `handlers` in `src/auth.ts`); these cover everything around it. The end-to-end behaviour is in the [authentication flow](../architecture/flows/authentication.md).

## `POST /api/auth/register`

```json
{ "name": "Ada", "email": "ada@example.com", "password": "…", "confirmPassword": "…" }
```

| Status | When |
|---|---|
| `201` | `message` says to check email (or "Account created successfully" when verification is skipped). **The same answer for a new address and one that's already registered**, so the endpoint can't be used to find accounts; no user object is returned |
| `400` | Missing or non-string fields, an invalid email (over 254 characters or not `a@b.c`), a name over 50 characters, passwords don't match, a password under 8 or over 128 characters. With verification skipped (development only) an existing email is also a `400` |
| `429` | `register` limit — 3 / hour per IP |
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

`{ "email": "…" }`. `400` without an email; `429` over the `resendVerification` limit (3 / 15 min per IP + email). Otherwise `200` with the same message for an unknown address, a verified account and an unverified one (mail is only sent to the last).

## `POST /api/auth/forgot-password`

`{ "email": "…" }`. Always `200` with "If an account exists with this email, a password reset link has been sent." — it never reveals whether an account exists. `400` without an email, `429` over the `forgotPassword` limit (3 / hour per IP).

## `POST /api/auth/reset-password`

```json
{ "token": "…", "password": "…", "confirmPassword": "…" }
```

| Status | When |
|---|---|
| `200` | Password changed; the token is deleted |
| `400` | Missing token or passwords, mismatch, under 8 characters, invalid token, or expired token |
| `404` | The token's account no longer exists |
| `429` | `resetPassword` limit — 5 / 15 min per IP |

## `POST /api/auth/change-password`

Session required. `{ "currentPassword": "…", "newPassword": "…" }`.

| Status | When |
|---|---|
| `200` | Changed. Every session ends, this one included (`sessionVersion` is bumped); the UI signs out and asks the user to sign in again |
| `400` | Missing or non-string fields, new password under 8 or over 128 characters, a GitHub-only account ("not available for OAuth accounts"), or a wrong current password |
| `401` | No session |
| `429` | `changePassword` limit, 5 / 15 min per IP + user |

## `DELETE /api/auth/delete-account`

Session required. `{ "password": "…" }` in the body — required, and checked with bcrypt, for accounts that have a password (GitHub-only accounts send nothing). Cancels the Stripe subscription first (the account is kept if that fails), deletes the user's `{userId}/` files from R2 (best effort, logged on failure), then deletes the user; items, collections, accounts and sessions cascade. `200` with `{ success: true }`, `400` for a wrong or missing password, `401` without a session, `404` if the account is gone, `500` on failure.

## Related

- [Errors and rate limits](errors-and-rate-limits.md)
- [Users and auth tables](../schema/users-and-auth.md)
