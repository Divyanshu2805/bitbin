# Not Yet Built

Missing features and open issues — found while deploying BitBin and while documenting the code. Each entry says what happens and where to fix it. Severity: **High** can cause failures or security exposure, **Medium** can leave a user or maintainer stuck, **Low** is polish. Nothing here blocks normal use of the live site.

## Security

1. **High — Deleting an item can delete someone else's file.** `createItem` accepts `fileUrl` from the client for any item type (only `file` / `image` are Pro-gated), and `importData` keeps imported `fileUrl`s for Pro users. `deleteItem` then deletes the R2 key derived from that URL without checking it starts with the caller's `{userId}/`. Anyone who knows another user's file URL — image URLs are public — can store it on an item of their own and delete it. **Fix:** in `createItem`, `importData` and before `deleteFromR2`, require the key to start with `${session.user.id}/`, and ignore `fileUrl` for non-file types. (`src/actions/items.ts`, `src/actions/import.ts`, `src/lib/db/items.ts`)
2. **High — Open dependency advisories.** `npm audit` reports 70 advisories (10 critical, 31 high), including in `next`, `next-auth`, `@auth/prisma-adapter`, `prisma` and `vitest`. **Fix:** upgrade `next` to the patched 16.x release first, then the rest one at a time with `npm run test && npm run build` after each. Avoid `npm audit fix --force` — it proposes breaking downgrades.
3. ~~**Medium — Collection ids aren't checked for ownership.**~~ **Fixed:** `createItem` and `updateItem` in `lib/db/items.ts` now drop any `collectionIds` that aren't the caller's. (Kept here so the numbering of other items doesn't change.)
4. **Medium — Credentials sign-in isn't rate limited on the server.** The `login` limit lives in `/api/auth/check-login-limit`, which the sign-in form calls voluntarily; a script can post to NextAuth's credentials callback directly. **Fix:** check the limit inside `authorize()` in `src/auth.ts`.
5. **Medium — The auth library is a beta.** `next-auth@5.0.0-beta.30`. GitHub sign-in only works because of the `issuer` override in `auth.ts` / `auth.config.ts`; upgrading within the beta line didn't fix it. Re-test GitHub sign-in after every upgrade, and drop the override once Auth.js handles GitHub's `iss` itself.
6. **Medium — No session invalidation.** Resetting or changing a password, or deleting the account, leaves existing JWTs valid until they expire.
7. **Low — Change-password isn't rate limited**, so the current-password check can be brute-forced from a stolen session.
8. **Low — `sslmode=require` will change meaning.** Every connection logs that `pg` treats `sslmode=require` as `verify-full` today, but v9 switches to libpq's weaker semantics. **Fix:** use `sslmode=verify-full` explicitly in `DATABASE_URL`, locally and on Vercel.

## Accounts and billing

