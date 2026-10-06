# Security Guardrails

The boundaries no change may weaken. The reasoning behind them is in the [security model](../architecture/security-model.md).

1. **The user id comes from the session, only.** Actions use `getAuthedSession()`, route handlers and pages use `auth()`. No endpoint takes a user id from a body, query string or path — the download route compares the path to the session, it doesn't trust it.
2. **Every query is scoped.** A `lib/db` function that reads or writes user data filters by `userId`, or loads the row and checks `userId` before touching it. Something that belongs to another user is reported as not found.
3. **References from the client are checked too.** Any id or URL in the input that points at another row or object — collection ids, a `fileUrl` — must be verified to belong to the caller before it's stored or acted on. (Collection ids are filtered in `lib/db/items.ts`. A `fileUrl` must pass `isOwnedFileUrl(userId, url)` from `lib/r2.ts` — inside `R2_PUBLIC_URL/{userId}/` — before it is stored (`createItem`, `importData`), fetched (ZIP export) or deleted (`deleteItem`). Don't add another path that skips it.)
4. **Limits are enforced on the server.** Plan limits (`lib/usage.ts`, `requirePro`, the `isPro` checks) and rate limits run in actions and route handlers. The UI may hide a button; it never is the check.
5. **Validate every input.** Zod `safeParse` in actions; explicit checks in route handlers; extension + MIME + size + file signature for uploads (`validateFileContent`); size caps on every item field (`lib/validation.ts`) and 128 characters on passwords; `safeUrlSchema` for any URL that gets rendered.
6. **Webhooks are verified.** `/api/webhooks/stripe` reads the raw body and verifies `stripe-signature` before acting. Never parse the body first or skip verification "for testing".
7. **Secrets stay on the server.** Keys are environment variables, never committed (`.env*` is git-ignored except `.env.example`, which holds only placeholders). Nothing secret gets a `NEXT_PUBLIC_` prefix.
8. **Errors don't leak.** Log the real error server-side; return a generic message. No stack traces, provider responses or keys in a response.
9. **Auth responses don't reveal accounts.** Forgot-password and resend-verification answer identically whether or not the email exists; a bad email and a bad password fail the same way.
10. **Passwords are bcrypt-hashed (cost 12)**, minimum 8 characters, and never logged or returned.
11. **Tokens are random, hashed, expiring and single-use** — `crypto.randomBytes(32)`; only the SHA-256 is stored (`lib/tokens.ts`); consumed with a delete that must remove exactly one row, so a link can't be used twice. Check a password before spending its link, so a typo doesn't burn it.
12. **Rate limits stay on the public auth endpoints, uploads, AI and the token API.** Adding a new public or expensive endpoint means adding a limit to it.
13. **API tokens are hashed and Pro-checked per request.** Store only the SHA-256 of a `bb_` token and show the token once. Every `/api/v1` handler starts with `authenticateApiRequest`, which re-reads the plan. A new `/api/v1` route that skips it is an unauthenticated endpoint.
14. **Redirect targets are checked.** A `callbackUrl` (or any URL the client says to go to after an action) goes through `safeCallbackPath` so only a path on this site is followed; an absolute or protocol-relative URL is an open redirect.
