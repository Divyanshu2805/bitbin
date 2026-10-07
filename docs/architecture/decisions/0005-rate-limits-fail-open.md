# 0005. Rate limits fail open (credential limits fail closed on errors)

**Status:** Accepted, amended

## Context

Sign-in, registration, password reset, uploads and the AI helpers need rate limits — against brute force, email abuse, storage abuse and runaway OpenAI cost. Serverless functions share no memory, so the counters need an external store; BitBin uses Upstash Redis over REST. That makes Redis a dependency of the sign-in path, and a local setup shouldn't need an Upstash account to work.

## Decision

`lib/rate-limit.ts` defines one sliding-window limiter per action and keys each by client IP plus an optional identifier. If the Upstash variables are unset, still `.env.example` placeholders, or invalid, **development fails open** (every check passes) and **production falls back to a per-instance in-memory sliding window** (`memoryLimit`), so a misconfigured deploy is degraded rather than wide open. If Redis **errors at runtime**, the limits that guard credentials (`login`, `register`, `forgotPassword`, `resetPassword`, `resendVerification`, `changePassword`) **fail closed**: they refuse the request and ask the caller to retry in a minute. `ai`, `upload` and `api` log the error and allow the request.

## Consequences

- A missing or misconfigured Upstash setup never locks users out of their accounts. An Upstash *outage* does block sign-in, registration and password reset until Redis is back: the price of not letting a failure switch off brute-force protection.
- Local development works with no Redis at all.
- A deploy missing the variables keeps the in-memory fallback, which is weaker (each serverless instance counts separately and a cold start forgets, so an attacker gets a multiple of a limit, not unlimited tries) and logs one warning per process. Production should still have the `UPSTASH_*` variables set.
- Limits keyed by IP use `x-vercel-forwarded-for` / `x-real-ip` (set by Vercel, which overwrites client values), then the *last* `x-forwarded-for` entry; the first entry is client-controlled and is not used. Limits that guard an inbox are also keyed by the address alone.

*Amended 2026-10-07: the in-memory fallback, the per-address limits and the client-IP rules.*
