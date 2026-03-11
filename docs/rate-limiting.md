# Rate limiting

Implemented with `@upstash/ratelimit` sliding windows on Upstash Redis
(`src/lib/rate-limit.ts`).

## Limits

| Key | Window | Identifier | Used by |
| --- | --- | --- | --- |
| `login` | 5 / 15 min | IP + email | `POST /api/auth/check-login-limit` (called before credentials sign-in) |
| `register` | 3 / 1 h | IP | `POST /api/auth/register` |
| `forgotPassword` | 3 / 1 h | IP | `POST /api/auth/forgot-password` |
| `resetPassword` | 5 / 15 min | IP | `POST /api/auth/reset-password` |
| `resendVerification` | 3 / 15 min | IP + email | `POST /api/auth/resend-verification` |
| `upload` | 10 / 1 h | IP + user id | `POST /api/upload` |
| `ai` | 20 / 1 h | IP + user id | All AI server actions |

The Redis key is `{prefix}:{ip}` or `{prefix}:{ip}:{identifier}`. The IP
comes from `x-forwarded-for` (first entry), then `x-real-ip`, then
`127.0.0.1` in development.

## Responses

Route handlers return **429** through `rateLimitResponse(retryAfter)`:

```json
{ "error": "Too many attempts. Please try again in 12 minutes." }
```

with a `Retry-After` header in seconds. Server actions return the same message
in `ActionResult.error`.

## Failure mode

Rate limiting **fails open**:

- If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are not set, or
  still hold the `YOUR_...` placeholders from `.env.example`, a warning is
  logged on each check and every check passes.
- If the values are set but invalid (e.g. a URL without `https://`), the
  Redis client can't be created. The error is logged and every check passes.
  Before this was handled, a leftover placeholder made registration crash
  with a 500.
- If Redis errors at runtime, the error is logged and the request is allowed.

`src/lib/rate-limit.test.ts` covers the unset, placeholder and invalid-URL
cases.

A Redis outage therefore never locks users out of the app.

## Adding a limit

1. Add an entry to `rateLimitConfigs`
2. Call `checkRateLimit('<key>', optionalIdentifier)` at the top of the handler
3. Return `rateLimitResponse(result.retryAfter)` when `!result.success`
