# Module Map

What lives where, and the rules for which layer may call which.

## Folders

```
src/
├── app/
│   ├── (auth)/            sign-in, register, verify-email, forgot-password, reset-password — share the split-screen layout
│   ├── api/               route handlers: auth/*, items/[id], upload, download/[...path], export, stripe/*, webhooks/stripe
│   ├── dashboard/         stats, collections, pinned and recent items (+ loading.tsx, error.tsx)
│   ├── items/[type]/      items of one type: /items/snippets, /items/prompts, …
│   ├── collections/       paginated list and /collections/[id]
│   ├── favorites/         starred items and collections
│   ├── profile/, settings/, upgrade/
│   ├── page.tsx           marketing homepage
│   ├── layout.tsx         fonts, <html class="dark">, Toaster, Vercel Analytics
│   └── globals.css        design tokens and motion utilities
├── actions/               server actions: items, collections, ai, search, settings, import, export, auth
├── auth.ts, auth.config.ts   NextAuth — full config, and the edge-safe subset used by proxy.ts
├── proxy.ts               guards /dashboard/*
├── components/
│   ├── ui/                shadcn/ui primitives
│   ├── layout/            dashboard layout, top bar, sidebar, mobile sidebar, user menu
│   ├── dashboard/         stat cards, item and collection cards, sections
│   ├── items/             drawer, editors, new-item dialog, file upload, AI buttons, collection picker
│   ├── collections/, favorites/, settings/, profile/, auth/, search/
│   ├── homepage/          marketing sections
│   └── shared/            logo, empty state, page header, pagination, confirm dialogs, …
├── lib/
│   ├── db/                items, collections, users, export — the app's queries
│   ├── constants/         pagination, pricing, item types, editor defaults
│   ├── utils/             date formatting
│   ├── prisma.ts          the Prisma client (pg adapter, one instance per process)
│   ├── action-utils.ts    ActionResult, getAuthedSession, requirePro, checkAiRateLimit
│   ├── validation.ts      shared Zod helpers (safe URLs, ids, error flattening)
│   ├── usage.ts           Free plan limits
│   ├── rate-limit.ts      Upstash limiters
│   ├── tokens.ts          verification and password-reset tokens
│   └── stripe.ts, stripe-client.ts, r2.ts, openai.ts, email.ts, resend.ts
├── hooks/                 use-clipboard
├── types/                 next-auth session augmentation
└── generated/prisma/      generated client (git-ignored)
prisma/                    schema.prisma, migrations/, seed.ts
scripts/                   test-db.ts, cleanup-users.ts
```

## Routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | Static | Marketing homepage |
| `/sign-in`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Static | The `(auth)` split-screen layout |
| `/dashboard` | Dynamic | Stats, collections, pinned and recent items |
| `/items/[type]` | Dynamic | `snippets`, `prompts`, `commands`, `notes`, `files`, `images`, `links` — paginated |
| `/collections`, `/collections/[id]` | Dynamic | Paginated list and detail |
| `/favorites` | Dynamic | Starred items and collections |
| `/profile`, `/settings`, `/upgrade` | Dynamic | Account, editor preferences, data, billing |

Route handlers are listed in the [API reference](README.md).

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
- [Coding conventions](../README.md)
