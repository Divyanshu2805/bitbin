# Not Yet Built

Missing features and open issues — found while deploying BitBin and while documenting the code. Each entry says what happens and where to fix it. Severity: **High** can cause failures or security exposure, **Medium** can leave a user or maintainer stuck, **Low** is polish. Nothing here blocks normal use of the live site.

## Security

1. ~~**High — Deleting an item can delete someone else's file.**~~ **Fixed:** `isOwnedFileUrl` gates `createItem`, `importData`, ZIP export and `deleteItem`. (Kept here so the numbering stays stable.)
2. ~~**Medium — Open dependency advisories.**~~ **Fixed for production:** `next` is 16.3.8, `npm audit fix` is applied, and `.npmrc` sets `legacy-peer-deps=true` so npm no longer installs `@vercel/analytics`' non-optional `nuxt` peer (and its ~440-package tree) that the app never imports. `monaco-editor` is pinned to 0.45.0, the version loaded from the CDN, as a types-only devDependency. `npm audit --omit=dev` reports **0 vulnerabilities**. A full `npm audit` still lists 9 high ones in dev tooling (the `prisma` CLI via `@prisma/config` / `mysql2`, and `eslint-config-next` via `fast-glob` / `braces`); npm's only offered fix for prisma is a downgrade to 6, so wait for a patched release. Re-run `npm audit --omit=dev` before each deploy. CI runs it on every push and fails on high or critical advisories; two moderate ones are currently open (PostCSS's selector parser, reached through `@tailwindcss/typography`), which clear when that plugin ships a fix.
3. ~~**Medium — Collection ids aren't checked for ownership.**~~ **Fixed:** `createItem` and `updateItem` in `lib/db/items.ts` now drop any `collectionIds` that aren't the caller's. (Kept here so the numbering of other items doesn't change.)
4. ~~**Medium — Credentials sign-in isn't rate limited on the server.**~~ **Fixed:** the `login` limit now runs inside `authorize()`.
5. **Medium — The auth library is a beta.** `next-auth@5.0.0-beta.30`. GitHub sign-in only works because of the `issuer` override in `auth.ts` / `auth.config.ts`; upgrading within the beta line didn't fix it. Re-test GitHub sign-in after every upgrade, and drop the override once Auth.js handles GitHub's `iss` itself.
6. ~~**Medium — No session invalidation.**~~ **Fixed:** `users.sessionVersion` is bumped on password change and reset, and the `jwt` callback ends sessions with an older value. (Still no per-device list or "sign out everywhere".)
7. ~~**Low — Change-password isn't rate limited**~~ **Fixed:** 5 attempts per 15 minutes per IP + user.
8. ~~**Low — `sslmode=require` will change meaning.**~~ **Fixed in code:** `normalizeDatabaseUrl` (`lib/db-url.ts`) rewrites `sslmode=require` to `verify-full` for the app and the scripts, so the connection stays as strict as it is today and the warning is gone. The environment variable itself can stay as it is.

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

19. ~~**Medium — Development and production share a database.**~~ **Fixed:** local development uses a Neon `dev` branch (schema only, seeded) and `SAFE_DATABASE_HOSTS` lists its host, so `db:seed` and `db:cleanup` refuse to touch production. Vercel still points at the production database.
20. ~~**Medium — No error monitoring.**~~ **Built and live:** Sentry (`lib/monitoring.ts`, `instrumentation.ts`) captures server errors and every `console.error`, with an alert rule set in the Sentry dashboard. It stays off wherever `SENTRY_DSN` is unset: see [Sentry](../deployment/providers.md#sentry).
21. ~~**Medium — No DMARC record.**~~ **Fixed:** mail sends from the `bitbin.divyanshuagrahari.dev` subdomain, verified in Resend, with a `_dmarc.bitbin` record (`p=none`). A brand-new sending domain still lands in spam at first; the README tells new users to check there.
22. **Low — Local email only reaches the Resend owner** without `FROM_EMAIL` — expected; set it to test other recipients.
23. **Low — Noisy log when Upstash is unset.** *"Upstash Redis not configured"* is logged on every rate-limit check, not once per process.
24. **Low — Prisma 8 is available**; the project is on 7.3.

## Features

25. ~~**Low — Search doesn't refresh after changes**~~ **Fixed:** the index reloads when the palette opens.
26. **Low — AI output depends on the model.** Tags and descriptions need JSON mode; other models fail with *"AI returned an unexpected format"*. Optionally fall back to parsing JSON from plain text.
27. **Low — The AI key is named after OpenAI.** `OPENAI_API_KEY` also holds OpenRouter keys. **Fix:** accept `AI_API_KEY` as an alias.
28. **Custom item types.** The schema supports per-user types (`item_types.userId`) and a per-collection default (`collections.defaultTypeId`), but the app uses neither.
29. **ZIP imports.** Only JSON exports can be imported; file binaries from a ZIP export can't be restored.
30. **Tag management.** Tags can't be renamed, merged or deleted.
31. **Sharing.** No public links or shared collections.

## Code health

32. ~~**Medium — Most route handlers have no tests.**~~ **Fixed:** every route handler has a test file with Prisma, Resend, Stripe and R2 mocked, and CI runs them with a coverage floor ([Testing](../practices/testing.md#coverage-and-ci)).
33. **`exportData` action is unused.** The UI downloads exports through `/api/export`; `src/actions/export.ts` duplicates it and can be removed (with its test) or used.
34. **Direct Prisma use outside `lib/db`.** Several route handlers and pages query Prisma directly ([module map](../architecture/module-map.md#layering-rules)); moving them into `lib/db` would put every ownership check in one place.
35. ~~**`updateItem` isn't transactional.**~~ **Fixed:** the link rewrite and the item update run in one transaction.
36. **No end-to-end tests.** Sign-in, create, upload, search and checkout are exercised only by hand and by the [smoke test](../deployment/smoke-test.md). **Fix:** Playwright against a test database, run in CI.
37. **Low — Light-theme contrast hasn't been measured.** Lighthouse and the manual pass covered the dark theme (the default), where accessibility scores 100. **Fix:** run the same audit with the light theme forced.
38. **Low — The Privacy and Terms pages are generic.** They describe what the app does and which providers handle data, but haven't been reviewed by a lawyer.

## Roadmap

Planned additions, not bugs:

- **Publish and sign the desktop app.** The tray app is built ([flow](../architecture/flows/save-from-desktop.md)) and uses the same [token API](../api/token-api.md), but builds are unsigned (SmartScreen and Gatekeeper warn), there is no auto-update, and there's no download in Settings. It saves text only ([limits](../../desktop/README.md#known-limits)).
- **Publish the extension** to the Chrome Web Store and Edge Add-ons. Today Pro users download a ZIP from Settings and load it unpacked, which needs Developer mode and has no automatic updates. See [`extension/README.md`](../../extension/README.md#publishing).
- **Firefox support** for the extension. It needs a `browser_specific_settings` block and a background script instead of a service worker.
- **End-to-end tests** (item 36).
- **Live Stripe payments** once the account can be activated (item 12).
