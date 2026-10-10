# Module Map

What lives where, and the rules for which layer may call which.

## Folders

```
src/
├── app/
│   ├── (auth)/            sign-in, register, verify-email, forgot-password, reset-password: one split-screen layout
│   ├── (app)/             every signed-in page; layout.tsx renders the shell (sidebar, top bar, status bar,
│   │                      backdrop) once and keeps it mounted, loading.tsx fills only the content area
│   │   ├── dashboard/     stats, collections, pinned and recent items (+ error.tsx)
│   │   ├── items/[type]/  items of one type: /items/snippets, /items/prompts, …
│   │   ├── collections/   paginated list and /collections/[id]
│   │   ├── favorites/     starred items and collections
│   │   └── profile/, settings/, upgrade/
│   ├── api/
│   │   ├── auth/          [...nextauth], register, verify, resend-verification, forgot-password,
│   │   │                  reset-password, change-password, delete-account
│   │   ├── items/[id]/    the full item for the drawer
│   │   ├── upload/ (+ part/), download/[...path]/   file transfer: whole or in parts; streamed reads
│   │   ├── export/, import/               JSON and ZIP export; ZIP import
│   │   ├── extension/download/            the browser extension as a ZIP
│   │   ├── stripe/, webhooks/stripe/      checkout, portal, webhook
│   │   ├── v1/            the token API: me, collections, items, files, ai/tags, ai/description
│   │   └── cron/          reset-demo (daily), sweep-files (weekly)
│   ├── page.tsx           marketing homepage
│   ├── privacy/, terms/   public Privacy Policy and Terms of Service (shared `LegalPage` frame)
│   ├── robots.ts, sitemap.ts, opengraph-image.tsx, twitter-image.tsx, apple-icon.tsx, favicon.ico, icon.svg
│   ├── layout.tsx         fonts, ThemeProvider (next-themes, dark default), Toaster, Vercel Analytics
│   ├── globals.css        design tokens and motion utilities
│   └── theme-contrast.test.ts   holds the light theme's colour tokens to WCAG AA
├── actions/               server actions: items, collections, tags, ai, api-tokens, search, settings, import, auth
├── auth.ts, auth.config.ts   NextAuth: the full config, and the edge-safe subset used by proxy.ts
├── proxy.ts               guards /dashboard/*
├── instrumentation.ts     starts Sentry (only when SENTRY_DSN is set) and reports errors Next.js catches
├── components/
│   ├── ui/                shadcn/ui primitives
│   ├── layout/            the app shell: sidebar, mobile sidebar, top bar, status bar, user menu, app shortcuts
│   ├── dashboard/         bin overview, quick create, item and collection cards, sections
│   ├── items/             drawer, rows, editors, new-item dialog, file upload and viewers, AI buttons,
│   │                      collection picker, drag and drop
│   ├── collections/, favorites/, profile/, search/, auth/
│   ├── settings/          editor, billing, extension (API tokens), desktop, tags, data (import / export), account
│   ├── homepage/          marketing sections (PascalCase files)
│   └── shared/            logo, empty state, page header, panel, usage meter, pagination, confirm dialogs, …
├── lib/
│   ├── db/                every query: items, collections, tags, search, users, accounts, billing, api-tokens,
│   │                      verification-tokens, export, import, files, demo, auth-adapter
│   ├── constants/         plan limits, pricing copy, pagination, session lifetime, item types, editor,
│   │                      keyboard shortcuts, desktop download links
│   ├── utils/             date and colour helpers
│   ├── prisma.ts          the Prisma client (pg adapter, one per process); imported only by lib/db
│   ├── action-utils.ts    ActionResult, getAuthedSession, requirePro, checkActionRateLimit
│   ├── validation.ts      shared Zod schemas and size caps, safe URLs, ids, `safeCallbackPath`
│   ├── usage.ts, limit-error.ts         Free plan limits, and the locked count-then-insert that enforces them
│   ├── rate-limit.ts      Upstash limiters, the in-memory fallback and the client-IP rules
│   ├── tokens.ts, credentials.ts        hashed single-use email tokens; the email-and-password sign-in check
│   ├── api-tokens.ts, api-auth.ts, api-scopes.ts   personal access tokens, the /api/v1 Bearer check, permissions
│   ├── item-create.ts     item creation shared by the action and /api/v1
│   ├── ai-tags.ts, ai-description.ts, ai-json.ts, openai.ts   AI helpers shared by actions and /api/v1, the client
│   ├── file-ingest.ts, image-sanitize.ts, r2.ts, file-url.ts  every upload check, photo re-encoding, storage,
│   │                                                          view and download paths
│   ├── upload-parts.ts    part size, ids and keys for uploads larger than one request
│   ├── export-files.ts, export-zip.ts, zip-format.ts          the readable files in a ZIP export, the ZIP itself
│   ├── import-schema.ts, import-utils.ts, zip-import.ts, zip-restore.ts   the import format, duplicates,
│   │                                                          reading and restoring a ZIP
│   ├── keyset.ts          cursor pagination for every list
│   ├── orphan-sweep.ts, cron-auth.ts    the weekly file sweep; the cron routes' secret check
│   ├── detect-language.ts, explanation-store.ts   language guessing; code explanations kept in the browser
│   ├── extension-package.ts             zips extension/ for the Settings download
│   ├── demo.ts            the public demo account: `isDemoEmail` and what it may not save
│   ├── csp.ts, same-origin.ts           the Content Security Policy; `rejectCrossSite`
│   ├── monitoring.ts      Sentry setup and the scrubbing of personal data from events
│   ├── db-safety.ts, db-url.ts          the guard on destructive scripts; `sslmode` normalisation
│   ├── site.ts            site name, description, public origin, and which paths crawlers may index
│   ├── view-mode.ts, view-mode-script.ts, view-transition.ts, smooth-scroll.ts   grid / list, page slides, scrolling
│   └── stripe.ts, stripe-client.ts, email.ts, resend.ts, utils.ts
├── hooks/                 use-clipboard, use-hotkey, use-motion, use-sidebar-collapsed, use-typewriter
├── types/                 next-auth session augmentation, CSS import types
└── generated/prisma/      generated client (git-ignored)
prisma/                    schema.prisma, migrations/ (9), seed.ts and demo-content.ts (the demo library)
scripts/                   cleanup-users.ts, copy-monaco.mjs (copies the code editor into public/monaco)
public/monaco/             generated, git-ignored: the Monaco editor served from our own origin
extension/                 the Chrome / Edge extension (plain JS, outside the Next build)
desktop/                   the Electron tray app (plain CommonJS, own package.json and tests, outside the Next build)
.github/workflows/         ci.yml (audit, lint, tests with the coverage floor, build); desktop-release.yml
vercel.json                the two crons: the daily demo reset and the weekly file sweep
```

## Routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | Static | Marketing homepage |
| `/privacy`, `/terms` | Static | Public legal pages; no session needed |
| `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/twitter-image`, `/apple-icon` | Static | Generated at build time from `lib/site.ts` |
| `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Static | The `(auth)` split-screen layout |
| `/sign-in` | Dynamic | Same layout; reads `?via=` from the URL, so it renders per request |
| `/dashboard` | Dynamic | Stats, collections, pinned and recent items |
| `/items/[type]` | Dynamic | `snippets`, `prompts`, `commands`, `notes`, `files`, `images`, `links`, paginated by cursor |
| `/collections`, `/collections/[id]` | Dynamic | Paginated list and detail |
| `/favorites` | Dynamic | Starred items and collections |
| `/profile`, `/settings`, `/upgrade` | Dynamic | Usage and name; editor, billing, tokens, desktop app, tags, data and account; plans |

Route handlers are listed in the [API reference](../api/README.md).

## Layering rules

```
page / client component
   ├─► server action ─► lib/db ─► Prisma
   │         └────────► lib/{item-create, ai-*, rate-limit, usage}
   └─► fetch ─► route handler ─► lib/db, lib/{file-ingest, r2, stripe, email, tokens, rate-limit}

extension / desktop app ─► /api/v1 ─► authenticateApiRequest ─► the same lib functions as the actions
```

- **Queries belong in `lib/db`.** Nothing else imports `lib/prisma.ts`; the NextAuth adapter gets the client through `createAuthAdapter()` (`lib/db/auth-adapter.ts`).
- **Components never call `lib/db` functions.** They may import its types. Client components call a server action; server pages call `lib/db` directly.
- **Every `lib/db` function takes the user id as a parameter**, and every query filters by it. The user id comes from the session or the API token, never from request input. The exceptions are deliberate and named: the API token lookup (the token is what identifies the user), and the cron jobs (`resetDemoAccount`, `getAllReferencedFileUrls`).
- **One path per behaviour.** Item creation (`item-create.ts`), the AI helpers (`ai-tags.ts`, `ai-description.ts`) and file checks (`file-ingest.ts`) are shared by the actions, the upload route, the ZIP import and `/api/v1`, so a new way in can't skip a check.
- **Integration wrappers stay thin.** Business rules (who may upload, what's rate limited) live in the action or route handler, not in `lib/r2.ts` or `lib/openai.ts`.
- **Client state is small React contexts**, not a global store: `ItemDrawerProvider`, `SearchProvider`, `EditorPreferencesProvider`. After a mutation, components call `router.refresh()` so server components re-fetch.

## Related

- [Where do I change…?](where-to-change.md): the same map, organised by task.
- [Coding conventions](../practices/coding-conventions.md)
