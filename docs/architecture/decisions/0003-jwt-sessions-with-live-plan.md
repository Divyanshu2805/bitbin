# 0003. JWT sessions, with the plan re-read on every evaluation

**Status:** Accepted

## Context

`proxy.ts` runs where the Prisma client and bcrypt aren't available, so it can't look up a database session. The app also needs the user's plan (`isPro`) on almost every request, and that plan changes from outside the request cycle — a Stripe webhook can upgrade or downgrade a user who is signed in. A plan copied into a token at sign-in would stay wrong until the user signed out.

## Decision

NextAuth uses **JWT sessions** (`session: { strategy: 'jwt' }`) with the Prisma adapter for users and OAuth accounts. The config is split: `auth.config.ts` holds only what the proxy needs; `auth.ts` adds the adapter, bcrypt and callbacks.

The `jwt` callback puts the user id on the token at sign-in and, **every time it runs, re-reads `users.isPro`** from the database. The `session` callback exposes `id` and `isPro` on `session.user`.

## Consequences

- A webhook's change to `isPro` is visible on the user's next request, with no sign-out and no cache invalidation.
- The rest of the app checks `session.user.isPro` and never queries the plan itself (the upload route re-reads it anyway, as a second check).
- Every session evaluation costs one small primary-key query — including the ones `proxy.ts` triggers.
- JWTs can't be revoked server-side. A password change, password reset or account deletion leaves already-issued tokens valid until they expire. See [known gaps](../../known-gaps/not-yet-built.md#security).
- The `sessions` table exists for the adapter but stays empty.
