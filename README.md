<p align="center">
  <img src="docs/assets/banner.svg" alt="BitBin" width="820" />
</p>

<p align="center">
  <b>Every snippet, prompt &amp; command, in one bin.</b><br/>
  A fast, searchable home for developer knowledge.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-0a0b0d?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-0a0b0d?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-0a0b0d?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-7-0a0b0d?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-0a0b0d?logo=tailwindcss" alt="Tailwind" />
</p>

<p align="center">
  <a href="https://bitbin.divyanshuagrahari.dev"><b>bitbin.divyanshuagrahari.dev</b></a>
</p>

---

Developers keep their essentials scattered across editor snippets, browser
bookmarks, chat threads, shell history and random folders. **BitBin** pulls
all of it into one place: organized, tagged and a keystroke away.

## Features

**Core**
- Save code snippets, AI prompts, terminal commands, notes and links
- Upload files and images (Pro)
- Organize items into collections (an item can belong to many collections)
- Pin, favorite and tag items for quick access
- Monaco code editor with syntax highlighting for 30+ languages
- Markdown editor with GitHub-flavored preview
- Global command palette search (<kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd>)
- Dark-first "graphite + lime" interface with subtle motion

**AI (Pro)**
- Auto-tag suggestions
- Description generator
- "Explain this code"
- Prompt optimizer

**Platform**
- Email/password and GitHub OAuth sign-in
- Email verification and password reset
- Rate limiting on auth, upload and AI endpoints
- Stripe subscriptions (Free / Pro)
- File storage on Cloudflare R2
- Import/export (JSON on Free, ZIP with files on Pro)
- Pagination, responsive layout from phone to desktop

## Tech stack

| Area          | Choice                          |
| ------------- | ------------------------------- |
| Framework     | Next.js 16 (App Router), React 19 |
| Language      | TypeScript 5                    |
| Database      | PostgreSQL (Neon)               |
| ORM           | Prisma 7                        |
| Auth          | NextAuth v5 (JWT sessions)      |
| Styling       | Tailwind CSS v4 + shadcn/ui     |
| AI            | OpenAI                          |
| Payments      | Stripe                          |
| File storage  | Cloudflare R2                   |
| Rate limiting | Upstash Redis                   |
| Email         | Resend                          |
| Tests         | Vitest                          |

## Quick start

```bash
git clone https://github.com/Divyanshu2805/bitbin.git
cd bitbin
npm install
cp .env.example .env      # then fill in the placeholders
npx prisma migrate dev    # create the schema
npm run db:seed           # seed system item types + demo data
npm run dev
```

Open <http://localhost:3000>.

> **Credentials:** `.env.example` only contains placeholders (`YOUR_...`).
> Real keys for the database, auth, Stripe, R2, Resend, Upstash and OpenAI
> have to be added to `.env` before the related features work. See
> [docs/environment-variables.md](docs/local-development/configuration.md).

## Scripts

| Command              | What it does                         |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the dev server                 |
| `npm run build`      | Generate Prisma client + production build |
| `npm run start`      | Serve the production build           |
| `npm run lint`       | ESLint                               |
| `npm run test`       | Vitest (single run)                  |
| `npm run test:watch` | Vitest in watch mode                 |
| `npm run db:migrate` | Create/apply migrations              |
| `npm run db:seed`    | Seed item types and demo content     |
| `npm run db:studio`  | Open Prisma Studio                   |

## Documentation

Everything lives in [`docs/`](docs/README.md):

- [Getting started](docs/local-development/README.md) · [Environment variables](docs/local-development/configuration.md)
- [Architecture](docs/architecture/README.md) · [Database](docs/schema/README.md) · [Authentication](docs/architecture/flows/authentication.md)
- [Items](docs/architecture/flows/items.md) · [Item types](docs/schema/item-types.md) · [Collections](docs/architecture/flows/collections.md) · [Search](docs/architecture/flows/search.md)
- [File uploads](docs/architecture/flows/file-uploads.md) · [AI features](docs/architecture/flows/ai-features.md) · [Billing](docs/architecture/flows/billing.md)
- [Rate limiting](docs/api/errors-and-rate-limits.md) · [Import & export](docs/architecture/flows/import-export.md)
- [Design system](docs/design-system.md) · [Testing](docs/testing.md) · [Deployment](docs/deployment.md)
- [Known gaps & roadmap](docs/known-gaps/README.md)

## Project structure

```
src/
├── app/
│   ├── (auth)/        # sign-in, register, verify, password reset (split-screen layout)
│   ├── api/           # route handlers: auth, upload, download, export, stripe
│   ├── collections/   # collection list + detail
│   ├── dashboard/     # main dashboard
│   ├── favorites/     # starred items & collections
│   ├── items/[type]/  # items by type (/items/snippets, ...)
│   ├── profile/ settings/ upgrade/
│   └── page.tsx       # marketing homepage
├── actions/           # server actions (items, collections, ai, search, import/export)
├── components/
│   ├── ui/            # shadcn/ui primitives
│   ├── homepage/      # marketing sections
│   ├── layout/        # top bar, sidebar, mobile sidebar
│   ├── dashboard/     # stat cards, item & collection cards
│   ├── items/         # drawer, editors, dialogs, uploads
│   └── shared/        # logo, empty states, page header, etc.
├── lib/               # prisma, db queries, stripe, r2, openai, rate limiting
├── hooks/
└── types/
```
