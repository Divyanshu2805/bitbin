# Remaining Work

The goal: BitBin as a finished, working, defensible project for admissions committees and recruiters. That means it works for any stranger who tries it, it's safe and durable, and it comes with proof (numbers, badges, tests) and a good story. Everything else is deliberately left out (see the last section) and can be listed as "future work".

Times are hands-on working time including tests and docs, not elapsed time. Tick a box when the work is merged. `[~]` means the code is done and a step on your side is left.

**Core path: about 40 hours after dropping the case study and the demo video (about 39 done; left: the screenshots and the Dependabot PRs, about 1.5 hours). Optional stretch: about 10 hours more.**

| Phase | Goal | Time |
|---|---|---|
| 1 | Works for every visitor | 10 to 12 h |
| 2 | Safe and durable | 7 to 9 h |
| 3 | Proof, with numbers | 18 to 24 h |
| 4 | Showcase | 12 to 16 h |
| Stretch | End-to-end tests | 8 to 10 h |

## Phase 1: Works for every visitor (10 to 12 h)

1. - [x] **Demo account: make it a safe public sandbox.** Done in code: the account can't change its password or name, be deleted, upgraded or reset by email; a daily cron (`/api/cron/reset-demo`, `vercel.json`) restores its library. Needs `CRON_SECRET` set on Vercel for the reset to run. Checked 2026-10-06 in a real session: sign-in works with the published password (so the sandbox matters), and password change, deletion and checkout each return 403. *1.5 to 2 h.*
2. - [x] **Email that reaches strangers.** The `bitbin.divyanshuagrahari.dev` subdomain is verified in Resend, `FROM_EMAIL` is set, and the `_dmarc.bitbin` record (`v=DMARC1; p=none;`) is live (checked 2026-10-06). Mail sends and verifies. It first landed in spam because the domain is new; that improves as people open the emails, and the README should say to check spam.
3. - [x] **Stripe webhook has all five events** and the right secret (checked 2026-10-06).
4. - [x] **Smoke test of the live site:** register and verify, sign in, change password, reset by email, upgrade with a test card, extension token and delete account all worked (2026-10-06).
5. - [x] **Search shows new items straight away** (the index only loads once today). *1 h.*
6. - [x] **Search no longer downloads every item's full content** to build a 100-character preview. *1.5 to 2 h.*
7. - [x] **Import fixes:** "skip duplicates" skips different notes, and `createdAt` / `updatedAt` are dropped. *2 h.*
8. - [x] **ZIP export includes snippets, prompts, commands and notes as readable files**, not only in the JSON. *2 h.*
9. - [x] **`updateItem` in one transaction**, so a failed save can't leave an item without its collections. *1 h.*

## Phase 2: Safe and durable (7 to 9 h)

10. - [x] **Rate limits on import, export, checkout, portal and item creation.** Import 5/h (preview 20/h), export 10/h, checkout 10/h, portal 20/h, item and collection creation 120/min.
11. - [x] **Hash reset and verification tokens** in the database. Also single-use under a race, and a mistyped new password no longer burns the reset link. Links emailed before this deploy stop working once.
12. - [x] **Destructive scripts refuse production, and a separate development database.** The guard is done: `db:seed` and `db:cleanup` refuse to run until the host is in `SAFE_DATABASE_HOSTS` or confirmed with `CONFIRM_DATABASE_HOST`. The Neon `dev` branch exists (schema only, no user data), the local `.env` points at it with its host in `SAFE_DATABASE_HOSTS`, its migration history is synced and it is seeded. Vercel still points at production.
13. - [x] **Error monitoring** (Sentry) with alerts on 5xx and webhook failures. Sentry is live, the alert rule is set, and Node warning noise is filtered. The code strips cookies, tokens and personal data.
14. - [x] **Dependabot and GitHub secret scanning** switched on. `.github/dependabot.yml` is in place and the GitHub security settings are enabled.
15. - [x] **`sslmode=verify-full`** in `DATABASE_URL`. Done in code (`normalizeDatabaseUrl`), so the environment variable can stay as it is; checked against the live database.

## Phase 3: Proof, with numbers (18 to 24 h)

