# Testing

Unit tests use **Vitest** in a Node environment (`vitest.config.ts`). They cover server actions and library code; React components aren't unit-tested and are checked in the browser.

```bash
npm run test         # single run
npm run test:watch   # watch mode
```

## What's covered

| File | Focus |
|---|---|
| `src/actions/ai.test.ts` | Auth and Pro guards, validation, rate limiting, prompt building, OpenAI response parsing |
| `src/actions/items.test.ts` | Create / update / delete, Pro gating for files and images, the Free item cap, language detection on create, tag filtering, collection links, adding to / removing from one collection |
| `src/actions/collections.test.ts` | CRUD, favorite and pin toggles, the Free collection cap |
| `src/actions/search.test.ts` | Search data shape |
| `src/actions/settings.test.ts` | Editor preference validation; name updates (auth, trimming, length, scoped save) |
| `src/actions/api-tokens.test.ts` | Pro guard, token limit, hash-only storage, scoped revoke |
| `src/lib/api-tokens.test.ts`, `api-auth.test.ts` | Token format and hashing, Bearer parsing; `401` / `403` / `429` and the per-request Pro check |
| `src/app/api/v1/items/route.test.ts`, `ai/tags/route.test.ts`, `ai/description/route.test.ts` | Token API status codes, rejected file types, dropped file fields, shared validation |
| `src/lib/extension-package.test.ts`, `src/app/api/extension/download/route.test.ts` | The extension ZIP: contents, localhost stripped in production, Pro-only download |
| `src/app/api/download/[...path]/route.test.ts` | File download: `401` / `403` (another user's file), attachment headers, and the `?inline=1` preview (PDF kept, everything else sandboxed plain text) |
| `src/lib/db/items.test.ts`, `collections.test.ts` | Query shaping, ownership (including foreign collection ids), dominant colour, pinned-first ordering |
| `src/lib/detect-language.test.ts` | Language detection for each picker language, commands, the shell fallback, TS vs JS |
| `src/lib/export-files.test.ts`, `src/app/api/export/route.test.ts` | The ZIP's text files (folders, extensions, safe and unique names, links list) and what the export route reads from storage |
| `src/actions/import.test.ts`, `src/lib/import-utils.test.ts` | Manifest format and validation, which items count as duplicates, date handling, Free limits and input hardening |
| `src/lib/demo.test.ts`, `src/app/api/cron/reset-demo/route.test.ts` | The demo account check and the daily reset: secret handling, no demo account, failures |
| `src/lib/db/search-items.test.ts`, `plan-limits.test.ts`, `update-item.test.ts` | Search previews cut in SQL, the locked plan-limit checks (including a race), and `updateItem`'s transaction |
| `src/lib/tokens.test.ts`, `src/app/api/auth/reset-password/route.test.ts`, `verify/route.test.ts` | Tokens stored as a hash, single use under a race, expiry, the prefix check; the reset and verify routes |
| `src/lib/db-url.test.ts`, `db-safety.test.ts` | `sslmode` rewriting and the guard on the destructive scripts |
| `src/lib/monitoring.test.ts`, `monitoring-start.test.ts` | What is stripped from an error event, the options, off without a DSN, and a real `console.error` becoming an event |
| `src/lib/r2.test.ts` | File validation, size formatting, key parsing |
| `src/lib/rate-limit.test.ts` | Unset, placeholder and invalid Upstash config (open in development, the in-memory fallback in production), per-address keys, the client-IP rules, and failing closed on a Redis error |
| `src/lib/usage.test.ts` | Free / Pro limits |
| `src/app/robots.test.ts` | `robots.txt` blocks the API and signed-in paths but no public page, the sitemap lists exactly the public pages, and the two lists never overlap |
| `src/lib/credentials.test.ts` | The sign-in check: the login limit, unknown and GitHub-only accounts answering like a wrong password, unverified email |
| `src/lib/csp.test.ts`, `security-headers.test.ts`, `same-origin.test.ts` | The policy (no third-party script, no eval, `connect-src 'self'`, Turnstile only when on), which rule applies to which path, and the cross-site check |
| `src/lib/image-sanitize.test.ts`, `virus-check.test.ts`, `turnstile.test.ts` | EXIF stripped by a real `sharp` round trip, non-images and decompression bombs refused, only the hash sent to VirusTotal and fail-open behaviour, Turnstile verification and fail-closed behaviour |
| `src/lib/api-auth.test.ts` (scopes), `src/actions/api-tokens.test.ts` | Scope enforcement per endpoint, no never-expiring tokens, at least one permission |
| `src/lib/validation.test.ts` | `safeCallbackPath` (no open redirect after sign-in) and `safeUrlSchema` |
| `src/app/api/auth/*/route.test.ts`, `upload/route.test.ts`, `items/[id]/route.test.ts`, `v1/me`, `v1/collections` | Auth, rate-limit, ownership and error paths of the remaining route handlers: change-password, delete-account (subscription and storage failures), forgot-password (same answer for every address), upload (Pro, rate limit, content checks) |
| `src/lib/utils/date.test.ts` | Relative date formatting |
| `src/lib/constants/editor.test.ts` | Editor preference defaults and merging |

## Conventions

- Tests sit next to the code: `foo.ts` → `foo.test.ts`. `vitest.config.ts` only picks up `src/**/*.test.ts`.
- Prisma, `auth()`, OpenAI, R2 and Upstash are mocked with `vi.mock`, so tests never touch the network or a database and need no environment variables.
- Assert on the `ActionResult` (`success`, `error`, `data`), not on implementation details.
- The `@/` alias works in tests.

## Not covered by tests

Check these by hand when a change touches them:

- Route handlers are unit-tested, but not against real services (R2, Stripe, Resend); try those in test mode. The route tests show the pattern: call the exported `GET` / `POST` with a `Request`, and mock `@/auth` or `@/lib/api-auth`, Prisma and the library underneath.
- The browser extension (`extension/`): load it unpacked and try it. See [`extension/README.md`](../../extension/README.md).
- The desktop app (`desktop/`): `cd desktop && npm test` runs its `node:test` suites (type guessing, the API client and body builders, the config store). They're separate from Vitest and aren't part of `npm run test` at the root. The tray, shortcut and windows are checked by running `npm start` there. See [`desktop/README.md`](../../desktop/README.md).
- NextAuth callbacks and `proxy.ts`.
- Components, layout and responsive behaviour, including `prefers-reduced-motion`.
- Real integrations: Stripe (use `stripe listen` and a test card), R2, Resend, OpenAI.

The [deployment smoke test](../deployment/smoke-test.md) is the end-to-end checklist.

## Coverage and CI

```bash
npm run test:coverage   # same tests, plus a v8 coverage report in coverage/ (git-ignored)
```

Coverage covers `src/actions`, `src/lib` and `src/app/api` (components are checked in the browser). `vitest.config.ts` sets a floor of 75% statements, branches and lines and 65% functions, just under today's numbers (about 84 / 84 / 84 / 74); a run below it fails. Raise the floor when coverage grows, never lower it to make a change pass.

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: `npm ci`, `npm audit --omit=dev --audit-level=high`, lint, tests with the coverage floor, and a build with placeholder variables. The coverage report is uploaded as a build artifact.

## Before pushing

```bash
npm run lint && npm run test && npm run build
```

`npm run build` also runs `prisma generate` and a full type-check. It needs the variables from `.env.example` to exist, but placeholders are enough.
