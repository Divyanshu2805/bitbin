# Project Metrics

Measured figures for BitBin, each with how it was obtained so it can be re-checked. Nothing here is an estimate unless it says "about". Last measured 2026-10-07 after the security hardening round (Lighthouse figures are from 2026-10-06).

## Quality

| Metric | Value | How to check |
|---|---|---|
| Unit tests | 809 across 67 files (Vitest), all passing | `npm run test` |
| Desktop app tests | 29 (`node:test`), all passing | `cd desktop && npm test` |
| Statement coverage | about 84% (2,021 of 2,408) | `npm run test:coverage` |
| Branch coverage | about 84% (1,238 of 1,481) | same |
| Line coverage | about 84% (1,812 of 2,160) | same |
| Function coverage | about 75% (284 of 381) | same |
| Coverage floor enforced in CI | 75% statements, branches and lines; 65% functions | `vitest.config.ts` |
| Scope of coverage | `src/actions`, `src/lib`, `src/app/api` (server code); components are checked in the browser | `vitest.config.ts` |
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

- Accessibility is 100 on all 12 pages measured, with no horizontal scroll at 375 px on any of them. The audit covered the dark theme (the default); the light theme hasn't been measured.
- Best practices is 96 only because the Vercel analytics script doesn't exist on localhost; it is not an issue in production.
- Performance was measured on localhost with simulated throttling; treat it as relative, not as production field data.

## Security

| Metric | Value | Source |
|---|---|---|
| Production dependency vulnerabilities | 72 (9 critical) reduced to 0 | `npm audit --omit=dev` |
| Issues found and fixed in the internal audits | about 35: 5 critical or high, 9 medium, the rest low, including a hardening round that closed 9 further loopholes | [Security model](architecture/security-model.md) (what protects each part now) |
| Password hashing | bcrypt, cost 12 | `src/app/api/auth/*` |
| Sign-in brute-force limit | 5 attempts per 15 minutes per IP and email, plus 10 code guesses per 15 minutes per account (any IP), enforced on the server | `rateLimitConfigs` |
| Inbox flooding | at most 3 verification or reset mails an hour to one address, from any number of IPs | `registerEmail`, `forgotPasswordEmail`, `resendVerificationEmail` |
| Session lifetime | 14 days (re-issued daily while used), revocable on every device at once | `lib/constants/session.ts` |
| API token permissions | 3 scopes, checked per request; no token without an expiry | `lib/api-scopes.ts` |
| Third-party scripts allowed in a page | 0 (Content Security Policy; the code editor is served from our own origin) | `lib/csp.ts` |
| Photo metadata kept after upload | none (re-encoded; non-images and images over 50 megapixels refused) | `lib/image-sanitize.ts` |
| Password-reset and verification links | stored as SHA-256 hashes; valid 1 hour and 24 hours; single use even under a race | `src/lib/tokens.ts` |
| API token lifetime | 30, 90 or 365 days (no "never"); at most 10 per user; stored hashed | `src/actions/api-tokens.ts` |
| Sessions after a password change or reset | all revoked on the next request | `users.sessionVersion` |
| Public objects in file storage | 0 (private bucket, reads checked per user) | `/api/download` |

### Rate limits (per user or IP, sliding window)

| Endpoint | Limit |
|---|---|
| Sign-in | 5 / 15 min |
| Register, forgot password (per IP, and per address from any IP) | 3 / hour |
| Reset password, change password | 5 / 15 min |
| Resend verification | 3 / 15 min per IP, 3 / hour per address |
| Import / import preview | 5 / hour, 20 / hour |
| Export | 10 / hour |
| Checkout / billing portal | 10 / hour, 20 / hour |
| Item and collection creation | 120 / minute |
| File upload | 10 / hour |
| AI helpers | 20 / hour |
| Sign out everywhere | 5 / hour |
| Token API (`/api/v1`) | 60 / minute |

## Product limits

| Limit | Value |
|---|---|
| Free plan | 50 items, 3 collections |
| Pro plan | unlimited; $8 / month or $72 / year |
| Upload size | images 5 MB, other files 10 MB |
| Item content | up to 500,000 characters; title 200; 20 tags of 50 characters |
| Import size | 5,000 entries per file |
| Search preview | first 100 characters, cut in SQL so full content is never loaded for the palette |
| Query page size cap | 100 rows |
| AI input | first 2,000 characters of an item |

## Scale of the codebase

| Metric | Value |
|---|---|
| Application source (TypeScript, TSX; excluding tests and generated code) | about 30,000 lines |
| Test code | about 10,800 lines |
| Database tables / migrations | 10 models / 8 migrations |
| Route handlers / server actions | 22 / 31 |
| React components | 145 |
| Item types | 7 (snippet, prompt, command, note, file, image, link) |
| Clients on the token API | 2 (browser extension, desktop app) |
| Architecture decision records | 11 |
| Documentation pages | 75 |

## Re-measuring

```bash
npm run test:coverage                 # tests and coverage
npm audit --omit=dev                  # production dependency advisories
npm run build && npm run start        # then run Lighthouse against http://localhost:3000
```

See [testing](practices/testing.md#coverage-and-ci) for the coverage rules and [Tooling and CI pitfalls](practices/gotchas/tooling-and-ci.md#lighthouse-numbers-need-a-production-build) for measuring Lighthouse, including signed-in pages.
