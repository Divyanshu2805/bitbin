# Testing

Unit tests use **Vitest** in a Node environment (`vitest.config.ts`). They cover server actions and library code; React components aren't unit-tested and are checked in the browser.

```bash
npm run test         # single run
npm run test:watch   # watch mode
```

## What's covered

914 tests in 78 files, grouped by area. Re-measured figures are on [project metrics](../metrics.md).

| Area | Files | Focus |
|---|---|---|
| Item actions | `src/actions/items.test.ts`, `src/lib/db/items.test.ts`, `update-item.test.ts` | Create / update / delete, Pro gating for files and images, the Free item cap, language detection on create, the demo account's limits, tag filtering, collection links (including foreign collection ids), adding to and removing from one collection, `updateItem`'s transaction |
| Collections | `src/actions/collections.test.ts`, `src/lib/db/collections.test.ts` | CRUD, favorite and pin toggles, the Free collection cap, dominant colour, pinned-first ordering |
| Tags | `src/actions/tags.test.ts`, `src/lib/db/tags.test.ts` | Validation, rate limit, rename, merge and delete touching only the caller's own items, unused rows removed |
| Plan limits | `src/lib/usage.test.ts`, `src/lib/db/plan-limits.test.ts` | Free / Pro limits, and the locked count-then-insert under a concurrent race |
| Search | `src/actions/search.test.ts`, `src/lib/db/search.test.ts` | Result shape, `#tag` parsing, escaping of `%` and `_`, previews cut in SQL |
| Pagination | `src/lib/keyset.test.ts` | Cursor round trips, bad cursors, `after` / `before`, page edges |
| AI | `src/actions/ai.test.ts`, `src/lib/ai-json.test.ts`, `src/lib/openai.test.ts`, `src/app/api/v1/ai/*/route.test.ts` | Auth and Pro guards, validation, rate limiting, prompts, JSON mode with a fallback, JSON found in fences and sentences, the `AI_API_KEY` / `OPENAI_API_KEY` names, the token endpoints' status codes |
| API tokens and `/api/v1` | `src/actions/api-tokens.test.ts`, `src/lib/api-tokens.test.ts`, `src/lib/api-auth.test.ts`, `src/app/api/v1/*/route.test.ts` | Pro guard, token limit, hash-only storage, expiry, scopes per endpoint, scoped revoke; Bearer parsing; `401` / `403` / `413` / `429`; `POST /api/v1/files` cleaning up after a failed create |
| Files | `src/lib/r2.test.ts`, `file-ingest.test.ts`, `image-sanitize.test.ts`, `file-url.test.ts`, `upload-parts.test.ts`, `src/app/api/upload/route.test.ts`, `upload/part/route.test.ts`, `v1/files/part/route.test.ts`, `download/[...path]/route.test.ts` | Validation and signatures, EXIF stripped by a real `sharp` round trip, decompression bombs refused, key parsing; uploads in parts (ids, indexes, sizes, joining in order, missing parts, cleanup); ownership (`403` for another user's file), streamed downloads with their length, attachment headers, the sandboxed `?inline=1` preview |
| Orphan sweep | `src/lib/orphan-sweep.test.ts`, `src/app/api/cron/sweep-files/route.test.ts` | Only old, upload-shaped, unreferenced objects, and abandoned upload parts; the abort when most of the bucket looks orphaned; dry runs; the cron secret |
| Export | `src/lib/db/export.test.ts`, `export-files.test.ts`, `export-zip.test.ts`, `src/app/api/export/route.test.ts` | Whole-library and per-collection data, the ZIP returned as a stream, its folders, extensions and safe unique names, `zipPath`, never reading another user's object |
| Import | `src/actions/import.test.ts`, `src/lib/import-utils.test.ts`, `zip-import.test.ts`, `zip-restore.test.ts`, `src/app/api/import/route.test.ts` | Manifest validation, duplicates, dates, Free limits, input hardening; ZIP signature, size caps while inflating, restoring files through the upload checks, rollback cleanup |
| Accounts | `src/lib/credentials.test.ts`, `tokens.test.ts`, `src/app/api/auth/*/route.test.ts`, `src/actions/settings.test.ts` | The login limit, unknown and GitHub-only accounts answering like a wrong password, unverified email; hashed single-use tokens under a race; register, verify, resend, forgot (the same answer for every address), reset, change password, delete account (subscription and storage failures); name and editor-preference updates |
| Billing | `src/app/api/stripe/*/route.test.ts`, `src/app/api/webhooks/stripe/route.test.ts` | Checkout and portal guards, `409` for Pro users, signature verification, the `metadata.app` tag, plan sync |
| Demo account | `src/lib/demo.test.ts`, `src/app/api/cron/reset-demo/route.test.ts` | The account check and its item limits; the daily reset: secret handling, no demo account, failures |
| Security plumbing | `src/lib/csp.test.ts`, `security-headers.test.ts`, `same-origin.test.ts`, `rate-limit.test.ts`, `validation.test.ts` | The policy (no third-party script, no eval, `connect-src 'self'`), which rule applies to which path, the cross-site check, rate-limit fallbacks and client-IP rules, `safeCallbackPath` and `safeUrlSchema` |
| Operations | `src/lib/monitoring.test.ts`, `monitoring-start.test.ts`, `db-url.test.ts`, `db-safety.test.ts` | What is stripped from an error event, Sentry off without a DSN, `sslmode` rewriting, the guard on destructive scripts |
| Extension download | `src/lib/extension-package.test.ts`, `src/app/api/extension/download/route.test.ts` | ZIP contents, localhost stripped in production, Pro only |
| Pages and theme | `src/app/robots.test.ts`, `src/app/theme-contrast.test.ts`, `src/app/api/items/[id]/route.test.ts` | `robots.txt` and the sitemap never overlap; the light theme's tokens meet WCAG AA; the drawer's item fetch |
| Small helpers | `src/lib/detect-language.test.ts`, `explanation-store.test.ts`, `utils/date.test.ts`, `utils/color.test.ts`, `constants/editor.test.ts` | Language detection for each picker language, the browser-side explanation cache, relative dates, readable type colours, editor defaults |

## Conventions

- Tests sit next to the code: `foo.ts` → `foo.test.ts`. `vitest.config.ts` only picks up `src/**/*.test.ts`.
- Prisma, `auth()`, OpenAI, R2 and Upstash are mocked with `vi.mock`, so tests never touch the network or a database and need no environment variables.
- Assert on the `ActionResult` (`success`, `error`, `data`), not on implementation details.
- The `@/` alias works in tests.

## Checked by hand

Check these by hand when a change touches them:

- Route handlers are unit-tested, but not against real services (R2, Stripe, Resend); try those in test mode. The route tests show the pattern: call the exported `GET` / `POST` with a `Request`, and mock `@/auth` or `@/lib/api-auth`, Prisma and the library underneath.
- The browser extension (`extension/`): load it unpacked and try it. See [`extension/README.md`](../../extension/README.md).
- The desktop app (`desktop/`): `cd desktop && npm test` runs its 44 `node:test` tests (type guessing, the API client and body builders, the file rules, the config store). They're separate from Vitest and aren't part of `npm run test` at the root. The tray, shortcut and windows are checked by running `npm start` there. See [`desktop/README.md`](../../desktop/README.md).
- NextAuth callbacks and `proxy.ts`.
- Components, layout and responsive behaviour, including `prefers-reduced-motion`.
- Real integrations: Stripe (use `stripe listen` and a test card), R2, Resend, OpenAI.

The [deployment smoke test](../deployment/smoke-test.md) is the end-to-end checklist.

## Coverage and CI

```bash
npm run test:coverage   # same tests, plus a v8 coverage report in coverage/ (git-ignored)
```

Coverage covers `src/actions`, `src/lib` and `src/app/api` (components are checked in the browser). `vitest.config.ts` sets a floor of 80% statements, branches and lines and 70% functions, under today's numbers (about 85 / 85 / 85 / 76); a run below it fails. Raise the floor when coverage grows, never lower it to make a change pass.

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: `npm ci`, `npm audit --omit=dev --audit-level=high`, lint, tests with the coverage floor, and a build with placeholder variables. The coverage report is uploaded as a build artifact.

## Before pushing

```bash
npm run lint && npm run test && npm run build
```

`npm run build` also runs `prisma generate` and a full type-check. It needs the variables from `.env.example` to exist, but placeholders are enough.
