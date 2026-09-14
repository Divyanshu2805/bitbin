# Contributing to BitBin

Thanks for helping. This page is the workflow; how code is written is in [engineering practices](docs/practices/README.md).

## Getting set up

Follow [local development](docs/local-development/README.md). You need Node.js 20+, npm and a PostgreSQL database; every other service is optional.

## Making a change

1. Branch from `main` — `feat/…`, `fix/…`, `docs/…`.
2. Read the relevant pages first: the [architecture flow](docs/architecture/README.md) for the area, the [coding conventions](docs/practices/coding-conventions.md) and the [security guardrails](docs/practices/security-guardrails.md).
3. Make the change, with tests next to any action or library code you touch ([testing](docs/practices/testing.md)).
4. Schema changes go through `npm run db:migrate`; commit the generated migration. Never `db push`.
5. Update every doc the change makes inaccurate, in the same change.
6. Run the checks:

   ```bash
   npm run lint && npm run test && npm run build
   ```

7. Walk through the [definition of done](docs/practices/definition-of-done.md).

## Commits

One line, in semantic-commit form: `type: description`, optionally scoped.

```
feat: add archived flag to items
fix(auth): rate limit credentials sign-in on the server
docs(api): document the export format
chore: bump prisma to 7.4
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## Pull requests

- Describe what changed and why, and how you checked it — especially anything tested by hand (Stripe, uploads, email).
- Note any new environment variable, migration, or provider setting a deploy will need.
- Keep unrelated changes out; a follow-up PR is cheap.

## Reporting issues

Bugs and ideas go in GitHub issues. Security problems don't — see [`SECURITY.md`](SECURITY.md).
