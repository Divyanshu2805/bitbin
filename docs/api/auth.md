# Auth Endpoints

Route handlers under `src/app/api/auth/`. Sign-in itself goes through NextAuth (`/api/auth/[...nextauth]`, from `handlers` in `src/auth.ts`); these cover everything around it. The end-to-end behaviour is in the [authentication flow](../architecture/flows/authentication.md).

## `POST /api/auth/register`

```json
{ "name": "Ada", "email": "ada@example.com", "password": "…", "confirmPassword": "…" }
```

| Status | When |
|---|---|
| `201` | Created. `message` says to check email, or "Account created successfully" when verification is skipped; `user` has `id`, `name`, `email` |
| `400` | Missing email or password, passwords don't match, password under 8 characters, or the email is already registered |
| `429` | `register` limit — 3 / hour per IP |
| `500` | Unexpected error |

## `GET /api/auth/verify?token=…`

| Status | When |
|---|---|
| `200` | Verified — or "Email already verified" |
| `400` | Missing, unknown or expired token (an expired token is deleted) |
| `404` | The token's email no longer has an account |
| `500` | Unexpected error |

## `POST /api/auth/resend-verification`

`{ "email": "…" }`. `400` without an email; `429` over the `resendVerification` limit (3 / 15 min per IP + email). Otherwise `200` — with the same message whether or not the account exists, or "Email is already verified" for a verified one.

## `POST /api/auth/check-login-limit`

`{ "email": "…" }`. Counts one attempt against the `login` limit (5 / 15 min per IP + email). `200` if allowed, `429` with `Retry-After` if not, `400` without an email. The sign-in form calls it before `signIn('credentials')`.

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
| `200` | Changed |
| `400` | Missing fields, new password under 8 characters, a GitHub-only account ("not available for OAuth accounts"), or a wrong current password |
| `401` | No session |

Not rate limited.

## `DELETE /api/auth/delete-account`

Session required. Deletes the user; items, collections, accounts and sessions cascade. `200` with `{ success: true }`, `401` without a session, `500` on failure. R2 files and an active Stripe subscription are left behind — see [known gaps](../known-gaps/not-yet-built.md).

## Related

- [Errors and rate limits](errors-and-rate-limits.md)
- [Users and auth tables](../schema/users-and-auth.md)
