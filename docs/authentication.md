# Authentication

NextAuth v5 with the Prisma adapter and **JWT sessions**.

| File | Role |
| --- | --- |
| `src/auth.config.ts` | Edge-safe config (used by `src/proxy.ts`) |
| `src/auth.ts` | Full config: GitHub + Credentials providers, callbacks that put `id` and `isPro` on the token/session |
| `src/types/next-auth.d.ts` | Session/JWT type augmentation |
| `src/actions/auth.ts` | `signInWithGitHub` server action |

## Providers

### Email + password

1. `POST /api/auth/register` validates input, hashes the password with bcrypt,
   creates the user and emails a verification link (Resend).
2. `GET /api/auth/verify?token=…` marks `emailVerified` and deletes the token.
3. Sign-in uses `signIn("credentials", { redirect: false })` from the client.
   `authorize()` rejects unverified users with `EmailNotVerified`, unless
   `SKIP_EMAIL_VERIFICATION="true"`.
4. `POST /api/auth/resend-verification` sends a fresh link.

Before calling `signIn`, the form hits `POST /api/auth/check-login-limit` so
brute-force attempts are rate limited per IP + email (see
[rate-limiting.md](rate-limiting.md)).

### GitHub

Sign-in runs through a **server action** (`signInWithGitHub`) that calls
`signIn("github", { redirectTo: "/dashboard" })` on the server. An earlier
client-side `signIn` needed two clicks in production because the redirect
raced the session cookie. Doing it on the server fixes that.

If a GitHub email already belongs to a password account, NextAuth returns
`OAuthAccountNotLinked` and the sign-in form explains what happened.

**Issuer.** GitHub adds `iss=https://github.com/login/oauth` to its OAuth
callback (RFC 9207). Auth.js validates that value against the provider's
`issuer`, and for providers without one it falls back to
`https://authjs.dev`, so every GitHub sign-in failed with
`unexpected "iss" (issuer) response parameter value`. Both `auth.ts` and
`auth.config.ts` therefore configure the provider as:

```ts
GitHub({ issuer: 'https://github.com/login/oauth' })
```

GitHub defines its own token and user-info endpoints, so setting `issuer`
doesn't trigger OIDC discovery; it only fixes the comparison.

## Password reset

1. `POST /api/auth/forgot-password` always returns 200, so it never reveals
   whether an email exists. If the user exists, it emails a reset link.
2. `/reset-password?token=…` renders the form.
3. `POST /api/auth/reset-password` verifies the token (1 hour expiry) and
   stores the new bcrypt hash.

Tokens are generated in `src/lib/tokens.ts` (32 random bytes, hex) and stored
in `verification_tokens`. Any older token for the same email is removed first.

## Account management

| Endpoint | What it does |
| --- | --- |
| `POST /api/auth/change-password` | Requires the current password (credential users only) |
| `POST /api/auth/delete-account` | Deletes the user; cascades remove items, collections, sessions |

## Protecting pages

- `src/proxy.ts` guards `/dashboard/*` at the edge.
- Every other app page calls `auth()` and `redirect('/sign-in')` when there is
  no session.
- Server actions use `getAuthedSession()` and never trust a user id from the
  client.

## Auth UI

The five auth pages share `src/app/(auth)/layout.tsx`, a split screen with a
brand panel on the left (animated terminal showcase) and the form on the
right. On mobile only the form column is shown.
