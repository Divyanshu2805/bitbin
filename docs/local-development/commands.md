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
| `npx vitest run src/actions/items.test.ts` | One file |
| `npx vitest run -t "deleteItem server action"` | Tests whose name matches |

See [testing](../testing.md) for what's covered.

## Database

| Command | What it does |
|---|---|
| `npm run db:migrate` | `prisma migrate dev` — create a migration from schema changes and apply it locally |
| `npm run db:migrate:deploy` | `prisma migrate deploy` — apply pending migrations (production, CI) |
| `npm run db:generate` | `prisma generate` — regenerate the client without touching the database |
| `npm run db:seed` | Create missing system item types and reset the demo account ([seeding](../database.md)) |
| `npm run db:studio` | Open Prisma Studio to browse and edit rows |
| `npm run db:test` | Connectivity check against `DATABASE_URL` (`scripts/test-db.ts`) |
| `npm run db:cleanup` | Delete every user except the demo user (`scripts/cleanup-users.ts`) — development only |
| `npm run db:push` | **Disabled on purpose** — exits with an error. Use `db:migrate` |

## Related

- [Setup](setup.md) · [Resetting data](resetting-data.md)
