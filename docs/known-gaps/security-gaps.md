# Security Gaps

Every open security and data-integrity gap in one place: what can go wrong, how to fix it, and where it's already recorded. The entries elsewhere stay the source of detail; this page is the checklist to work through. Severity follows [Not yet built](not-yet-built.md): **High** can cause failures or security exposure, **Medium** can leave a user or data in the wrong state, **Low** is hardening.

## Summary

| # | Gap | Severity | Recorded in |
|---|---|---|---|
| 1 | ~~Deleting an item can delete someone else's file~~ (fixed) | High | [Not yet built #1](not-yet-built.md#security) |
| 2 | Open dependency advisories | High | [Not yet built #2](not-yet-built.md#security) |
| 3 | ~~Credentials sign-in isn't rate limited on the server~~ (fixed) | Medium | [Not yet built #4](not-yet-built.md#security) |
| 4 | ~~Rate limits fail open, including on sign-in~~ (fixed for credentials; unset config still fails open) | Medium | [ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md), [Constraints](constraints-and-trade-offs.md#operations) |
| 5 | ~~Sessions can't be revoked~~ (fixed) | Medium | [Not yet built #6](not-yet-built.md#security), [Constraints](constraints-and-trade-offs.md#sessions-and-plans) |
| 6 | ~~Stripe webhooks aren't idempotent or ordered~~ (fixed) | Medium | [Constraints](constraints-and-trade-offs.md#billing) |
| 7 | ~~Deleting an account leaves its files and subscription~~ (fixed) | Medium | [Not yet built #10](not-yet-built.md#accounts-and-billing) |
| 8 | Files are public to anyone with the URL | Medium | [ADR 0004](../architecture/decisions/0004-files-in-r2-behind-a-download-proxy.md), [Constraints](constraints-and-trade-offs.md#storage) |
| 9 | API tokens never expire | Low | [ADR 0007](../architecture/decisions/0007-token-api-for-the-browser-extension.md) |
| 10 | ~~Change-password isn't rate limited~~ (fixed) | Low | [Not yet built #7](not-yet-built.md#security) |
| 11 | Ownership checks aren't all in `lib/db` | Low | [Not yet built #34](not-yet-built.md#code-health) |
| 12 | Plan limits aren't atomic | Low | [Constraints](constraints-and-trade-offs.md#data-and-scale) |
| 13 | ~~Checkout doesn't check the current plan~~ (fixed) | Low | [Not yet built #16](not-yet-built.md#accounts-and-billing) |

## Gaps

### 1. ~~Deleting an item can delete someone else's file~~ — High, fixed

**Fixed.** `isOwnedFileUrl` (`src/lib/r2.ts`) now gates `createItem`, `importData`, the ZIP export fetch and `deleteItem`; non-file types drop file fields. It also closes the export SSRF.

<details><summary>Original description</summary>

**Risk.** `createItem` and `importData` accept a `fileUrl` from the client, and `deleteItem` deletes the R2 key derived from it without checking the owner. Image URLs are public, so anyone who has one can attach it to an item of their own and delete it.

**Fix.** Require the key to start with `${userId}/` in `createItem`, `importData` and before `deleteFromR2`, and ignore `fileUrl` for non-file types. Add a test that a foreign key is rejected. (`src/actions/items.ts`, `src/actions/import.ts`, `src/lib/db/items.ts`)

</details>

### 2. Open dependency advisories — High

**Risk.** `npm audit` reports critical and high advisories in `next`, `next-auth`, `@auth/prisma-adapter`, `prisma` and `vitest`.

**Fix.** Upgrade `next` to the patched 16.x release first, then the others one at a time, running `npm run test && npm run build` after each. Don't use `npm audit fix --force`.

### 3. ~~Credentials sign-in isn't rate limited on the server~~ — Medium, fixed

**Fixed.** The `login` limit runs inside `authorize()`; `/api/auth/check-login-limit` is removed.

<details><summary>Original description</summary>

**Risk.** The `login` limit is checked by `/api/auth/check-login-limit`, which the sign-in form calls voluntarily. A script can post to NextAuth's credentials callback directly and skip it.

**Fix.** Check the `login` limit inside `authorize()` in `src/auth.ts`.

</details>

### 4. ~~Rate limits fail open, including on sign-in~~ — Medium, fixed for credentials

**Fixed.** The credential limits (`login`, `register`, `forgotPassword`, `resetPassword`, `resendVerification`, `changePassword`) now refuse the request when Redis errors. Still open: unset, placeholder or invalid `UPSTASH_*` variables fail open (so local development works), and `ai`, `upload` and `api` fail open on errors. Make sure production has the variables and alert on the log lines. See [ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md).

<details><summary>Original description</summary>

**Risk.** If Upstash is unreachable or misconfigured, every limit passes ([ADR 0005](../architecture/decisions/0005-rate-limits-fail-open.md)). That keeps users signed in during an outage, but it also removes brute-force protection on sign-in and password reset without anyone noticing.

**Fix.** Fail closed for the auth limiters (`login`, `register`, `forgotPassword`, `resetPassword`, `resendVerification`) and keep failing open for `ai`, `upload` and `api`. Alert on the `Rate limit check failed` log line in production. Update ADR 0005 when this changes.

</details>

### 5. ~~Sessions can't be revoked~~ — Medium, fixed

**Fixed.** `users.sessionVersion` is bumped on password change and reset; the `jwt` callback ends any session issued under an older value (and for a deleted user). Migration `20260930150000_add_session_version`. Still no per-device list.

<details><summary>Original description</summary>

**Risk.** JWTs stay valid until they expire. Changing or resetting a password, or deleting the account, doesn't end sessions already issued, so a stolen session outlives the password change meant to stop it.

**Fix.** Add a `sessionVersion` integer to `users`, put it on the token at sign-in, and increment it on password change, password reset and account deletion. The `jwt` callback already re-reads the user row for `isPro` on every evaluation ([ADR 0003](../architecture/decisions/0003-jwt-sessions-with-live-plan.md)), so it can compare the version in the same query and end the session on a mismatch, at no extra cost.

</details>

### 6. ~~Stripe webhooks aren't idempotent or ordered~~ — Medium, fixed

**Fixed.** Every plan-changing event now syncs `isPro` from the customer's subscriptions as Stripe reports them, so a retried or late event can't leave the wrong plan.

<details><summary>Original description</summary>

**Risk.** Each event is applied as it arrives. A retried or out-of-order event, such as a late `invoice.paid` after `customer.subscription.deleted`, can leave the wrong `isPro`.

**Fix.** Record processed event ids in a `stripe_events` table and skip duplicates. Set `isPro` from the subscription's current status fetched from Stripe, not from the event's payload, so order no longer matters.

</details>

### 7. ~~Deleting an account leaves its files and subscription~~ — Medium, fixed

**Fixed.** The route asks a password account for its password, cancels the subscription, deletes the R2 prefix, then deletes the user.

<details><summary>Original description</summary>

**Risk.** `DELETE /api/auth/delete-account` removes the user row only. R2 objects stay readable at their public URLs, and an active Stripe subscription keeps billing with no user attached.

**Fix.** Delete the `{userId}/` prefix from R2 and cancel the subscription before deleting the row.

</details>

### 8. Files are public to anyone with the URL — Medium

**Risk.** The bucket is public ([ADR 0004](../architecture/decisions/0004-files-in-r2-behind-a-download-proxy.md)). The download route checks ownership, but anyone who gets an object's URL can read it directly.

**Fix.** A private bucket, with short-lived signed URLs issued by an ownership-checked route for both downloads and image rendering.

### 9. API tokens never expire — Low

**Risk.** Personal access tokens are long-lived bearer credentials. A leaked token works until the user revokes it.

**Fix.** An optional expiry chosen when the token is created (30, 90 days or never), checked in `authenticateApiRequest`, and a "last used" warning in Settings for tokens idle for a long time.

### 10. ~~Change-password isn't rate limited~~ — Low, fixed

**Fixed.** 5 attempts per 15 minutes per IP + user.

<details><summary>Original description</summary>

**Risk.** With a stolen session, the current-password check can be brute-forced.

**Fix.** Apply a per-user limit in `/api/auth/change-password`.

</details>

### 11. Ownership checks aren't all in `lib/db` — Low

**Risk.** Several route handlers and pages query Prisma directly ([module map](../architecture/module-map.md#layering-rules)), so tenant scoping depends on each of them getting it right. There's no row-level security to catch a miss.

**Fix.** Move those queries into `lib/db` so every read and write takes the user id in one layer. Postgres row-level security could later add a second line of defence.

### 12. Plan limits aren't atomic — Low

**Risk.** Counting then inserting lets concurrent requests push a Free account past its 50 items or 3 collections.

**Fix.** Check the count and insert in one transaction with a row lock on the user, or enforce the cap with a database constraint.

### 13. ~~Checkout doesn't check the current plan~~ — Low, fixed

**Fixed.** `/api/stripe/checkout` answers `409` for a Pro user.

<details><summary>Original description</summary>

**Risk.** A Pro user who reaches `/api/stripe/checkout` can start a second subscription and be billed twice.

**Fix.** Return an error, or redirect to the Customer Portal, when the caller is already Pro.

</details>

## Found in the code review and fixed

Not in the original list; recorded here so the reasoning isn't lost.

| Gap | Fix |
|---|---|
| **Export SSRF.** The ZIP export fetched any `fileUrl` from the server | Only the user's own `R2_PUBLIC_URL/{userId}/…` objects are fetched (see #1) |
| **Account pre-hijack.** Registering someone else's email set a password on an unverified account that the owner's later verification would activate | Registering an unverified address again replaces the password and resends the email |
| **Account enumeration** through registration and resend-verification | Same response for every address |
| **Account deletion without a password** | Password accounts must send it (see #7) |
| **Uploads trusted the client's file type**, and SVGs could hold script | Content type derived from the extension; file signatures checked; SVG with script rejected |
| **No security headers** | `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS and a `frame-ancestors` / `base-uri` / `object-src` CSP. A full `script-src` policy is still open: it needs nonces for the inline theme script and Monaco's CDN loader |
| **No size limits** on titles, content, tags, passwords, imports | Caps in `lib/validation.ts` (title 200, content 500,000, 20 tags of 50, language 50, passwords 128, imports 5,000 entries) |
| **Import stored any URL**, `javascript:` included | Imports keep `http(s)` URLs only |

## Suggested order

Open: **#2** (dependencies, mostly done), **#8** (public bucket), **#9** (token expiry), **#11** (ownership checks outside `lib/db`) and **#12** (atomic plan limits).

When a gap is fixed, strike it through here and in its source entry the way [Not yet built](not-yet-built.md) does (for example item 3 there), so the numbering stays stable.
