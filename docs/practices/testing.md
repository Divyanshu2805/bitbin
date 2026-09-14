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
| `src/actions/items.test.ts` | Create / update / delete, Pro gating for files and images, the Free item cap, tag filtering, collection links |
| `src/actions/collections.test.ts` | CRUD, favorite toggle, the Free collection cap |
| `src/actions/import.test.ts`, `export.test.ts` | Manifest format, validation, duplicate detection, Free limits |
| `src/actions/search.test.ts` | Search data shape |
| `src/actions/settings.test.ts` | Editor preference validation |
| `src/lib/db/items.test.ts`, `collections.test.ts` | Query shaping, ownership, dominant colour |
| `src/lib/r2.test.ts` | File validation, size formatting, key parsing |
| `src/lib/rate-limit.test.ts` | Failing open with unset, placeholder and invalid Upstash config |
| `src/lib/usage.test.ts` | Free / Pro limits |
| `src/lib/utils/date.test.ts` | Relative date formatting |
| `src/lib/constants/editor.test.ts` | Editor preference defaults and merging |

## Conventions

- Tests sit next to the code: `foo.ts` → `foo.test.ts`. `vitest.config.ts` only picks up `src/**/*.test.ts`.
- Prisma, `auth()`, OpenAI, R2 and Upstash are mocked with `vi.mock`, so tests never touch the network or a database and need no environment variables.
- Assert on the `ActionResult` (`success`, `error`, `data`), not on implementation details.
- The `@/` alias works in tests.

## Not covered by tests

Check these by hand when a change touches them:

- Route handlers — auth flows, upload / download, export, Stripe checkout and webhook. Adding tests for these is [tracked](../known-gaps/not-yet-built.md#code-health).
- NextAuth callbacks and `proxy.ts`.
- Components, layout and responsive behaviour, including `prefers-reduced-motion`.
- Real integrations: Stripe (use `stripe listen` and a test card), R2, Resend, OpenAI.

The [deployment smoke test](../deployment/smoke-test.md) is the end-to-end checklist.

## Before pushing

```bash
npm run lint && npm run test && npm run build
```

`npm run build` also runs `prisma generate` and a full type-check. It needs the variables from `.env.example` to exist, but placeholders are enough.
