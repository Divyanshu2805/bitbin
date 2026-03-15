# CLAUDE.md

Guidance for AI coding agents working in this repository. It exists so an agent can be productive without re-deriving context each session. Keep it short, and **update it in the same change whenever a convention, command or lesson changes** — a stale working agreement is worse than none.

## Project overview

BitBin is a personal store for developer knowledge — snippets, prompts, commands, notes, files, images and links — organized into collections, tagged, and searchable with ⌘K. Free and Pro plans (Stripe); Pro adds files, images, AI helpers and ZIP export.

- **One Next.js 16 App Router app**, React 19, TypeScript 5. No separate API server.
- PostgreSQL (Neon) through Prisma 7 with the pg driver adapter; NextAuth v5 with JWT sessions; Tailwind v4 + shadcn/ui.
- Services: Cloudflare R2 (files), Upstash Redis (rate limits), Stripe, OpenAI or any OpenAI-compatible provider, Resend, GitHub OAuth. Deployed on Vercel at bitbin.divyanshuagrahari.dev.

## Read before acting

These are authoritative and kept current:

| Need | Read |
|---|---|
| Layers, module map, request flows, "where do I change X" | [`docs/architecture/`](docs/architecture/README.md) |
| Why the app is shaped as it is | [`docs/architecture/decisions/`](docs/architecture/decisions/README.md) |
| Security boundaries and where they're enforced | [`docs/architecture/security-model.md`](docs/architecture/security-model.md) |
| Tables, item types, migrations | [`docs/schema/`](docs/schema/README.md) |
| Every route handler and server action, errors, rate limits | [`docs/api/`](docs/api/README.md) |
| Setup, configuration, troubleshooting | [`docs/local-development/`](docs/local-development/README.md) |
| Constraints, trade-offs, what isn't built yet | [`docs/known-gaps/`](docs/known-gaps/README.md) |
| Vercel, provider callbacks | [`docs/deployment/`](docs/deployment/README.md) |

`docs/architecture/design-notes/` holds historical planning write-ups — don't treat them as current. If a change would make any other doc inaccurate, **update that doc in the same change**.

## Repository structure

```
src/
  app/                pages (RSC) and api/ route handlers; (auth)/ group for the sign-in pages
  actions/            server actions — every UI write: items, collections, ai, api-tokens, search, settings, import, export, auth
  auth.ts             NextAuth: adapter, providers, jwt/session callbacks (isPro re-read every evaluation)
  auth.config.ts      edge-safe subset for proxy.ts only
  proxy.ts            guards /dashboard/* — other pages call auth() themselves
  lib/db/             queries, every one scoped by userId
  lib/                action-utils (ActionResult, getAuthedSession, requirePro), validation, usage (Free limits),
                      rate-limit, tokens, api-tokens + api-auth (/api/v1 Bearer tokens), item-create + ai-tags
                      (shared by actions and /api/v1), extension-package (Settings ZIP download), stripe, r2, openai, email, constants/
  components/         ui/ (shadcn), layout/, items/, dashboard/, collections/, search/, settings/, shared/, homepage/
  generated/prisma/   generated client — git-ignored
prisma/               schema.prisma, migrations/, seed.ts
extension/            Chrome/Edge MV3 extension, plain JS, outside the Next build (tsconfig/eslint exclude it);
                      served as a ZIP from Settings; bump manifest.json version on every change
scripts/              test-db.ts, cleanup-users.ts
docs/                 documentation — start at docs/README.md
```

## Commands

```bash
npm run dev                                   # http://localhost:3000
npm run lint && npm run test && npm run build # before every push
npm run db:migrate                            # schema change → new migration (never db push)
npm run db:seed                               # system item types + demo@bitbin.dev / 12345678
npx vitest run src/actions/items.test.ts      # one test file
```

## Rules that are easy to break

- **The user id comes from the session only** — `getAuthedSession()` in actions, `auth()` elsewhere. Never from input.
- **Every query is scoped by `userId`**, and ids or URLs from the client that reference other rows or R2 objects must be checked for ownership too.
- **Writes are server actions returning `ActionResult`** — session, Zod `safeParse`, plan / rate-limit checks, `lib/db` call. Never throw to the client.
- **Plan limits are enforced on the server** (`lib/usage.ts`, `requirePro`, `isPro` checks); the UI only mirrors them.
- **Schema changes are migrations.** The Vercel build doesn't run them.
- **Pages outside `/dashboard` must call `auth()` and redirect** — the proxy doesn't cover them.
- **After a mutation, `router.refresh()`** — actions don't revalidate.
- **The Stripe webhook verifies the raw body** before doing anything, and only acts on checkouts tagged `metadata.app = STRIPE_APP_TAG`.
- **A NextAuth provider change goes in both `auth.ts` and `auth.config.ts`** — e.g. GitHub's `issuer` override.
- **`/api/v1/*` is the token API** — every handler starts with `authenticateApiRequest`, reuses the shared lib logic (`item-create`, `ai-tags`) instead of forking it, and stays backward compatible: the extension depends on it.
- **After `npm run db:migrate`, run `npm run db:generate`** — Prisma 7 doesn't regenerate the client on migrate.

## Practices

The following are imported in full.

@docs/practices/security-guardrails.md

@docs/practices/coding-conventions.md

@docs/practices/testing.md

@docs/practices/definition-of-done.md

## Known pitfalls

Silent-failure traps this stack has hit, imported in full. Check here first when something "should work" but doesn't.

@docs/practices/gotchas/nextjs-and-auth.md

@docs/practices/gotchas/prisma.md

@docs/practices/gotchas/integrations.md

## Commits

Commit messages are a single line in semantic-commit format (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, optionally scoped like `docs(api):`), with no mention of Claude or AI and no Co-Authored-By trailer.
