# Cross-Cutting Concerns

Behaviour that isn't owned by one feature: how results and errors travel, validation, rate limiting, keeping the UI fresh, configuration, and observability.

## Action results and errors

Every server action returns an `ActionResult<T>` (`src/lib/action-utils.ts`) instead of throwing:

```ts
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;                          // shown to the user as a toast
  fieldErrors?: Record<string, string[]>;  // per-field messages from Zod
}
```

- Components check `result.success` and show a toast; they never wrap actions in `try/catch`.
- Messages are written for users ("You have reached the free tier limit of 50 items…"). Provider errors are logged with `console.error` and replaced with a generic message.
- Route handlers return JSON `{ error: string }` with a real status code (`400`, `401`, `403`, `404`, `429`, `500`) — see [errors and rate limits](../api/errors-and-rate-limits.md).

## Validation

- Server actions validate input with a Zod schema declared next to the action, using `safeParse`; a failure returns `{ success: false, error: 'Validation failed', fieldErrors }` (`parseZodErrors` in `lib/validation.ts`).
- `safeUrlSchema` only accepts `http:` and `https:` URLs, so a stored link can't be a `javascript:` URL.
- `validateId` rejects empty ids before a query runs.
- The auth route handlers validate by hand (required fields, matching passwords, minimum length 8).
- Uploads check the extension, the MIME type, a per-type size limit (`FILE_CONSTRAINTS` in `lib/r2.ts`) and the bytes themselves, all in `ingestFile` (`lib/file-ingest.ts`).

## Rate limiting

