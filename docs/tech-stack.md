# Tech Stack

The languages, frameworks and services BitBin is built on, and what each one is used for. Versions are the ones pinned in `package.json`.

## Application

| Area | Choice | Used for |
|---|---|---|
| Framework | Next.js 16 (App Router) | Pages as React Server Components, server actions, route handlers, `proxy.ts` |
| UI | React 19 with the React Compiler | Client components; `reactCompiler: true` in `next.config.ts` |
| Language | TypeScript 5 | Everything under `src/`, `prisma/` and `scripts/` |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) | Design tokens in `src/app/globals.css`, primitives in `src/components/ui/` |
| Validation | Zod 4 | Every server action and the import format |
| Editors | Monaco (`@monaco-editor/react`), `react-markdown` + `remark-gfm` | Code items and markdown items |
| Search UI | `cmdk` | The ⌘K command palette |
| Icons, toasts | Lucide, Sonner | |

## Data

| Area | Choice | Used for |
|---|---|---|
| Database | PostgreSQL (Neon in production) | All application data |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter | Schema, migrations, generated client in `src/generated/prisma` |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Sliding-window limits on auth, uploads and AI |
| File storage | Cloudflare R2 through `@aws-sdk/client-s3` | File and image item binaries |

## Services

| Area | Choice | Used for |
|---|---|---|
| Authentication | NextAuth v5 (Auth.js) + `@auth/prisma-adapter`, `bcryptjs` | Credentials and GitHub sign-in, JWT sessions |
| Email | Resend | Verification and password-reset emails |
| Payments | Stripe | Checkout (subscriptions), Customer Portal, webhooks |
| AI | OpenAI Responses API, or any OpenAI-compatible provider (default model `gpt-5-nano`) | Auto-tags, descriptions, code explanations, prompt optimization |
| Export | `archiver` | ZIP exports with file binaries |
| Hosting | Vercel + `@vercel/analytics` | Builds, serverless runtime, page analytics |

## Tooling

| Area | Choice |
|---|---|
| Tests | Vitest 4 (Node environment) |
| Lint | ESLint 9 with `eslint-config-next` |
| Scripts | `tsx` for `prisma/seed.ts` and `scripts/*.ts` |

## Related

- [Architecture](architecture/README.md) — how these pieces fit together.
- [Local development](local-development/README.md) — which of these you need running to work on BitBin.