16. - [x] **CI on every push** (audit, lint, tests with the coverage floor, build) with a README badge. `.github/workflows/ci.yml` is live; its first run on GitHub (2026-10-07, commit `e013b64`) passed.
17. - [x] **Tests for every route handler.** Added upload, forgot-password and the real-account paths of change-password and delete-account, plus `/api/items/[id]`, `/api/v1/me` and `/api/v1/collections`. 622 tests across 57 files.
18. - [x] **Coverage report with a floor** (`npm run test:coverage`, enforced in CI). Today: about 81% statements, 81% branches, 81% lines, 71% functions over `actions`, `lib` and `api`; the floor sits just under that.
19. - [x] **Accessibility, responsive and Lighthouse pass.** Lighthouse on a production build, 12 pages including every signed-in one: accessibility 100, SEO 100, best practices 96 (the only miss is the Vercel analytics script that doesn't exist on localhost), performance 80 to 95 (localhost, simulated throttling). Fixed: two low-contrast labels, a heading-order skip, a label-in-name mismatch on the homepage demo, and item / collection cards that were a `role=button` div holding other buttons (now a real title button; the whole card is still clickable). No horizontal scroll at 375 px on any page. Not measured: light-theme contrast.
20. - [x] **A second security review**: manual pass over the components, extension, desktop app, route handlers and actions. One finding, fixed: `/sign-in?callbackUrl=https://evil.example` redirected off-site after sign-in (open redirect), now `safeCallbackPath` with a test. Extension (no `innerHTML`, narrow host permissions) and desktop app (context isolation, sandbox, navigation denied) came out clean. Note: `npm audit --omit=dev` now shows 2 moderate advisories (PostCSS via `@tailwindcss/typography`, published after the last audit); CI fails only on high or critical.
21. - [x] **Privacy policy and Terms pages** at `/privacy` and `/terms`, linked in the footer and on the sign-up form.

29. - [ ] **Clear the five Dependabot pull requests** (opened 2026-10-06): after CI is on `main`, rebase and merge the grouped minor/patch update (#1) when CI is green; handle the majors (`@types/node` 20 to 26, `@vitejs/plugin-react` 5 to 6, `dotenv` 17 to 18, `vitest` 4 to 5, which also needs `@vitest/coverage-v8` bumped) one at a time, or close them. *1 h.*

## Phase 4: Showcase (12 to 16 h)

22. - [~] **README rewrite:** done: pitch, live link and demo login (with the spam-folder note), plans table, feature list with the extension and desktop app, architecture diagram, stack, security highlights, quality numbers, quick start, layout, limitations, docs index, badges, license. Left for you: embed screenshots at the end, with the final docs check.
23. - [x] ~~Engineering case study~~ **Dropped by choice.** The measured figures live on [Project metrics](../metrics.md) instead.
24. - [x] ~~Demo video~~ **Dropped by choice.**
25. - [x] **Share polish:** Open Graph and Twitter metadata with a generated 1200x630 preview image, `robots.txt` (API and signed-in pages disallowed), a sitemap of the five public pages, a canonical URL and `SoftwareApplication` structured data on the homepage, `noindex` on every signed-in and token page, and a favicon check (added `favicon.ico` and an Apple touch icon alongside `icon.svg`). Tests in `src/app/robots.test.ts`.
26. - [x] **Metrics page:** [docs/metrics.md](../metrics.md) holds every measured figure and how to re-check it. No narrative, numbers only.
27. - [x] **Known limitations section** in the README, built from the "left out" list below.

## Stretch

28. - [ ] **End-to-end tests** (Playwright) for sign-in, create, upload, search and checkout in test mode, run in CI. A strong number and a safety net. *8 to 10 h.*

## Numbers to put on a resume

| Figure | Now | After this list |
|---|---|---|
| Automated tests | 622 across 57 files | (+ e2e if you do the stretch) |
| Test coverage | about 81% statements, branches and lines; 71% functions | held by the CI floor |
| Security issues found and fixed in an audit of your own app | about 26 (5 critical or high, 9 medium, the rest low) | |
| Production dependency vulnerabilities | 72 (9 critical) down to 0 | held at 0 by CI |
| Architecture decision records | 9 | |
| Lighthouse (performance, accessibility, best practices, SEO) | 80 to 95, 100, 96, 100 (production build, localhost, 12 pages) | |
| Free-plan limit enforced under concurrency | yes, with a race test | |
| Migrations, route handlers, server actions | 7, 22, 26 | |

## Left out on purpose (list as "future work")

Per-device sessions, email change, account linking, tag management and per-user tags, ZIP import, custom item types, server-side search, keyset pagination, presigned download URLs, orphaned-file sweeper, a full `script-src` CSP, large-import batching, payment-failure emails, Stripe live mode, Prisma 8, publishing and a Firefox build of the extension, signed and auto-updating desktop builds, and sharing. None of these stop the project working, and each is a reasonable thing to say you'd do next.

## Done

File ownership and the export SSRF, server-side sign-in rate limit, full account deletion, session revocation, account-enumeration and pre-hijack fixes, Stripe webhook syncing from Stripe, upload content checks, input size limits, import URL checks, fail-closed credential rate limits, atomic Free-plan limits, API token expiry, a clean production `npm audit`, the private bucket, security headers, image card actions and the token form alignment. The desktop tray app (`desktop/`), added 2026-10-06. Also verified on 2026-10-06: Upstash is configured, email verification is on, the Cloudflare bucket is private and the git history holds no secrets.