Upstash sliding windows, keyed by client IP plus an optional identifier (email or user id). Limits are listed in the [API reference](../api/errors-and-rate-limits.md#rate-limits). Two properties matter when changing anything nearby:

- **Without Redis, production degrades; development fails open.** With Upstash unset, still a `YOUR_…` placeholder or invalid, production counts per server instance in memory (weaker, because every instance counts separately) and development lets everything through. When Redis *errors*, every other limit (search, writes, imports, exports, AI, uploads, the token API) passes, but the credential limits (sign-in, register, forgot / reset password, resend verification, their per-address versions, change password) refuse the request. See [ADR 0005](decisions/0005-rate-limits-fail-open.md).
- **Per IP, and for email also per address.** The IP comes from `x-vercel-forwarded-for`, then `x-real-ip`, then the *last* `x-forwarded-for` entry (never the first, which a client can set). Limits that guard an inbox (`registerEmail`, `forgotPasswordEmail`, `resendVerificationEmail`) are keyed by the address alone (`checkRateLimit(type, email, { ignoreIp: true })`), so rotating IPs can't flood one person.

## Keeping the UI fresh

There is no client-side data cache. After a successful mutation, the component calls `router.refresh()`, which re-renders the server components on the current route with fresh data. Actions don't call `revalidatePath`.

The ⌘K palette is the exception, because it isn't server-rendered: it asks the server as you type, so it needs no `router.refresh()` — see [search](flows/search.md).

## Pagination

Constants in `src/lib/constants/pagination.ts`:

| Constant | Value | Used by |
|---|---|---|
| `ITEMS_PER_PAGE` | 21 | `/items/[type]`, collection detail |
| `COLLECTIONS_PER_PAGE` | 21 | `/collections` |
| `DASHBOARD_COLLECTIONS_LIMIT` | 9 | Dashboard collections section |
| `DASHBOARD_RECENT_ITEMS_LIMIT` | 9 | Dashboard recent items |
| `MAX_QUERY_LIMIT` | 100 | The cap `clampLimit` puts on any caller-supplied limit |

Lists are **keyset-paginated** (`src/lib/keyset.ts`): a page is the rows after (`?after=`) or before (`?before=`) an opaque cursor, in the order *pinned first, then last edited, then id*. The cursor holds the position of a row (`[pinned, updatedAt, id]`, base64url), so there are no page numbers, and rows don't shift or repeat when something is edited while you page. A page is read in **segments**, each one plain range of the `(userId, isPinned, updatedAt, id)` index: the cursor's own group (pinned or not) from the cursor on, bounded by `updatedAt` so the scan starts at the cursor, then, only if that runs out, the other group from its start. One `OR` across both groups would stop the index from starting at the cursor, and a page in the middle of a long list would read every row before it. So every page, first or deep, forward or back, reads about one page of rows. A page fetches `limit + 1` rows, and the extra one says there is a next page. The total beside it is a count by type, which reads only the `(userId, itemTypeId)` index. An unreadable cursor shows the first page. Used by `getItemsByType`, `getItemsByCollection` and `getAllCollections`; `Pagination` renders first / prev / next.

## Configuration

Everything is an environment variable — see [configuration](../local-development/configuration.md). Constants that look like configuration but live in code:

| Constant | File |
|---|---|
| `MAX_ITEMS` (50), `MAX_COLLECTIONS` (3) | `src/lib/constants/plan.ts` (enforced in `src/lib/usage.ts`) |
| `AI_MAX_INPUT_CHARS` (2,000) — the model itself is the `AI_MODEL` variable | `src/lib/openai.ts` |
| `FILE_CONSTRAINTS` (5 MB images, 10 MB files, allowed extensions) | `src/lib/r2.ts` |
| `rateLimitConfigs` | `src/lib/rate-limit.ts` |
| Coverage floor (80% statements, branches and lines; 70% functions) | `vitest.config.ts` |
| Item field caps (title 200, description 1,000, content 500,000, 20 tags of 50) | `src/lib/validation.ts` |
| Import caps (5,000 entries; ZIP 20 MB and 100 files); upload part size (4 MB) | `src/lib/upload-parts.ts`, `src/lib/import-schema.ts`, `src/lib/zip-import.ts` |
| Orphan sweep safety limits (a day old, 1,000 per run, abort above half the bucket) | `src/lib/orphan-sweep.ts` |
| Session lifetime (14 days, re-issued daily) | `src/lib/constants/session.ts` |
| Content Security Policy | `src/lib/csp.ts` |
| API scopes | `src/lib/api-scopes.ts` |
| Token lifetimes (24 h verification, 1 h reset) | `src/lib/tokens.ts` |
| `STRIPE_APP_TAG` (`bitbin`) | `src/lib/stripe.ts` |
| Plan feature lists (`FREE_FEATURES`, `PRO_FEATURES`, built from `MAX_ITEMS` / `MAX_COLLECTIONS`) | `src/lib/constants/pricing.ts`, shown by the homepage and the upgrade page. Displayed prices are literals in `PricingSection.tsx`, `upgrade-pricing.tsx` and `billing-settings.tsx`; the charged price comes from the Stripe price ids |

## Observability

- Server errors go to `console.error` / `console.warn`, which Vercel captures in its function logs. `console.error` is the error channel: Sentry (`lib/monitoring.ts`, started from `instrumentation.ts`) captures every `console.error` and every error Next.js catches, so log the real error there and return a generic message to the client.
- Sentry is off unless `SENTRY_DSN` is set (production only). Before an event leaves the server, cookies, auth headers, request bodies, query strings, IPs and user data are stripped, and no performance traces are sent. Node process warnings are ignored. Alert rules live in the Sentry dashboard ([setup](../deployment/providers.md#sentry)).
- `@vercel/analytics` reports page views once deployed on Vercel.
- There are no health checks, metrics endpoints or structured logging.

## Cross-site requests

The session cookie is `SameSite=Lax`. As a second line of defence, the cookie-authenticated handlers that change state or start a payment (change password, delete account, checkout, the portal, upload, ZIP import) call `rejectCrossSite(request)` first (`lib/same-origin.ts`): a `Sec-Fetch-Site` of `cross-site` or `same-site`, or an `Origin` that isn't this host, is a `403`. A request with neither header (curl, a server) passes, because a CSRF attack needs a browser and a browser always sends one. Next's own server actions check the origin themselves. A new cookie-authenticated mutating route handler should do the same.

## Content Security Policy

`src/lib/csp.ts` builds the policy `next.config.ts` sends with every page. Scripts, styles, fonts, images, connections, frames and workers may load only from this site, so a new third-party script or CDN needs a deliberate change there (and a good reason). The code editor is copied into `public/monaco` by `scripts/copy-monaco.mjs` and served from our own origin for that reason. `script-src` keeps `'unsafe-inline'`; see [ADR 0010](decisions/0010-content-security-policy-without-script-nonces.md) for why and what that means.

## Redirects

Anything the client says to go to after an action (the sign-in `callbackUrl`) goes through `safeCallbackPath` in `lib/validation.ts`: only a path on this site is followed, so an absolute, protocol-relative or backslash URL can't turn the sign-in page into an open redirect.

## The demo account

`demo@bitbin.dev` is a public sandbox: its password is published so anyone can try the app. `lib/demo.ts` (`isDemoEmail`) is the single check. Anything that changes the account itself (password, name, deletion, billing, email, sign-out-everywhere) refuses it with a 403 or an `ActionResult` error, and `demoItemRestriction` keeps it from saving links, long pastes or imports (everything it saves is shown to the next visitor), and a daily cron (`/api/cron/reset-demo`, `vercel.json`, authorised by `CRON_SECRET`) restores its library from `prisma/demo-content.ts` in one transaction. A new feature that changes account-level state needs the same check.

## Scheduled jobs

`vercel.json` runs two crons, each a route authorised by `Authorization: Bearer $CRON_SECRET` (`lib/cron-auth.ts`, constant-time comparison, refused when the secret is unset):

| Route | When | What it does |
|---|---|---|
| `/api/cron/reset-demo` | Daily, 21:00 UTC | Restores the demo account's library, name and plan in one transaction |
| `/api/cron/sweep-files` | Sundays, 03:00 UTC | Deletes stored files no item points at, and abandoned upload parts, within the limits in `lib/orphan-sweep.ts`; `?dryRun=1` reports without deleting |

Both log their outcome; a failure is a `console.error`, so it reaches Sentry.

## Destructive scripts

`db:seed` and `db:cleanup` call `assertSafeToRunDestructive` (`lib/db-safety.ts`) before touching data. They read the same `DATABASE_URL` as the app, so they refuse to run until the host is listed in `SAFE_DATABASE_HOSTS` (a development branch) or confirmed once with `CONFIRM_DATABASE_HOST`. `lib/db-url.ts` normalises `sslmode` for the pg driver, for the app and the scripts alike.

## Related

- [Coding conventions](../practices/coding-conventions.md)
- [Known pitfalls](../practices/gotchas/README.md)
