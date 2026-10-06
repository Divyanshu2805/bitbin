# Remaining Work

The goal: BitBin as a finished, working, defensible project for admissions committees and recruiters. That means it works for any stranger who tries it, it's safe and durable, and it comes with proof (numbers, badges, tests) and a good story. Everything else is deliberately left out (see the last section) and can be listed as "future work".

Times are hands-on working time including tests and docs, not elapsed time. Tick a box when the work is merged. `[~]` means the code is done and a step on your side is left.

**Core path: about 50 hours (about 18 done). Optional stretch: about 10 hours more.**

| Phase | Goal | Time |
|---|---|---|
| 1 | Works for every visitor | 10 to 12 h |
| 2 | Safe and durable | 7 to 9 h |
| 3 | Proof, with numbers | 18 to 24 h |
| 4 | Showcase | 12 to 16 h |
| Stretch | End-to-end tests | 8 to 10 h |

## Phase 1: Works for every visitor (10 to 12 h)

1. - [x] **Demo account: make it a safe public sandbox.** Done in code: the account can't change its password or name, be deleted, upgraded or reset by email; a daily cron (`/api/cron/reset-demo`, `vercel.json`) restores its library. Needs `CRON_SECRET` set on Vercel for the reset to run. Checked 2026-10-06 in a real session: sign-in works with the published password (so the sandbox matters), and password change, deletion and checkout each return 403. *1.5 to 2 h.*
2. - [ ] **Email that reaches strangers.** Add a **subdomain** (`bitbin.divyanshuagrahari.dev`, not the root, which other apps use) in Resend, add its DNS records and a `_dmarc.bitbin` TXT record in Cloudflare, set `FROM_EMAIL` to `BitBin <noreply@bitbin.divyanshuagrahari.dev>` on Vercel. Without this a recruiter who registers never gets the verification email. *30 min, your dashboards.*
3. - [ ] **Stripe webhook has all five events** and the right secret. *5 min, your dashboard.*
4. - [ ] **Smoke test of the live site:** register and verify, sign in, change password (you're signed out), reset by email, upgrade with a test card, extension token, delete account. *45 min.*
5. - [x] **Search shows new items straight away** (the index only loads once today). *1 h.*
6. - [x] **Search no longer downloads every item's full content** to build a 100-character preview. *1.5 to 2 h.*
7. - [x] **Import fixes:** "skip duplicates" skips different notes, and `createdAt` / `updatedAt` are dropped. *2 h.*
8. - [x] **ZIP export includes snippets, prompts, commands and notes as readable files**, not only in the JSON. *2 h.*
9. - [x] **`updateItem` in one transaction**, so a failed save can't leave an item without its collections. *1 h.*

## Phase 2: Safe and durable (7 to 9 h)

10. - [x] **Rate limits on import, export, checkout, portal and item creation.** Import 5/h (preview 20/h), export 10/h, checkout 10/h, portal 20/h, item and collection creation 120/min.
11. - [x] **Hash reset and verification tokens** in the database. Also single-use under a race, and a mistyped new password no longer burns the reset link. Links emailed before this deploy stop working once.
12. - [x] **Destructive scripts refuse production, and a separate development database.** The guard is done: `db:seed` and `db:cleanup` refuse to run until the host is in `SAFE_DATABASE_HOSTS` or confirmed with `CONFIRM_DATABASE_HOST`. The Neon `dev` branch exists (schema only, no user data), the local `.env` points at it with its host in `SAFE_DATABASE_HOSTS`, its migration history is synced and it is seeded. Vercel still points at production.
13. - [~] **Error monitoring** (Sentry) with alerts on 5xx and webhook failures. The code is done (off until `SENTRY_DSN` is set, strips cookies, tokens and personal data, verified with the real SDK). Still yours: create the Sentry project, set `SENTRY_DSN` on Vercel, add the alert rules (10 min, steps in `docs/deployment/providers.md`).
14. - [~] **Dependabot and GitHub secret scanning** switched on. `.github/dependabot.yml` is done. Still yours: in the repository's Settings → Advanced Security turn on Dependabot security updates, Secret scanning and Push protection (3 min).
15. - [x] **`sslmode=verify-full`** in `DATABASE_URL`. Done in code (`normalizeDatabaseUrl`), so the environment variable can stay as it is; checked against the live database.

## Phase 3: Proof, with numbers (18 to 24 h)

16. - [ ] **CI on every push** (lint, tests, build, `npm audit --omit=dev`) with a README badge. *1.5 to 2 h.*
17. - [~] **Tests for the eight untested route handlers.** Done: reset-password, verify, portal and checkout (fully), change-password and delete-account (the demo guard only). Left: upload, forgot-password, and the real-account paths of change-password and delete-account. *About 2 h left.*
18. - [ ] **Coverage report with a floor** in CI, so there's a real percentage to quote. *1 to 1.5 h.*
19. - [ ] **Accessibility, responsive and Lighthouse pass:** keyboard, contrast in both themes, labels, phone width on every page; record the Lighthouse scores. *6 to 8 h.*
20. - [ ] **A second security review** (`/security-review`, plus a manual pass over the components and extension) and fix what it finds. *3 to 4 h plus fixes.*
21. - [ ] **Privacy policy and Terms pages**, linked in the footer and sign-up. *2 to 3 h.*

## Phase 4: Showcase (12 to 16 h)

22. - [ ] **README rewrite:** one-line pitch, live link and demo login, screenshots or a GIF, feature list, architecture diagram, stack, security highlights, badges. *3 to 4 h.*
23. - [ ] **Engineering case study** (one page): the problem, the key decisions (the ADRs), the security audit with before and after, and a metrics table. *3 h.*
24. - [ ] **60 to 90 second demo video**, linked from the README. *2 h.*
25. - [ ] **Share polish:** Open Graph and Twitter metadata, `robots.txt`, a sitemap, favicon check. *1.5 h.*
26. - [ ] **Resume numbers sheet:** gather and verify every figure below. *30 min.*
27. - [ ] **Known limitations section** in the README, built from the "left out" list below. *30 min.*

## Stretch

28. - [ ] **End-to-end tests** (Playwright) for sign-in, create, upload, search and checkout in test mode, run in CI. A strong number and a safety net. *8 to 10 h.*

## Numbers to put on a resume

| Figure | Now | After this list |
|---|---|---|
| Automated tests | 553 across 50 files | + route tests (+ e2e if you do the stretch) |
| Test coverage | not measured | a real percentage from item 18 |
| Security issues found and fixed in an audit of your own app | about 25 (5 critical or high, 9 medium, the rest low) | + whatever item 20 finds |
| Production dependency vulnerabilities | 72 (9 critical) down to 0 | held at 0 by CI |
| Architecture decision records | 7 | + the case study |
| Lighthouse (performance, accessibility, best practices, SEO) | not measured | from item 19 |
| Free-plan limit enforced under concurrency | yes, with a race test | |
| Migrations, route handlers, server actions | 7, 30+, 20+ | |

## Left out on purpose (list as "future work")

Per-device sessions, email change, account linking, tag management and per-user tags, ZIP import, custom item types, server-side search, keyset pagination, presigned download URLs, orphaned-file sweeper, a full `script-src` CSP, large-import batching, payment-failure emails, Stripe live mode, Prisma 8, publishing and a Firefox build of the extension, signed and auto-updating desktop builds, and sharing. None of these stop the project working, and each is a reasonable thing to say you'd do next.

## Done

File ownership and the export SSRF, server-side sign-in rate limit, full account deletion, session revocation, account-enumeration and pre-hijack fixes, Stripe webhook syncing from Stripe, upload content checks, input size limits, import URL checks, fail-closed credential rate limits, atomic Free-plan limits, API token expiry, a clean production `npm audit`, the private bucket, security headers, image card actions and the token form alignment. The desktop tray app (`desktop/`), added 2026-10-06. Also verified on 2026-10-06: Upstash is configured, email verification is on, the Cloudflare bucket is private and the git history holds no secrets.
