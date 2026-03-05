# Architecture

BitBin is a single Next.js 16 App Router application. There is no separate
API server: pages are React Server Components that read from Postgres through
Prisma, and writes go through **server actions** or a small set of **route
handlers**.

```
Browser
  │
  ├── RSC page (app/**/page.tsx) ──► lib/db/* ──► Prisma ──► PostgreSQL
  │
  ├── Client component ──► server action (src/actions/*) ──► lib/db/* ──► Prisma
  │                                   └─► lib/openai.ts (AI)
  │
  └── fetch() ──► route handler (src/app/api/*)
                    ├─ auth flows (register, verify, reset…)
                    ├─ upload / download ──► Cloudflare R2
                    ├─ export ──► JSON / ZIP stream
                    └─ stripe checkout / portal / webhook ──► Stripe
```

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Pages | `src/app/**/page.tsx` | Auth check, parallel data loading, render layout |
| Server actions | `src/actions/*.ts` | Validate input with Zod, check session / Pro / rate limit, call `lib/db` |
| Data access | `src/lib/db/*.ts` | All Prisma queries, always scoped by `userId` |
| Integrations | `src/lib/{stripe,r2,openai,email,rate-limit}.ts` | Thin wrappers around third-party SDKs |
| UI | `src/components/**` | Client/server components, shadcn/ui primitives in `components/ui` |

### Server action conventions

Every action returns an `ActionResult<T>` (`src/lib/action-utils.ts`):

```ts
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
```

Helpers in the same file handle the repetitive parts:

- `getAuthedSession()`: returns the session or an `Unauthorized` result
- Pro and rate-limit guards used by AI and upload actions

Components never throw on a failed action. They check `result.success` and
show a toast.

### Data access conventions

- Every query filters by the current user's id. No query returns another
  user's rows.
- List queries select only what the card needs (`ItemWithType`), while detail
  queries (`getItemById`) include content, tags and collections.
- Pagination limits live in `src/lib/constants/pagination.ts`.

## Routing

| Route | Type | Notes |
| --- | --- | --- |
| `/` | static | Marketing homepage |
| `/sign-in`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | static | Share the split-screen `(auth)` layout |
| `/dashboard` | dynamic | Stats, collections, pinned & recent items |
| `/items/[type]` | dynamic | `snippets`, `prompts`, `commands`, `notes`, `files`, `images`, `links` |
| `/collections`, `/collections/[id]` | dynamic | Paginated list and detail |
| `/favorites` | dynamic | Starred items and collections |
| `/profile`, `/settings`, `/upgrade` | dynamic | Account, preferences, billing |

`src/proxy.ts` (Next 16's replacement for `middleware.ts`) redirects
unauthenticated requests to `/dashboard/*`. Every other protected page also
calls `auth()` itself and redirects if needed.

## Client state

There is no global store. Small React contexts cover the shared UI state:

- `ItemDrawerProvider`: which item is open in the right-hand drawer
- `SearchProvider`: command palette open state and the prefetched search index
- `EditorPreferencesProvider`: Monaco settings for the signed-in user

After a mutation, components call `router.refresh()` so server components
re-fetch.
