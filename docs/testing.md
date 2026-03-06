# Testing

Unit tests use **Vitest** in a Node environment (`vitest.config.ts`). They
cover server actions and library code. React components aren't unit-tested.
Check those in the browser.

```bash
npm run test         # single run (CI)
npm run test:watch   # watch mode
```

## What's covered

| File | Focus |
| --- | --- |
| `src/actions/items.test.ts` | Create/update/delete, Pro gating for file/image, free-tier item cap |
| `src/actions/collections.test.ts` | CRUD, favorite toggle, collection cap |
| `src/actions/ai.test.ts` | Auth + Pro guards, validation, rate limit, OpenAI response parsing |
| `src/actions/search.test.ts` | Search data shape |
| `src/actions/settings.test.ts` | Editor preference validation |
| `src/actions/import.test.ts` / `export.test.ts` | Manifest format, duplicate detection, limits |
| `src/lib/db/items.test.ts` / `collections.test.ts` | Query shaping, dominant color |
| `src/lib/r2.test.ts` | File validation, size formatting, key parsing |
| `src/lib/usage.test.ts` | Free/Pro limits |
| `src/lib/utils/date.test.ts` | Relative date formatting |
| `src/lib/constants/editor.test.ts` | Editor preference defaults/merging |

## Conventions

- Test files sit next to the code: `foo.ts` → `foo.test.ts`.
- Prisma, `auth()`, OpenAI, R2 and Upstash are mocked with `vi.mock`, so
  tests never touch the network or a database.
- Assert on the `ActionResult` shape (`success`, `error`, `data`) rather than
  implementation details.
- The `@/` alias works in tests (configured in `vitest.config.ts`).

## Before pushing

```bash
npm run lint && npm run test && npm run build
```

`npm run build` also runs `prisma generate` and a full type-check. It needs the
env vars from `.env.example` to exist, but placeholders are enough to build.
