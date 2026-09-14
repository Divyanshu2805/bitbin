# Authentication Flow

How an account is created and verified, and how both sign-in methods end in the same JWT session.

| File | Role |
|---|---|
| `src/auth.ts` | Full NextAuth config: Prisma adapter, JWT sessions, GitHub + Credentials providers, the `signIn` / `jwt` / `session` callbacks |
| `src/auth.config.ts` | Edge-safe subset (providers only, no adapter, no bcrypt) used by `src/proxy.ts` |
| `src/app/api/auth/*` | Registration, verification, login rate limit, password reset, change password, delete account |
| `src/actions/auth.ts` | `signInWithGitHub` |
| `src/lib/tokens.ts`, `src/lib/email.ts` | Verification and reset tokens, and the emails that carry them |
| `src/types/next-auth.d.ts` | Adds `id` and `isPro` to the session and JWT types |

## Registration and verification

1. The register form posts `{ name, email, password, confirmPassword }` to `POST /api/auth/register`.
2. The handler checks the `register` rate limit (3 / hour per IP), requires matching passwords of at least 8 characters, rejects an email that's already registered, hashes the password with bcrypt (cost 12) and creates the user.
3. Unless `SKIP_EMAIL_VERIFICATION="true"`, it creates a verification token — 32 random bytes, hex, valid 24 hours, replacing any earlier one for that email — and emails a link to `/verify-email?token=…` through Resend, from `FROM_EMAIL`. With the flag set, `emailVerified` is filled in immediately instead.

   The user row is created **before** the email is sent. If the send fails — typically Resend's sandbox sender refusing a recipient other than the account owner — the response is a `500`, and a retry says the email is already registered. See [known gaps](../../known-gaps.md).
4. `/verify-email` calls `GET /api/auth/verify?token=…`, which checks the token and its expiry, sets `emailVerified`, and deletes the token. A used or expired token can't be replayed.
5. `POST /api/auth/resend-verification` issues a fresh token (3 / 15 min per IP + email). It answers the same way whether or not the account exists.

## Signing in with email and password

1. The sign-in form first calls `POST /api/auth/check-login-limit` with the email. The `login` limit is 5 attempts / 15 minutes per IP + email; over it, the form shows the `429` message and stops.
2. It then calls `signIn('credentials', { redirect: false })`.
3. `authorize()` in `src/auth.ts` loads the user by email, compares the password with bcrypt, and throws `EmailNotVerified` for an unverified account (unless verification is skipped). A missing user and a wrong password both return `null`, so the form can't tell them apart.

The rate-limit check is a separate request the form makes voluntarily — `authorize()` doesn't check it itself. See [known gaps](../../known-gaps.md).

## GitHub

Sign-in runs through the `signInWithGitHub` **server action**, which calls `signIn('github', { redirectTo: '/dashboard' })` on the server. An earlier client-side `signIn` needed two clicks in production, because the redirect raced the session cookie.

The `signIn` callback refuses GitHub for an email that already belongs to a **password account** (or when GitHub's email doesn't match the linked user's): it deletes the account row the adapter just created and redirects to `/sign-in?error=OAuthAccountNotLinked`, where the form explains what happened. BitBin doesn't link the two sign-in methods.

**Issuer.** GitHub adds `iss=https://github.com/login/oauth` to its OAuth callback (RFC 9207). Auth.js checks that against the provider's `issuer`, and for a provider without one it compares against `https://authjs.dev` — so every GitHub sign-in failed with `unexpected "iss" (issuer) response parameter value`. Both `auth.ts` and `auth.config.ts` therefore configure:

```ts
GitHub({ issuer: 'https://github.com/login/oauth' })
```

GitHub's provider defines its own token and user-info endpoints, so setting `issuer` doesn't trigger OIDC discovery; it only fixes the comparison.

A first GitHub sign-in creates the user and an `accounts` row through the Prisma adapter. GitHub users have no password, so they can't use change-password.

## The session

Sessions are JWTs (`session: { strategy: 'jwt' }`):

- `jwt` callback — on sign-in, copies the user id onto the token. **On every evaluation it re-reads `users.isPro`** from the database, so a Stripe webhook reaches a signed-in user without a sign-out.
- `session` callback — copies `id` and `isPro` onto `session.user`.

Code reads the caller with `getAuthedSession()` (server actions) or `auth()` (pages and route handlers). See [ADR 0003](../decisions/0003-jwt-sessions-with-live-plan.md).

## Password reset

1. `POST /api/auth/forgot-password` (3 / hour per IP) always returns 200 with the same message. If the account exists, it creates a reset token — stored in `verification_tokens` with the identifier `password-reset:{email}`, valid 1 hour — and emails a link to `/reset-password?token=…`.
2. `POST /api/auth/reset-password` (5 / 15 min per IP) checks the token is a reset token and unexpired, requires matching passwords of at least 8 characters, stores the new bcrypt hash, and deletes the token.

## Account management

| Endpoint | Behaviour |
|---|---|
| `POST /api/auth/change-password` | Requires the current password; `400` for GitHub-only accounts |
| `DELETE /api/auth/delete-account` | Deletes the user row. Items, collections, accounts and sessions cascade. R2 files and any Stripe subscription are **not** cleaned up — see [known gaps](../../known-gaps.md) |

## Protecting pages

- `src/proxy.ts` matches `/dashboard/:path*` and redirects a request without a session to sign-in.
- Every other app page calls `auth()` and `redirect('/sign-in')` itself.
- Server actions and route handlers check the session themselves and never accept a user id from the client.

## The auth pages

The five pages share `src/app/(auth)/layout.tsx`: a brand panel with an animated terminal showcase on the left, the form on the right. On mobile only the form column shows.

## Related

- [Security model](../security-model.md)
- [Auth endpoints](../README.md)
- [Users and auth tables](../../database.md)
