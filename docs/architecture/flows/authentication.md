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
2. The handler checks the `register` rate limit (3 / hour per IP), requires matching passwords of 8 to 128 characters, hashes the password with bcrypt (cost 12) and creates the user. **The answer is the same for a new address and one that's taken** ("check your email"), so registration can't reveal who has an account:
   - a verified account, or one that signs in with GitHub, is left alone and no email is sent;
   - an *unverified* password account is claimed by whoever registers last: its password is replaced and a fresh verification email goes out, so a pre-registration squat can't hold someone else's address;
   - with `SKIP_EMAIL_VERIFICATION` set (development only) a duplicate gets an explicit `400` instead.
3. Unless `SKIP_EMAIL_VERIFICATION="true"`, it creates a verification token — 32 random bytes, hex, valid 24 hours, replacing any earlier one for that email — and emails a link to `/verify-email?token=…` through Resend, from `FROM_EMAIL`. Only the token's SHA-256 is stored; the raw value exists only in the email. With the flag set, `emailVerified` is filled in immediately instead.

   The user row is created before the email is sent. If the send fails — typically Resend's sandbox sender refusing a recipient other than the account owner — the handler deletes the new row again and answers `500`, so a retry starts clean instead of finding a half-created account.
4. `/verify-email` calls `GET /api/auth/verify?token=…`, which hashes the token, checks it and its expiry, sets `emailVerified`, and deletes the token with a delete that must remove exactly one row. A used or expired token can't be replayed, even by two simultaneous requests.
5. `POST /api/auth/resend-verification` issues a fresh token (3 / 15 min per IP + email). It answers the same way whether or not the account exists.

## Signing in with email and password

1. The sign-in form calls `signIn('credentials', { redirect: false })`.
2. `authorize()` in `src/auth.ts` first counts the attempt against the `login` limit (5 attempts / 15 minutes per IP + email; over it, it throws a `rate_limited` error and the form shows a try-again message), then loads the user by email, compares the password with bcrypt, and throws `EmailNotVerified` for an unverified account (unless verification is skipped). A missing user and a wrong password both return `null`, so the form can't tell them apart.

The limit is enforced in `authorize()`, so it applies to direct posts to the NextAuth callback too. It fails open when Upstash is unset, but closed for a Redis *error* ([ADR 0005](../decisions/0005-rate-limits-fail-open.md)).
3. On success the form follows `?callbackUrl=` (the proxy sets it when it sends someone to sign-in) through `safeCallbackPath`: a path on this site is kept, anything else falls back to `/dashboard`, so the page can't be used as an open redirect. The page slides in with `slideTo` (`lib/view-transition.ts`).

The public demo account (`demo@bitbin.dev`) signs in like any other, but can't change its own password, name or plan, or be deleted — see [the demo account](../cross-cutting-concerns.md#the-demo-account).

## GitHub

Sign-in runs through the `signInWithGitHub` **server action**, which calls `signIn('github', { redirectTo: '/sign-in?via=github' })` on the server. Back from GitHub, the sign-in form sees `via=github` and slides into `/dashboard` (`slideTo` in `lib/view-transition.ts`), holding the sign-in page on screen until the dashboard is ready so its loading screen isn't shown. An earlier client-side `signIn` needed two clicks in production, because the redirect raced the session cookie.

The `signIn` callback refuses GitHub for an email that already belongs to a **password account** (or when GitHub's email doesn't match the linked user's): it deletes the account row the adapter just created and redirects to `/sign-in?error=OAuthAccountNotLinked`, where the form explains what happened. BitBin doesn't link the two sign-in methods.

**Issuer.** GitHub adds `iss=https://github.com/login/oauth` to its OAuth callback (RFC 9207). Auth.js checks that against the provider's `issuer`, and for a provider without one it compares against `https://authjs.dev` — so every GitHub sign-in failed with `unexpected "iss" (issuer) response parameter value`. Both `auth.ts` and `auth.config.ts` therefore configure:

```ts
GitHub({ issuer: 'https://github.com/login/oauth' })
```

GitHub's provider defines its own token and user-info endpoints, so setting `issuer` doesn't trigger OIDC discovery; it only fixes the comparison.

A first GitHub sign-in creates the user and an `accounts` row through the Prisma adapter. GitHub users have no password, so they can't use change-password.

## The session

Sessions are JWTs (`session: { strategy: 'jwt' }`):

- `jwt` callback — on sign-in, copies the user id and `sessionVersion` onto the token. **On every evaluation it re-reads `users.isPro` and `users.sessionVersion`** from the database: a Stripe webhook reaches a signed-in user without a sign-out, and a token whose version no longer matches (after a password change or reset) or whose user is gone is ended.
- `session` callback — copies `id` and `isPro` onto `session.user`.

Code reads the caller with `getAuthedSession()` (server actions) or `auth()` (pages and route handlers). See [ADR 0003](../decisions/0003-jwt-sessions-with-live-plan.md).

## Password reset

1. `POST /api/auth/forgot-password` (3 / hour per IP) always returns 200 with the same message. If the account exists, it creates a reset token — only its SHA-256 is stored in `verification_tokens`, with the identifier `password-reset:{email}`, valid 1 hour — and emails a link to `/reset-password?token=…` holding the raw token.
2. `POST /api/auth/reset-password` (5 / 15 min per IP) checks the token is a reset token and unexpired, requires matching passwords of 8 to 128 characters, and **validates the new password before spending the link**, so a typo doesn't burn it. It then stores the new bcrypt hash, bumps `sessionVersion` (ending every existing session) and deletes the token in one step; two simultaneous requests can't both succeed.

## Account management

| Endpoint | Behaviour |
|---|---|
| `POST /api/auth/change-password` | Requires the current password (`400` if wrong, and for GitHub-only accounts); 5 attempts / 15 min per IP + user; new password 8 to 128 characters; stores a cost-12 hash and bumps `sessionVersion`, which **signs the user out everywhere, this session included**. `403` for the demo account |
| `DELETE /api/auth/delete-account` | A password account must send its password (`400` if wrong). Cancels the Stripe subscription first (if that fails the account stays, so nobody is billed for a deleted user), then removes the `{userId}/` files from R2 (best effort, logged on failure), then deletes the user row; items, collections, accounts and tokens cascade. `403` for the demo account |

## Protecting pages

- `src/proxy.ts` matches `/dashboard/:path*` and redirects a request without a session to sign-in.
- Every other app page calls `auth()` and `redirect('/sign-in')` itself.
- Server actions and route handlers check the session themselves and never accept a user id from the client.

## The auth pages

The five pages share `src/app/(auth)/layout.tsx`: a brand panel with an animated terminal showcase on the left, the form on the right. On mobile only the form column shows. The register form links to the [Terms](../../../src/app/terms/page.tsx) and [Privacy Policy](../../../src/app/privacy/page.tsx), which are public pages outside the `(auth)` group.

## Related

- [Security model](../security-model.md)
- [Auth endpoints](../../api/auth.md)
- [Users and auth tables](../../schema/users-and-auth.md)
