# 0005. Rate limits fail open (credential limits fail closed on errors)

**Status:** Accepted, amended

## Context

Sign-in, registration, password reset, uploads and the AI helpers need rate limits — against brute force, email abuse, storage abuse and runaway OpenAI cost. Serverless functions share no memory, so the counters need an external store; BitBin uses Upstash Redis over REST. That makes Redis a dependency of the sign-in path, and a local setup shouldn't need an Upstash account to work.

## Decision

`lib/rate-limit.ts` defines one sliding-window limiter per action and keys each by client IP plus an optional identifier. It **fails open**: if the Upstash variables are unset, still `.env.example` placeholders, or invalid, it logs a warning or error and every check passes. If Redis **errors at runtime**, the limits that guard credentials (`login`, `register`, `forgotPassword`, `resetPassword`, `resendVerification`, `changePassword`) **fail closed**: they refuse the request and ask the caller to retry in a minute. `ai`, `upload` and `api` log the error and allow the request.

## Consequences

- A missing or misconfigured Upstash setup never locks users out of their accounts. An Upstash *outage* does block sign-in, registration and password reset until Redis is back: the price of not letting a failure switch off brute-force protection.
- Local development works with no Redis at all.
- A deploy missing the variables still silently removes every limit, brute-force protection included; only runtime errors fail closed. Production should have the `UPSTASH_*` variables set and alert on the `Rate limit check failed` and `Upstash Redis not configured` log lines.
- Limits keyed by IP are only as good as the `x-forwarded-for` header, which Vercel sets.
