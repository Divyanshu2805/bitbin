# Security Model

Who can see and change what, and where each boundary is enforced. The rules a change must not weaken are summarised in the [security guardrails](../practices/security-guardrails.md).

## Tenancy

BitBin is single-user per account: every item, collection and custom item type belongs to exactly one user, and nothing is shared between accounts. Isolation is enforced in the application, not the database — there is no row-level security.

- Every `lib/db` function takes the user id as an argument and filters or checks ownership with it (`findFirst({ where: { id, userId } })`, or a `findUnique` followed by an `existing.userId !== userId` check).
- That user id always comes from the session (`getAuthedSession()` in actions, `auth()` in route handlers and pages), or for `/api/v1`, from the API token, never from a request body, query string or path.
- A row that exists but belongs to someone else is reported exactly like a missing one — "Item not found or access denied", `404 Item not found` — so ids can't be probed.

Tags are the exception: tag names are globally unique rows shared by everyone, connected to items with `connectOrCreate`. They carry no data beyond the name.

## Sessions

NextAuth v5 with the Prisma adapter and **JWT sessions** (`session: { strategy: 'jwt', maxAge: 14 days, updateAge: 1 day }`, constants in `lib/constants/session.ts`, shared by `auth.ts` and the proxy's `auth.config.ts`):

- The session is a signed, encrypted cookie keyed by `AUTH_SECRET`. The `sessions` table exists for the adapter but isn't used for JWT sessions.
- The `jwt` callback puts the user id on the token at sign-in, and **re-reads `users.isPro` and `users.sessionVersion` from the database every time the token is evaluated**, so a Stripe webhook changes a signed-in user's plan without a sign-out.
- **Sessions can be revoked.** The token carries the `sessionVersion` it was issued with. Changing or resetting a password, the **Sign out everywhere** button (`signOutEverywhere`) all increment the column, so every older token fails the comparison and the `jwt` callback returns `null`, which ends the session. A deleted account ends its sessions the same way (the row is gone). Because sessions are stateless there is no per-device list to show, only this switch. A session lasts at most 14 days, re-issued at most once a day while it is used.

## Authentication

| Method | Where | Protections |
|---|---|---|
| Email + password | Credentials provider in `src/auth.ts`, logic in `src/lib/credentials.ts` | bcrypt (cost 12), length 8 to 128, email must be verified (unless `SKIP_EMAIL_VERIFICATION`), `login` rate limit (5 per 15 minutes per IP and email) enforced inside `authorize()`, so it can't be bypassed by calling the endpoint directly |
| GitHub | GitHub provider + `signInWithGitHub` server action | GitHub sign-in is refused for an email that already has a password account (`OAuthAccountNotLinked`), and the account row the adapter created is removed |
| API token | `/api/v1/*`, `src/lib/api-auth.ts` | `bb_` + 32 random bytes, stored as a SHA-256 hash, shown once; `Bearer` header only (cookies ignored); expires after 30, 90 or 365 days (no "never"); carries **scopes** (`collections:read`, `items:write`, `ai`) checked per request, so a token can be limited to what its client needs; owner's `isPro` re-read on every request; `api` rate limit; revocable in Settings, at most 10 per user |
| Password reset | `/api/auth/forgot-password`, `/api/auth/reset-password` | 32-byte random token, stored only as its SHA-256 hash, 1-hour expiry, single use (consumed with a delete that must remove exactly one row, so a race can't use a link twice); the forgot endpoint answers identically whether or not the email exists, and a mistyped new password doesn't burn the link |
| Email verification | `/api/auth/verify` | 32-byte random token, stored only as its SHA-256 hash, 24-hour expiry, single use |

## What protects each route

| Surface | Check |
|---|---|
| `/dashboard/*` | `src/proxy.ts` redirects to sign-in without a session, and the page calls `auth()` too |
| Every other app page | The page calls `auth()` and redirects to `/sign-in` itself — the proxy only matches `/dashboard` |
| Server actions | `getAuthedSession()` first; returns `Unauthorized` without a session |
| `/api/items/[id]`, `/api/upload`, `/api/download/*`, `/api/export`, `/api/stripe/*`, `/api/auth/change-password`, `/api/auth/delete-account` | `auth()` → `401` without a session |
| `/api/download/{path}` | The path must start with the caller's user id → `403` otherwise |
| `/api/extension/download` | `auth()` → `401`; session `isPro` → `403` |
| `/api/v1/*` | `authenticateApiRequest`: valid token → `401` otherwise; owner on Pro → `403` otherwise; `api` rate limit → `429` |
| `/api/webhooks/stripe` | No session — the `stripe-signature` header is verified against `STRIPE_WEBHOOK_SECRET` → `400` otherwise |
| `/api/cron/reset-demo` | No session — `Authorization: Bearer $CRON_SECRET`, compared in constant time; refuses everyone when `CRON_SECRET` is unset |
| Registration, password reset, resend verification | Public, rate limited per IP (and per email where relevant) |
| After sign-in | The `callbackUrl` is reduced to a path on this site (`safeCallbackPath`), so the sign-in page can't redirect off-site |
| Change password, delete account, checkout, the portal, upload | Also `rejectCrossSite` (`lib/same-origin.ts`): `Sec-Fetch-Site: cross-site` / `same-site` or a foreign `Origin` is a `403`, a second line of defence behind the `SameSite=Lax` cookie (which doesn't cover a sibling subdomain). Next's server actions check the origin themselves |

## Plan enforcement

Free / Pro limits are enforced on the server; the UI only mirrors them.

| Rule | Enforced in |
|---|---|
| 50 items, 3 collections on Free | `lib/usage.ts` (`canCreateItem`, `canCreateCollection`) for a quick message, then re-checked inside a transaction after locking the user's row (`lockUserForLimit`, `lib/limit-error.ts`) by `createItem`, `createCollection` and `importData`, so concurrent requests can't overshoot the cap |
| File and image items are Pro | `createItem` (session `isPro`), `/api/upload` (re-reads `isPro` from the database) |
| AI is Pro | `requirePro` in every action in `src/actions/ai.ts` |
| API tokens and `/api/v1` are Pro | `createApiToken` (session `isPro`); `authenticateApiRequest` (re-reads `isPro` from the database) |
| ZIP export is Pro | `/api/export` → `403` |

## The public demo account

`demo@bitbin.dev` has a published password so visitors can try the app, which makes it a shared sandbox. Everything that would change the account itself is refused with `isDemoEmail` (`lib/demo.ts`): changing the password or name, deleting it, checkout (it has no Stripe customer, so the portal has nothing to open), "Sign out everywhere", and password reset by email. Because whatever a visitor saves is shown to the next one, it also can't save links (no phishing or spam URL for the next visitor), save items over 5,000 characters, or import. A daily cron restores its library, so anything a visitor saves there disappears. Never put anything private in it.

## Input and abuse limits

- Every action validates with Zod `safeParse`; every route handler checks its input explicitly. Size caps apply to every item field, passwords (128 characters) and imports (5,000 entries) — `lib/validation.ts`.
- Any URL that will be rendered as a link goes through `safeUrlSchema` (only `http(s)`); imports apply the same rule.
- Uploads are checked for extension, MIME type, size and file signature (`validateFileContent`), and an SVG with script is rejected. Photos are then decoded and written out again (`lib/image-sanitize.ts`): metadata such as GPS location is stripped, a file that only starts like an image is refused, and images over 50 megapixels are refused. When `VIRUSTOTAL_API_KEY` is set, the file's hash is checked against known malware (nothing but the hash is sent).
- Email-sending endpoints (register, forgot password, resend verification) are limited per IP **and** per address, so rotating IPs can't flood one inbox, and optionally need a Cloudflare Turnstile check (`lib/turnstile.ts`, fails closed once configured).
- Expensive or abusable endpoints are rate limited: the public auth endpoints, import, export, checkout, the portal, item and collection creation, uploads, AI and the token API — see [errors and rate limits](../api/errors-and-rate-limits.md#rate-limits).
- Responses carry `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, `Permissions-Policy`, HSTS and a **Content Security Policy** (`src/lib/csp.ts`, applied from `next.config.ts`): everything may load only from this site (plus GitHub's avatar host for profile pictures, and Cloudflare's challenge when Turnstile is on), `connect-src 'self'` so injected code can't send data elsewhere, no `eval`, no plugins, `frame-ancestors 'self'`. The code editor is served from `/monaco/` on this site rather than a CDN, so no third-party script runs in the page. File downloads keep a minimal policy so previews work. See the trade-off below and [ADR 0010](decisions/0010-content-security-policy-without-script-nonces.md).

### What the policy does not do

`script-src` still allows `'unsafe-inline'`, so an injected inline script would run. A strict policy needs a per-request nonce on every inline script, and a nonce forces every page to render dynamically, which gives up the static homepage, auth and legal pages. The pages that show other people's text (items, collections) render it through React, which escapes it, and markdown is rendered without raw HTML, so there is no known injection to defend against; the policy limits what an injection could do, it isn't the only protection.

## Files

- Uploads are stored under `{userId}/{timestamp}-{sanitised name}` in R2.
- **The bucket is private.** Every read goes through `/api/download` (and the ZIP export), which require a session and a key inside the caller's own `{userId}/` folder, then read the object with the server's R2 credentials. Previews are served with the type chosen from the file extension, `nosniff` and a sandboxing CSP, so an uploaded SVG, XML or Markdown file can't run script on the app's origin. Public access on the bucket must stay **off**; if it's turned on, objects become readable by anyone with their URL again.
- A `fileUrl` is accepted from the client only if it points into the caller's own folder (`isOwnedFileUrl`), and only then is it stored, read or deleted.
- What is **not** done: files other than photos are not scanned for malware beyond the optional known-hash check, and a PDF is stored as uploaded.

## Secrets

- All secrets are environment variables; `.env*` is git-ignored except `.env.example`, which holds only `YOUR_…` placeholders.
- Stripe, R2, OpenAI and Resend keys are used only in server code. The only `NEXT_PUBLIC_` variable is the app URL.
- AI, Stripe and storage errors are logged server-side; the client receives a generic message, never a stack trace or key.
- Error reports to Sentry have cookies, auth headers, request bodies, query strings, IPs and user data removed before they leave the server.
- Destructive scripts (`db:seed`, `db:cleanup`) refuse to run against a database that isn't marked safe, so a local command can't wipe production.
- Dependencies are watched by GitHub secret scanning with push protection, and a production `npm audit` in CI that fails on high or critical advisories.

## Related

- [Authentication flow](flows/authentication.md)
- [Security guardrails](../practices/security-guardrails.md)
