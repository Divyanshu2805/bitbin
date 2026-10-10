# Project Metrics

Measured figures for BitBin, each with how to re-check it. Nothing here is an estimate unless it says "about". Last measured on 2026-10-11; the Lighthouse scores are from 2026-10-06.

## Quality

| Metric | Value | How to check |
|---|---|---|
| Unit tests | 879 across 75 files (Vitest), all passing | `npm run test` |
| Desktop app tests | 41 (`node:test`), all passing | `cd desktop && npm test` |
| Statement coverage | 84.9% (2,243 of 2,642) | `npm run test:coverage` |
| Branch coverage | 84.8% (1,422 of 1,676) | same |
| Line coverage | 85.0% (2,003 of 2,356) | same |
| Function coverage | 76.1% (325 of 427) | same |
| Coverage floor enforced in CI | 80% statements, branches and lines; 70% functions | `vitest.config.ts` |
| Scope of coverage | `src/actions`, `src/lib`, `src/app/api` (server code); components are checked in the browser | `vitest.config.ts` |
| Route handlers with tests | 24 of 24 (every handler except NextAuth's own) | `src/app/api/**/route.test.ts` |
| CI checks per push | 4: production dependency audit, lint, tests with the coverage floor, build | `.github/workflows/ci.yml` |
| Concurrency-tested behaviours | Free-plan item and collection caps, single-use email links | `plan-limits.test.ts`, `tokens.test.ts` |

## Accessibility, SEO and performance

Lighthouse on a production build (`npm run build && npm run start`), signed-in pages measured with a demo-account session cookie. Scores are 0 to 100.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Homepage | 80 | 100 | 96 | 100 |
| Sign in | 86 | 100 | 96 | 100 |
| Register | 92 | 100 | 96 | 100 |
| Privacy / Terms | 95 / 95 | 100 / 100 | 96 / 96 | 100 / 100 |
| Dashboard | 80 | 100 | 96 | 100 |
| Items (snippets) | 83 | 100 | 96 | 100 |
| Collections | 83 | 100 | 96 | 100 |
| Favorites | 81 | 100 | 96 | 100 |
| Settings | 81 | 100 | 96 | 100 |
| Profile | 83 | 100 | 96 | 100 |
| Upgrade | 82 | 100 | 96 | 100 |

- Accessibility is 100 on all 12 pages measured, with no horizontal scroll at 375 px on any of them. Lighthouse ran on the dark theme (the default); the light theme's colour tokens are held to WCAG AA contrast by `src/app/theme-contrast.test.ts`.
- Best practices is 96 only because the Vercel analytics script doesn't exist on localhost; it is not an issue in production.
- Performance was measured on localhost with simulated throttling; treat it as relative, not as production field data.

## Security

| Metric | Value | Source |
|---|---|---|
| Production dependency vulnerabilities | 0 (down from 72, 9 of them critical) | `npm audit --omit=dev` |
| Issues found and fixed in internal audits | about 35: 5 critical or high, 9 medium, the rest low, followed by a hardening round | [Security model](architecture/security-model.md) |
| Password hashing | bcrypt, cost 12; 8 to 128 characters | `src/app/api/auth/*` |
| Sign-in brute-force limit | 5 attempts per 15 minutes per IP and email, enforced inside `authorize()` | `rateLimitConfigs` |
| Inbox flooding | at most 3 verification or reset mails an hour to one address, from any number of IPs | `registerEmail`, `forgotPasswordEmail`, `resendVerificationEmail` |
| Session lifetime | 14 days (re-issued daily while used), revocable on every device at once | `src/lib/constants/session.ts` |
| Sessions after a password change or reset | all revoked on the next request | `users.sessionVersion` |
| Password-reset and verification links | stored as SHA-256 hashes; valid 1 hour and 24 hours; single use even under a race | `src/lib/tokens.ts` |
| API tokens | stored as SHA-256 hashes; 30, 90 or 365 days (no "never"); at most 10 per user; 4 scopes checked per request | `src/actions/api-tokens.ts`, `src/lib/api-scopes.ts` |
| Third-party scripts allowed in a page | 0 (Content Security Policy; the code editor is served from the app's own origin) | `src/lib/csp.ts` |
| Public objects in file storage | 0 (private bucket; every read is checked against the signed-in user) | `/api/download` |
| Photo metadata kept after upload | none (re-encoded; non-images and images over 50 megapixels refused) | `src/lib/image-sanitize.ts` |
| ZIP import inflation cap | 40 MB in total, 10 MB per file, 100 files, enforced while inflating | `src/lib/zip-import.ts` |

### Rate limits

Sliding windows in Upstash Redis, keyed by IP and, where it applies, the user or the email address. The full table is in [errors and rate limits](api/errors-and-rate-limits.md#rate-limits).

| Endpoint | Limit |
|---|---|
| Sign-in | 5 / 15 min |
| Register, forgot password (per IP, and per address from any IP) | 3 / hour |
| Reset password, change password | 5 / 15 min |
| Resend verification | 3 / 15 min per IP, 3 / hour per address |
| Search palette | 240 / minute |
| Item, collection and tag changes | 120 / minute |
| Import / import preview | 5 / hour, 20 / hour |
| Export | 10 / hour |
| File upload (web and API) | 10 / hour |
| AI helpers (app and API) | 20 / hour |
| Checkout / billing portal | 10 / hour, 20 / hour |
| Sign out everywhere | 5 / hour |
| Token API (`/api/v1`) | 60 / minute |

## Product limits

| Limit | Value |
|---|---|
| Free plan | 50 items, 3 collections |
| Pro plan | unlimited; $8 / month or $72 / year |
| Upload size | images 5 MB, other files 10 MB; 4 MB from the desktop app and in a ZIP import (the host's request-body limit) |
| Item fields | content 500,000 characters; title 200; description 1,000; 20 tags of 50 characters |
| JSON import | 5,000 items and 5,000 collections per file |
| ZIP import | 4 MB, 100 files |
| Search | 20 items and 8 collections per answer; previews are the first 100 characters, cut in SQL |
| Page size | 21 items or collections; any caller-supplied limit is capped at 100 rows |
| AI input | the first 2,000 characters of an item |
| API tokens | 10 per user |
| Demo account | items up to 5,000 characters, no links, no imports; reset daily |

## Scale of the codebase

| Metric | Value |
|---|---|
| Application source (TypeScript and TSX, without tests or generated code) | about 29,700 lines |
| Test code | about 11,600 lines |
| Database models / migrations | 10 / 9 |
| Route handlers / server actions | 25 (including NextAuth's) / 28 |
| React components | 143 |
| Item types | 7 (snippet, prompt, command, note, file, image, link) |
| Clients of the token API | 2 (browser extension, desktop app) |
| Scheduled jobs | 2 (daily demo reset, weekly orphaned-file sweep) |
| Architecture decision records | 10 |

## Re-measuring

```bash
npm run test:coverage                 # tests and coverage
cd desktop && npm test                # the desktop app's tests
npm audit --omit=dev                  # production dependency advisories
npm run build && npm run start        # then run Lighthouse against http://localhost:3000
```

See [testing](practices/testing.md#coverage-and-ci) for the coverage rules and the [tooling pitfalls](practices/gotchas/tooling-and-ci.md#lighthouse-numbers-need-a-production-build) for measuring Lighthouse, including signed-in pages.
