# Commands

Every script in `package.json`.

## App

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server on <http://localhost:3000> |
| `npm run build` | `prisma generate && next build` — generate the Prisma client, type-check and build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Tests

| Command | What it does |
|---|---|
| `npm run test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Single run with a v8 coverage report (`coverage/`, git-ignored). Fails if a total drops below the floor in `vitest.config.ts` |
| `npx vitest run src/actions/items.test.ts` | One file |
| `npx vitest run -t "deleteItem server action"` | Tests whose name matches |

See [testing](../practices/testing.md) for what's covered and how CI runs it. The desktop app's tests are separate: `cd desktop && npm test`.

## Before you push

```bash
npm run lint && npm run test && npm run build
```

CI runs the same three, plus `npm audit --omit=dev --audit-level=high` and the coverage floor, on every push to `main` and every pull request.

## Database

| Command | What it does |
|---|---|
| `npm run db:migrate` | `prisma migrate dev` — create a migration from schema changes and apply it locally |
| `npm run db:migrate:deploy` | `prisma migrate deploy` — apply pending migrations (production, CI) |
| `npm run db:generate` | `prisma generate` — regenerate the client without touching the database |
| `npm run db:seed` | Seed the seven system item types and the demo account (`demo@bitbin.dev` / `12345678`). Overwrites the demo account, so it refuses to run until the database is in `SAFE_DATABASE_HOSTS` or confirmed with `CONFIRM_DATABASE_HOST` ([details](resetting-data.md#before-you-run-either-script)) |
| `npm run db:studio` | Open Prisma Studio to browse and edit rows |
| `npm run db:test` | Connectivity check against `DATABASE_URL` (`scripts/test-db.ts`) |
| `npm run db:cleanup` | Delete every user except the demo user (`scripts/cleanup-users.ts`) — development only. Refuses to run until the database is in `SAFE_DATABASE_HOSTS` or confirmed with `CONFIRM_DATABASE_HOST` ([details](resetting-data.md#before-you-run-either-script)) |
| `npm run db:push` | **Disabled on purpose** — exits with an error. Use `db:migrate` |

## Related

- [Setup](setup.md) · [Resetting data](resetting-data.md)
