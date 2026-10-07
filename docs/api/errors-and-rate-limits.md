# Errors and Rate Limits

## Route handlers

Errors are JSON with a single message and a status code:

```json
{ "error": "Invalid plan. Must be \"monthly\" or \"yearly\"" }
```

| Status | Meaning |
|---|---|
| `400` | Invalid input, or an invalid / expired token |
| `401` | No session, or for `/api/v1`, no valid token. (The Stripe webhook never returns `401`: it uses `400` for a bad signature) |
| `403` | Signed in, but not allowed: not Pro, not the owner of a file path, the public demo account on an account-level action, a `/api/v1` token without the permission an endpoint needs, or a request a browser says came from another site (`Cross-site request blocked`) |
| `404` | Not found — including rows that belong to someone else |
| `429` | Rate limited, with `Retry-After` |
| `502` | `/api/v1/ai/tags` and `/api/v1/ai/description` only: the AI provider failed or answered in an unexpected format |
| `500` | Unexpected error, logged server-side; the message is generic |

## Server actions

Actions never throw to the client. They return:

```ts
{ success: true, data }                                        // ok
{ success: false, error: 'Unauthorized' }                      // no session
{ success: false, error: 'Validation failed', fieldErrors }    // Zod failure, per field
{ success: false, error: 'Item not found or access denied' }   // missing or not owned
{ success: false, error: 'You have reached the free tier limit of 50 items. Upgrade to Pro for unlimited items.' }
```

`error` is written to be shown as-is in a toast.

## Rate limits

`src/lib/rate-limit.ts` — Upstash sliding windows. The Redis key is `ratelimit:{name}:{ip}` or `ratelimit:{name}:{ip}:{identifier}`.

| Name | Limit | Keyed by | Applied in |
|---|---|---|---|
| `login` | 5 / 15 min | IP + email | `authorizeCredentials()` in `src/lib/credentials.ts`, called by `authorize()` in `src/auth.ts` (every credentials sign-in; lowercased email) |
| `register` | 3 / hour | IP | `POST /api/auth/register` |
| `registerEmail` | 3 / hour | the address (any IP) | `POST /api/auth/register`: at most three mails an hour to one inbox |
| `forgotPassword` | 3 / hour | IP | `POST /api/auth/forgot-password` |
| `forgotPasswordEmail` | 3 / hour | the address (any IP) | `POST /api/auth/forgot-password` |
| `resetPassword` | 5 / 15 min | IP | `POST /api/auth/reset-password` |
| `resendVerification` | 3 / 15 min | IP + email | `POST /api/auth/resend-verification` |
| `resendVerificationEmail` | 3 / hour | the address (any IP) | `POST /api/auth/resend-verification` |
| `changePassword` | 5 / 15 min | IP + user id | `POST /api/auth/change-password` |
| `sessions` | 5 / hour | IP + user id | The `signOutEverywhere` action |
| `import` | 5 / hour | IP + user id | the `importData` action |
| `importPreview` | 20 / hour | IP + user id | the `previewImport` action |
| `export` | 10 / hour | IP + user id | `GET /api/export` (JSON and ZIP) |
| `checkout` | 10 / hour | IP + user id | `POST /api/stripe/checkout` |
| `portal` | 20 / hour | IP + user id | `POST /api/stripe/portal` |
| `create` | 120 / minute | IP + user id | the `createItem` and `createCollection` actions |
| `upload` | 10 / hour | IP + user id | `POST /api/upload` |
| `ai` | 20 / hour | IP + user id | All four AI actions, `POST /api/v1/ai/tags` and `/ai/description` |
| `api` | 60 / minute | IP + user id | Every `/api/v1` request, after the token check |

The IP is taken from `x-vercel-forwarded-for`, then `x-real-ip` (both set by Vercel, which overwrites anything the client sends), then the **last** entry of `x-forwarded-for` (the address the nearest proxy saw), then `127.0.0.1`. The first entry of `x-forwarded-for` is what the client claims, so it is never used. A limit keyed by the address alone (`…Email`) ignores the IP.

Route handlers answer `429` through `rateLimitResponse(retryAfter)`:

```json
{ "error": "Too many attempts. Please try again in 12 minutes." }
```

with `Retry-After` in seconds. AI actions return "Too many AI requests. Please try again in …" as their `error`.

Not rate limited: the NextAuth endpoints themselves (the credentials limit is enforced inside `authorize()`) and the server actions that change one existing thing (favorite, pin, rename, delete, collection membership). Server actions answer an over-limit call with an `error` such as "Too many imports. Please try again in 3 minutes."

### Failure mode

Without Redis, production degrades instead of switching limits off; development fails open. A Redis *error* fails closed for the credential limits:

- With `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` unset, still holding the `YOUR_…` placeholders from `.env.example`, or invalid (a URL without `https://`, say): **in production** the limits still apply, counted per server instance in memory (`memoryLimit` in `lib/rate-limit.ts`, a sliding-window log capped at 10,000 keys). That is weaker than Redis, because every serverless instance counts separately and a cold start forgets, so an attacker gets some multiple of a limit rather than unlimited tries. One warning is logged per process. **In development** (and tests) every check passes, so local work needs no Redis.
- If Redis errors at runtime, the error is logged. The credential limits (`login`, `register`, `forgotPassword`, `resetPassword`, `resendVerification`, their per-address versions, `changePassword`) then **refuse** the request with a 60-second `Retry-After`, so an outage can't switch off brute-force protection; `ai`, `upload` and `api` let the request through.

`src/lib/rate-limit.test.ts` covers the unset, placeholder, invalid-URL and Redis-error cases, the production in-memory fallback, per-address keys and the client-IP rules. See [ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md).

### Adding a limit

1. Add an entry to `rateLimitConfigs` with a limit, a window and a `ratelimit:` prefix. If it guards a credential or an email, add it to `FAIL_CLOSED` too.
2. Call `checkRateLimit('<name>', optionalIdentifier)` at the top of the handler or action.
3. When `!result.success`, return `rateLimitResponse(result.retryAfter)` from a route handler, or an `ActionResult` error using `formatRetryTime(result.retryAfter)` from an action.
