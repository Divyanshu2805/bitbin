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
| `403` | Signed in, but not allowed: not Pro, or not the owner of a file path |
| `404` | Not found — including rows that belong to someone else |
| `429` | Rate limited, with `Retry-After` |
| `502` | `/api/v1/ai/tags` only: the AI provider failed or answered in an unexpected format |
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
| `login` | 5 / 15 min | IP + email | `POST /api/auth/check-login-limit` |
| `register` | 3 / hour | IP | `POST /api/auth/register` |
| `forgotPassword` | 3 / hour | IP | `POST /api/auth/forgot-password` |
| `resetPassword` | 5 / 15 min | IP | `POST /api/auth/reset-password` |
| `resendVerification` | 3 / 15 min | IP + email | `POST /api/auth/resend-verification` |
| `upload` | 10 / hour | IP + user id | `POST /api/upload` |
| `ai` | 20 / hour | IP + user id | All four AI actions, `POST /api/v1/ai/tags` |
| `api` | 60 / minute | IP + user id | Every `/api/v1` request, after the token check |

The IP is the first entry of `x-forwarded-for`, then `x-real-ip`, then `127.0.0.1`.

Route handlers answer `429` through `rateLimitResponse(retryAfter)`:

```json
{ "error": "Too many attempts. Please try again in 12 minutes." }
```

with `Retry-After` in seconds. AI actions return "Too many AI requests. Please try again in …" as their `error`.

Not rate limited: the NextAuth endpoints themselves (credentials sign-in relies on the form calling `check-login-limit` first), change-password, export, checkout and portal, and every server action other than the AI ones.

### Failure mode

Rate limiting **fails open**:

- With `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` unset, or still holding the `YOUR_…` placeholders from `.env.example`, every check logs a warning and passes.
- If the values are set but invalid (a URL without `https://`, say), the Redis client can't be created; the error is logged and every check passes. Before this was handled, a leftover placeholder made registration crash with a `500`.
- If Redis errors at runtime, the error is logged and the request is allowed.

`src/lib/rate-limit.test.ts` covers the unset, placeholder and invalid-URL cases. See [ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md).

### Adding a limit

1. Add an entry to `rateLimitConfigs` with a limiter and a `ratelimit:` prefix.
2. Call `checkRateLimit('<name>', optionalIdentifier)` at the top of the handler or action.
3. When `!result.success`, return `rateLimitResponse(result.retryAfter)` from a route handler, or an `ActionResult` error using `formatRetryTime(result.retryAfter)` from an action.
