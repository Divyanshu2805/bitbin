# Contributing to BitBin

## Before you start

- Get the app running locally: [local development](docs/local-development/README.md). Only PostgreSQL is required; every other service switches on one area of the app.
- Skim the [architecture overview](docs/architecture/README.md), and use [where do I change…?](docs/architecture/where-to-change.md) to find the code for a task.
- Read the [security guardrails](docs/practices/security-guardrails.md). A change that weakens one is not accepted as a workaround; raise the problem instead.

## Workflow

1. Branch from `main`, one short-lived branch per change (`feat/…`, `fix/…`, `docs/…`).
2. Make the change, with tests for new server code ([testing](docs/practices/testing.md)), and try it in the browser.
3. Run the checks below.
4. Open a pull request against `main`. CI runs the dependency audit, lint, the tests with the coverage floor, and the build.
5. Merge. Vercel deploys every push to `main` to production, so a schema change the code needs must be applied to production **first** ([releasing a schema change](docs/deployment/vercel.md#releasing-a-schema-change)).

## Checks

```bash
npm run lint && npm run test && npm run build   # what CI runs, without the audit
npm run test:coverage                           # fails below the floor in vitest.config.ts
cd desktop && npm test                          # when desktop/ changed
```

The full checklist is the [definition of done](docs/practices/definition-of-done.md): Free and Pro accounts, phone width, keyboard use, and docs updated in the same change.

## Conventions

- **Code style:** see [coding conventions](docs/practices/coding-conventions.md). In short: writes are server actions that check the session, validate with Zod, apply plan and rate limits, call a `lib/db` function scoped by the user id, and return an `ActionResult`.
- **Schema changes** are new Prisma migrations, never `db push` and never edits to applied ones ([migrations](docs/schema/migrations-and-seeding.md)).
- **The token API** (`/api/v1`) has external clients; changes stay backward compatible ([changing this API](docs/api/token-api.md#changing-this-api)).
- **The extension**: bump `version` in `extension/manifest.json` with every change. **The desktop app**: keep `desktop/src/guess.js` in step with `extension/lib.js`.
- **Secrets** are environment variables. Never commit `.env`; `.env.example` holds placeholders only.
- **Docs:** a change that makes any page in `docs/` inaccurate updates it in the same commit.

## Commit messages

One line, [Conventional Commits](https://www.conventionalcommits.org/) style, no scope:

```
feat: export a single collection
fix: keep the drawer open after saving
docs: document the files endpoint
chore: raise the coverage floor
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.

## Known pitfalls

Several traps in this stack fail silently: a provider configured in `auth.ts` but not `auth.config.ts`, a type re-exported from a `'use server'` file, a migration that wasn't applied before the deploy. If something "should work" but doesn't, check [known pitfalls](docs/practices/gotchas/README.md) first.
