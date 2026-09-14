# 0005. Rate limits fail open

**Status:** Accepted

## Context

Sign-in, registration, password reset, uploads and the AI helpers need rate limits — against brute force, email abuse, storage abuse and runaway OpenAI cost. Serverless functions share no memory, so the counters need an external store; BitBin uses Upstash Redis over REST. That makes Redis a dependency of the sign-in path, and a local setup shouldn't need an Upstash account to work.

## Decision

`lib/rate-limit.ts` defines one sliding-window limiter per action and keys each by client IP plus an optional identifier. It **fails open**: if the Upstash variables are unset, still `.env.example` placeholders, or invalid, it logs a warning or error and every check passes; if Redis errors at runtime, it logs the error and allows the request.

## Consequences

- An Upstash outage or misconfiguration never locks users out of their accounts.
- Local development works with no Redis at all.
- The same outage, or a deploy missing the variables, silently removes every limit — including the brute-force protection on sign-in. Production should alert on the `Rate limit check failed` log line.
- Limits keyed by IP are only as good as the `x-forwarded-for` header, which Vercel sets.
