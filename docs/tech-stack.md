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
| Editors | Monaco (`@monaco-editor/react`, runtime copied to `public/monaco` and served from the app's own origin), `react-markdown` + `remark-gfm` | Code items and markdown items |
| Search UI | `cmdk` | The ⌘K command palette |
| Icons, toasts | Lucide, Sonner | |
| Motion | Lenis (smooth scrolling on the homepage), CSS View Transitions, CSS animations | Page slides, scroll reveals, card and button effects; all off under `prefers-reduced-motion` |
| Theming | `next-themes` | Dark by default, light available |

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
| Image processing | `sharp` | Re-encoding uploaded photos to strip metadata and refuse non-images |
| Bot check, malware lookup | Cloudflare Turnstile, VirusTotal (both optional) | Register / forgot-password, uploads |
| Error monitoring | Sentry (`@sentry/nextjs`) | Server errors and `console.error`, with personal data stripped; off until `SENTRY_DSN` is set |
| Hosting | Vercel + `@vercel/analytics` | Builds, serverless runtime, a daily cron for the demo reset, page analytics |

## Clients outside the web app

| Area | Choice | Used for |
|---|---|---|
| Browser extension | Chrome / Edge Manifest V3, plain JavaScript (`extension/`) | Saving a selection from any page through the [token API](api/token-api.md) (Pro) |
| Desktop app | Electron, plain CommonJS (`desktop/`) | A tray app whose global shortcut saves the clipboard through the same token API |

Both sit outside the Next build and have their own tests and READMEs.

## Tooling

| Area | Choice |
|---|---|
| Tests | Vitest 4 (Node environment) with `@vitest/coverage-v8`; `node:test` for `desktop/` |
| Lint | ESLint 9 with `eslint-config-next` |
| CI | GitHub Actions: audit, lint, tests with a coverage floor, build ([workflow](../.github/workflows/ci.yml)) |
| Scripts | `tsx` for `prisma/seed.ts` and `scripts/*.ts` |

## Related

- [Architecture](architecture/README.md) — how these pieces fit together.
- [Local development](local-development/README.md) — which of these you need running to work on BitBin.
