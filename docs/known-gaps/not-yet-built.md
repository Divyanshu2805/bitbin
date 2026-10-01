# Not Yet Built

Missing features and open issues — found while deploying BitBin and while documenting the code. Each entry says what happens and where to fix it. Severity: **High** can cause failures or security exposure, **Medium** can leave a user or maintainer stuck, **Low** is polish. Nothing here blocks normal use of the live site.

## Security

1. ~~**High — Deleting an item can delete someone else's file.**~~ **Fixed:** `isOwnedFileUrl` gates `createItem`, `importData`, ZIP export and `deleteItem`. (Kept here so the numbering stays stable.)
2. **Medium — Open dependency advisories (mostly fixed).** `next` is now 16.3.8 and `npm audit fix` has been applied, taking `npm audit --omit=dev` from 72 advisories (9 critical) to 17 (0 critical, 15 high). What is left is the `prisma` CLI toolchain (`@prisma/config`, `deepmerge-ts`, `mysql2` and the packages behind `prisma`), where npm's only offered fix is a major downgrade to prisma 6, plus `monaco-editor` / `dompurify`. **Fix:** upgrade prisma and monaco when patched releases exist, re-running `npm audit` after each. Avoid `npm audit fix --force`.
3. ~~**Medium — Collection ids aren't checked for ownership.**~~ **Fixed:** `createItem` and `updateItem` in `lib/db/items.ts` now drop any `collectionIds` that aren't the caller's. (Kept here so the numbering of other items doesn't change.)
4. ~~**Medium — Credentials sign-in isn't rate limited on the server.**~~ **Fixed:** the `login` limit now runs inside `authorize()`.
5. **Medium — The auth library is a beta.** `next-auth@5.0.0-beta.30`. GitHub sign-in only works because of the `issuer` override in `auth.ts` / `auth.config.ts`; upgrading within the beta line didn't fix it. Re-test GitHub sign-in after every upgrade, and drop the override once Auth.js handles GitHub's `iss` itself.
6. ~~**Medium — No session invalidation.**~~ **Fixed:** `users.sessionVersion` is bumped on password change and reset, and the `jwt` callback ends sessions with an older value. (Still no per-device list or "sign out everywhere".)
7. ~~**Low — Change-password isn't rate limited**~~ **Fixed:** 5 attempts per 15 minutes per IP + user.
8. **Low — `sslmode=require` will change meaning.** Every connection logs that `pg` treats `sslmode=require` as `verify-full` today, but v9 switches to libpq's weaker semantics. **Fix:** use `sslmode=verify-full` explicitly in `DATABASE_URL`, locally and on Vercel.

## Accounts and billing

9. ~~**Medium — A failed verification email leaves a stuck account.**~~ **Fixed:** registration deletes the new account when the email can't be sent, and registering an unverified address again replaces its password and resends the email.
10. ~~**Medium — Deleting an account leaves its files and subscription.**~~ **Fixed:** deletion cancels the Stripe subscription, removes the `{userId}/` R2 files and asks a password account for its password.
11. **Medium — No account linking.** Someone who registered with a password can't later sign in with GitHub on the same email (`OAuthAccountNotLinked`), and there's no settings screen to link them. **Fix:** a "Connect GitHub" action for signed-in users — not `allowDangerousEmailAccountLinking`.
12. **Medium — Production runs in Stripe test mode.** Live mode needs an activated account, and new Indian accounts are invite-only; the live site accepts only test cards. See [Stripe test mode in production](../deployment/providers.md#stripe-test-mode-in-production).
13. **Low — GitHub-only users can't add a password.** *Forgot password* deliberately answers with the generic "link sent" message for them, so they wait for an email that never comes. **Fix:** "Set a password" in Settings for accounts without one.
14. **Low — Re-opening a used verification link shows an error.** Tokens are single-use, so a second visit (or a refresh) says *"Invalid verification token"* although the account is verified. **Fix:** when a token isn't found, say the link was already used and point to sign-in.
15. ~~**Low — The checkout webhook fails for a deleted user.**~~ **Fixed:** `updateMany`, so a deleted user is a no-op.
16. ~~**Low — Checkout doesn't check the current plan.**~~ **Fixed:** `/api/stripe/checkout` answers `409` for a Pro user.
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

32. **Medium — Most route handlers have no tests.** Only the token API has them (`src/app/api/v1/items`, `src/app/api/v1/ai/tags`, `src/app/api/v1/ai/description`, and `src/lib/api-auth.ts`). The rest are untested: register, verify, password reset, upload, download, export, Stripe checkout / portal and the webhook. The registration and webhook gaps above would have been caught by them. **Fix:** route tests with mocked Prisma, Resend and Stripe, starting with registration and the webhook.
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
