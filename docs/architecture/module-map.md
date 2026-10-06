# Module Map

What lives where, and the rules for which layer may call which.

## Folders

```
src/
├── app/
│   ├── (auth)/            sign-in, register, verify-email, forgot-password, reset-password — share the split-screen layout
│   ├── api/               route handlers: auth/*, items/[id], upload, download/[...path], export, stripe/*, webhooks/stripe, v1/* (token API), extension/download, cron/reset-demo
│   ├── (app)/             every signed-in page; layout.tsx renders the shell (sidebar, top bar, status bar,
│   │                      backdrop) once and keeps it mounted, loading.tsx fills only the content area
│   │   ├── dashboard/     stats, collections, pinned and recent items (+ error.tsx)
│   │   ├── items/[type]/  items of one type: /items/snippets, /items/prompts, …
│   │   ├── collections/   paginated list and /collections/[id]
│   │   ├── favorites/     starred items and collections
│   │   └── profile/, settings/, upgrade/
│   ├── page.tsx           marketing homepage
│   ├── privacy/, terms/   public Privacy Policy and Terms of Service (shared `LegalPage` frame), linked from the footer and sign-up
│   ├── robots.ts, sitemap.ts, opengraph-image.tsx, twitter-image.tsx, apple-icon.tsx, favicon.ico, icon.svg   crawler rules, sitemap, link-preview image and icons
│   ├── layout.tsx         fonts, ThemeProvider (next-themes, dark default), Toaster, Vercel Analytics
│   └── globals.css        design tokens and motion utilities
├── actions/               server actions: items, collections, ai, api-tokens, search, settings, import, export, auth
├── auth.ts, auth.config.ts   NextAuth — full config, and the edge-safe subset used by proxy.ts
├── proxy.ts               guards /dashboard/*
├── instrumentation.ts     starts Sentry (only when SENTRY_DSN is set) and reports errors Next.js catches
├── components/
│   ├── ui/                shadcn/ui primitives
│   ├── layout/            dashboard layout, top bar, sidebar, mobile sidebar, status bar, user menu
│   ├── dashboard/         bin overview, quick create, item and collection cards, sections
│   ├── items/             drawer, item rows, editors, new-item dialog, file upload, AI buttons, collection picker
│   ├── collections/, favorites/, settings/, profile/, auth/, search/
│   ├── homepage/          marketing sections
│   └── shared/            logo, empty state, page header, panel, usage meter, pagination, confirm dialogs, …
├── lib/
│   ├── db/                items, collections, users, export, api-tokens — the app's queries
│   ├── constants/         pagination, plan limits, pricing, item types, editor defaults, keyboard shortcuts
│   ├── utils/             date and colour helpers
│   ├── prisma.ts          the Prisma client (pg adapter, one instance per process)
│   ├── action-utils.ts    ActionResult, getAuthedSession, requirePro, checkAiRateLimit
│   ├── validation.ts      shared Zod helpers (safe URLs, ids, error flattening, `safeCallbackPath`)
│   ├── usage.ts, limit-error.ts   Free plan limits, and the locked count-then-insert that enforces them
│   ├── rate-limit.ts      Upstash limiters
│   ├── tokens.ts          verification and password-reset tokens
│   ├── api-tokens.ts, api-auth.ts   personal access tokens and the /api/v1 Bearer check
│   ├── item-create.ts, ai-tags.ts   item creation and AI tagging shared by actions and /api/v1
│   ├── extension-package.ts   zips extension/ for the Settings download
│   ├── import-utils.ts, export-files.ts   duplicate detection for imports; the readable text files in a ZIP export
│   ├── detect-language.ts, ai-description.ts, explanation-store.ts   language guessing, the shared description helper, browser-side code explanations
│   ├── site.ts            site name, description, public origin, and which paths crawlers may or may not index
│   ├── demo.ts            the public demo account: `isDemoEmail`, the message shown when it is refused
│   ├── monitoring.ts      Sentry setup and the scrubbing of personal data from events
│   ├── db-safety.ts, db-url.ts   the guard on destructive scripts; `sslmode` normalisation for the pg driver
│   ├── file-url.ts        `fileViewPath` / `fileDownloadPath` for stored files (safe for client components)
│   ├── view-mode.ts, view-transition.ts, smooth-scroll.ts   grid / list choice, page slides, homepage momentum scrolling
│   └── stripe.ts, stripe-client.ts, r2.ts, openai.ts, email.ts, resend.ts
├── hooks/                 use-clipboard, use-hotkey, use-motion, use-sidebar-collapsed, use-typewriter
├── types/                 next-auth session augmentation
└── generated/prisma/      generated client (git-ignored)
prisma/                    schema.prisma, migrations/ (7), seed.ts and demo-content.ts (the demo library)
scripts/                   test-db.ts, cleanup-users.ts
extension/                 the Chrome / Edge extension (plain JS, not part of the Next build)
desktop/                   the Electron tray app (plain CommonJS, own package.json and tests, not part of the Next build)
.github/                   workflows/ci.yml (audit, lint, tests with coverage floor, build) and dependabot.yml
vercel.json                the daily cron that resets the demo account
```

## Routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | Static | Marketing homepage |
| `/privacy`, `/terms` | Static | Public legal pages; no session needed |
| `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/twitter-image`, `/apple-icon` | Static | Generated at build time from `lib/site.ts` |
| `/sign-in`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Static | The `(auth)` split-screen layout |
| `/dashboard` | Dynamic | Stats, collections, pinned and recent items |
| `/items/[type]` | Dynamic | `snippets`, `prompts`, `commands`, `notes`, `files`, `images`, `links` — paginated |
| `/collections`, `/collections/[id]` | Dynamic | Paginated list and detail |
| `/favorites` | Dynamic | Starred items and collections |
| `/profile`, `/settings`, `/upgrade` | Dynamic | Account, editor preferences, data, billing |

Route handlers are listed in the [API reference](../api/README.md).

## Layering rules

```
page / client component
   ├─► server action ─► lib/db ─► Prisma
   │         └────────► lib/{openai, r2, rate-limit, usage}
   └─► fetch ─► route handler ─► lib/db, lib/{r2, stripe, email, tokens, rate-limit}
```

- **Queries belong in `lib/db`.** Some older code still imports `prisma` directly — `auth.ts`, `lib/usage.ts`, `lib/tokens.ts`, the import action, the auth / upload / Stripe route handlers, and a few pages (`dashboard`, `items/[type]`, `profile`, `upgrade`) for one-off lookups. New queries go in `lib/db`.
- **Components never call `lib/db` functions** — they may import its types. Client components call a server action; server pages call `lib/db` directly.
- **Every `lib/db` function takes the user id as a parameter**, and every query filters by it. The user id always comes from the session, never from request input.
- **Integration wrappers stay thin.** Business rules (who may upload, what's rate limited) live in the action or route handler, not in `lib/r2.ts` or `lib/openai.ts`.
- **Client state is small React contexts**, not a global store: `ItemDrawerProvider`, `SearchProvider`, `EditorPreferencesProvider`. After a mutation, components call `router.refresh()` so server components re-fetch.

## Related

- [Where do I change…?](where-to-change.md) — the same map, organised by task.
- [Coding conventions](../practices/coding-conventions.md)