9. **Medium — A failed verification email leaves a stuck account.** `POST /api/auth/register` creates the user **before** sending the email. If sending fails, the user sees *"An error occurred during registration"*, and retrying says *"User with this email already exists"*; the way out (sign in, then *Resend verification email*) isn't obvious. **Fix:** delete the user when the send fails, or make "already exists but unverified" re-send the email instead of erroring.
10. **Medium — Deleting an account leaves its files and subscription.** `DELETE /api/auth/delete-account` deletes the user row only: R2 objects stay, and an active Stripe subscription keeps billing with no user attached. **Fix:** delete the `{userId}/` prefix from R2 and cancel the subscription before deleting the row.
11. **Medium — No account linking.** Someone who registered with a password can't later sign in with GitHub on the same email (`OAuthAccountNotLinked`), and there's no settings screen to link them. **Fix:** a "Connect GitHub" action for signed-in users — not `allowDangerousEmailAccountLinking`.
12. **Medium — Production runs in Stripe test mode.** Live mode needs an activated account, and new Indian accounts are invite-only; the live site accepts only test cards. See [Stripe test mode in production](../deployment/providers.md#stripe-test-mode-in-production).
13. **Low — GitHub-only users can't add a password.** *Forgot password* deliberately answers with the generic "link sent" message for them, so they wait for an email that never comes. **Fix:** "Set a password" in Settings for accounts without one.
14. **Low — Re-opening a used verification link shows an error.** Tokens are single-use, so a second visit (or a refresh) says *"Invalid verification token"* although the account is verified. **Fix:** when a token isn't found, say the link was already used and point to sign-in.
15. **Low — The checkout webhook fails for a deleted user.** `handleCheckoutCompleted` uses `prisma.user.update`; if the user deleted their account between paying and the webhook, it throws, returns `500`, and Stripe retries for days. **Fix:** `updateMany`, or catch "record not found" and return `200`.
16. **Low — Checkout doesn't check the current plan.** A Pro user who reaches `/api/stripe/checkout` gets a second subscription.
17. **Low — `invoice.payment_failed` does nothing** beyond logging — no email, no grace period.
18. **Low — No email change** after registration.

## Email and operations

19. **Medium — Development and production share a database.** Local development and the live site use the same Neon database, so test accounts appear in production and a bad local migration would hit live data. **Fix:** a Neon `development` branch for the local `.env`.
20. **Medium — No error monitoring.** Server errors only appear in Vercel's function logs; nobody is notified. **Fix:** an error tracker, or log drains with alerts on `5xx` and webhook failures.
21. **Medium — No DMARC record.** SPF and DKIM are set up through Resend, but without `_dmarc` verification emails are more likely to land in spam. **Fix:** see [Resend setup](../deployment/providers.md#resend).
22. **Low — Local email only reaches the Resend owner** without `FROM_EMAIL` — expected; set it to test other recipients.
23. **Low — Noisy log when Upstash is unset.** *"Upstash Redis not configured"* is logged on every rate-limit check, not once per process.
24. **Low — Prisma 8 is available**; the project is on 7.3.

## Features

25. **Low — Search doesn't refresh after changes** — `refreshSearchData` exists but is never called. **Fix:** refetch when the palette opens, or after create / update / delete.
26. **Low — AI output depends on the model.** Tags and descriptions need JSON mode; other models fail with *"AI returned an unexpected format"*. Optionally fall back to parsing JSON from plain text.
27. **Low — The AI key is named after OpenAI.** `OPENAI_API_KEY` also holds OpenRouter keys. **Fix:** accept `AI_API_KEY` as an alias.
28. **Custom item types.** The schema supports per-user types (`item_types.userId`) and a per-collection default (`collections.defaultTypeId`), but the app uses neither.
29. **ZIP imports.** Only JSON exports can be imported; file binaries from a ZIP export can't be restored.
30. **Tag management.** Tags can't be renamed, merged or deleted.
31. **Sharing.** No public links or shared collections.

## Code health

32. **Medium — Most route handlers have no tests.** Only the token API has them (`src/app/api/v1/items`, `src/app/api/v1/ai/tags`, and `src/lib/api-auth.ts`). The rest are untested: register, verify, password reset, upload, download, export, Stripe checkout / portal and the webhook. The registration and webhook gaps above would have been caught by them. **Fix:** route tests with mocked Prisma, Resend and Stripe, starting with registration and the webhook.
33. **`exportData` action is unused.** The UI downloads exports through `/api/export`; `src/actions/export.ts` duplicates it and can be removed (with its test) or used.
34. **Direct Prisma use outside `lib/db`.** Several route handlers and pages query Prisma directly ([module map](../architecture/module-map.md#layering-rules)); moving them into `lib/db` would put every ownership check in one place.
35. **`updateItem` isn't transactional.** Its collection-link rewrite and item update are separate statements.

## Roadmap

Planned additions, not bugs:

- **Save from anywhere: desktop app (Pro).** The browser extension is built ([flow](../architecture/flows/save-from-extension.md)). A desktop tray app with a system-wide shortcut could follow and would use the same [token API](../api/token-api.md) without server changes.
- **Publish the extension** to the Chrome Web Store and Edge Add-ons. Today Pro users download a ZIP from Settings and load it unpacked, which needs Developer mode and has no automatic updates. See [`extension/README.md`](../../extension/README.md#publishing).
- **Firefox support** for the extension. It needs a `browser_specific_settings` block and a background script instead of a service worker.
- **A separate development database** (item 19).
- **Live Stripe payments** once the account can be activated (item 12).
