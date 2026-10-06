# 0008. The public demo account is a locked sandbox, reset daily

**Status:** Accepted

## Context

A recruiter or admissions reviewer should be able to try BitBin in seconds, without registering and waiting for a verification email. The simplest way is a shared account whose login is published (`demo@bitbin.dev`, in the README and the seed). But a published password means any visitor can do anything the account can: change its password and lock everyone else out, delete it, start a subscription on it, or fill it with junk.

## Decision

The demo account stays a normal user row, so the app needs no special mode, but everything that changes **the account itself** refuses it:

- `lib/demo.ts` is the single check (`isDemoEmail`, `demoBlockedMessage`).
- Change password, delete account, update name, start a checkout and password reset by email each return a `403` (or an `ActionResult` error) for it.
- Ordinary use (creating, editing and deleting items and collections) stays open: that is the point of a demo.
- A daily cron (`vercel.json` → `GET /api/cron/reset-demo`, 21:00 UTC) restores the library from `prisma/demo-content.ts` inside one transaction, and resets the name, plan and Stripe ids as a safety net. The route needs `Authorization: Bearer $CRON_SECRET` and refuses everyone when the secret is unset.

## Consequences

- Visitors get a populated, working account instantly, and cannot lock others out or run up a bill.
- Anything saved in the demo account is public and disappears within a day. The Privacy Policy and README say so.
- A new feature that changes account-level state (email change, account linking, API tokens for the demo) must add the same `isDemoEmail` check. It's listed in `CLAUDE.md` and the [cross-cutting concerns](../cross-cutting-concerns.md#the-demo-account) so it isn't forgotten.
- The cron only exists on Vercel. Self-hosters who keep the demo account have to schedule the call themselves, or accept that it drifts.
- The demo account is a Free account. Pro-only features (files, AI, the token API) can't be tried on it; the README describes them instead.
