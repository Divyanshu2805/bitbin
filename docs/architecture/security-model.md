# Security Model

Who can see and change what, and where each boundary is enforced. The rules a change must not weaken are summarised in the [security guardrails](../README.md).

## Tenancy

BitBin is single-user per account: every item, collection and custom item type belongs to exactly one user, and nothing is shared between accounts. Isolation is enforced in the application, not the database — there is no row-level security.

- Every `lib/db` function takes the user id as an argument and filters or checks ownership with it (`findFirst({ where: { id, userId } })`, or a `findUnique` followed by an `existing.userId !== userId` check).
- That user id always comes from the session (`getAuthedSession()` in actions, `auth()` in route handlers and pages), never from a request body, query string or path.
- A row that exists but belongs to someone else is reported exactly like a missing one — "Item not found or access denied", `404 Item not found` — so ids can't be probed.

Tags are the exception: tag names are globally unique rows shared by everyone, connected to items with `connectOrCreate`. They carry no data beyond the name.

## Sessions

NextAuth v5 with the Prisma adapter and **JWT sessions** (`session: { strategy: 'jwt' }`):

- The session is a signed, encrypted cookie keyed by `AUTH_SECRET`. The `sessions` table exists for the adapter but isn't used for JWT sessions.
- The `jwt` callback puts the user id on the token at sign-in, and **re-reads `users.isPro` from the database every time the token is evaluated**, so a Stripe webhook changes a signed-in user's plan without a sign-out.
- There is no server-side session revocation. Deleting an account, resetting a password or changing a password doesn't invalidate JWTs already issued — see [known gaps](../known-gaps/not-yet-built.md).

## Authentication

| Method | Where | Protections |
|---|---|---|
| Email + password | Credentials provider in `src/auth.ts` | bcrypt (cost 12), minimum length 8, email must be verified (unless `SKIP_EMAIL_VERIFICATION`), `login` rate limit checked by the sign-in form first |
| GitHub | GitHub provider + `signInWithGitHub` server action | GitHub sign-in is refused for an email that already has a password account (`OAuthAccountNotLinked`), and the account row the adapter created is removed |
| Password reset | `/api/auth/forgot-password`, `/api/auth/reset-password` | 32-byte random token, 1-hour expiry, single use; the forgot endpoint answers identically whether or not the email exists |
| Email verification | `/api/auth/verify` | 32-byte random token, 24-hour expiry, single use |

## What protects each route

| Surface | Check |
|---|---|
| `/dashboard/*` | `src/proxy.ts` redirects to sign-in without a session, and the page calls `auth()` too |
| Every other app page | The page calls `auth()` and redirects to `/sign-in` itself — the proxy only matches `/dashboard` |
| Server actions | `getAuthedSession()` first; returns `Unauthorized` without a session |
| `/api/items/[id]`, `/api/upload`, `/api/download/*`, `/api/export`, `/api/stripe/*`, `/api/auth/change-password`, `/api/auth/delete-account` | `auth()` → `401` without a session |
| `/api/download/{path}` | The path must start with the caller's user id → `403` otherwise |
| `/api/webhooks/stripe` | No session — the `stripe-signature` header is verified against `STRIPE_WEBHOOK_SECRET` → `400` otherwise |
| Registration, password reset, resend verification | Public, rate limited per IP (and per email where relevant) |

## Plan enforcement

Free / Pro limits are enforced on the server; the UI only mirrors them.

| Rule | Enforced in |
|---|---|
| 50 items, 3 collections on Free | `lib/usage.ts` (`canCreateItem`, `canCreateCollection`), called by `createItem`, `createCollection`, and `importData` |
| File and image items are Pro | `createItem` (session `isPro`), `/api/upload` (re-reads `isPro` from the database) |
| AI is Pro | `requirePro` in every action in `src/actions/ai.ts` |
| ZIP export is Pro | `/api/export` → `403` |

## Files

- Uploads are stored under `{userId}/{timestamp}-{sanitised name}` in R2.
- **Images and files are readable by anyone with their URL** — the bucket is public, and image items render straight from `R2_PUBLIC_URL`. The `/api/download` proxy exists to set `Content-Disposition` and enforces the owner check, but it isn't the only way to read an object.
- Deleting an item deletes the R2 object named by its stored `fileUrl`. That URL is accepted from the client, and the key isn't checked against the caller's prefix — see [known gaps](../known-gaps/not-yet-built.md#security).

## Secrets

- All secrets are environment variables; `.env*` is git-ignored except `.env.example`, which holds only `YOUR_…` placeholders.
- Stripe, R2, OpenAI and Resend keys are used only in server code. The only `NEXT_PUBLIC_` variable is the app URL.
- AI, Stripe and storage errors are logged server-side; the client receives a generic message, never a stack trace or key.

## Related

- [Authentication flow](flows/authentication.md)
- [Security guardrails](../README.md)
- [`SECURITY.md`](../../SECURITY.md) — reporting a vulnerability.
