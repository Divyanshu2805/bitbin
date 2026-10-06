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
- Uploads check both the extension and the MIME type, and a per-type size limit (`FILE_CONSTRAINTS` in `lib/r2.ts`).

## Rate limiting

Upstash sliding windows, keyed by client IP plus an optional identifier (email or user id). Limits are listed in the [API reference](../api/errors-and-rate-limits.md#rate-limits). Two properties matter when changing anything nearby:

- **It fails open, except for credentials.** Without Upstash configured (unset, still a `YOUR_…` placeholder, or an invalid URL) every check passes and a warning or error is logged. When Redis *errors*, the AI, upload and token-API limits pass, but the credential limits (sign-in, register, forgot / reset password, resend verification, change password) refuse the request. See [ADR 0005](decisions/0005-rate-limits-fail-open.md).
- **The IP is the first `x-forwarded-for` entry**, then `x-real-ip`, then `127.0.0.1`. On Vercel the platform sets these headers.

## Keeping the UI fresh

There is no client-side data cache. After a successful mutation, the component calls `router.refresh()`, which re-renders the server components on the current route with fresh data. Actions don't call `revalidatePath`.

The ⌘K search index is the exception, because it isn't server-rendered: it's loaded when the dashboard layout mounts and again each time the palette opens, so it needs no `router.refresh()` — see [search](flows/search.md).

## Pagination

Constants in `src/lib/constants/pagination.ts`:

| Constant | Value | Used by |
|---|---|---|
| `ITEMS_PER_PAGE` | 21 | `/items/[type]`, collection detail |
| `COLLECTIONS_PER_PAGE` | 21 | `/collections` |
| `DASHBOARD_COLLECTIONS_LIMIT` | 9 | Dashboard collections section |
| `DASHBOARD_RECENT_ITEMS_LIMIT` | 9 | Dashboard recent items |

Pages read `?page=` from the URL; pagination is offset-based.

## Configuration

Everything is an environment variable — see [configuration](../local-development/configuration.md). Constants that look like configuration but live in code:

| Constant | File |
|---|---|
| `MAX_ITEMS` (50), `MAX_COLLECTIONS` (3) | `src/lib/usage.ts` |
| `MAX_CONTENT_LENGTH` (2,000) — the model itself is the `AI_MODEL` variable | `src/actions/ai.ts` |
| `FILE_CONSTRAINTS` (5 MB images, 10 MB files, allowed extensions) | `src/lib/r2.ts` |
| `rateLimitConfigs` | `src/lib/rate-limit.ts` |
| Coverage floor (75 / 75 / 65 / 75) | `vitest.config.ts` |
| Token lifetimes (24 h verification, 1 h reset) | `src/lib/tokens.ts` |
| `STRIPE_APP_TAG` (`bitbin`) | `src/lib/stripe.ts` |
| Plan feature lists (`FREE_FEATURES`, `PRO_FEATURES`) | `src/lib/constants/pricing.ts`. Displayed prices are literals in `PricingSection.tsx`, `upgrade-pricing.tsx` and `billing-settings.tsx`; the charged price comes from the Stripe price ids |

## Observability

- Server errors go to `console.error` / `console.warn`, which Vercel captures in its function logs. `console.error` is the error channel: Sentry (`lib/monitoring.ts`, started from `instrumentation.ts`) captures every `console.error` and every error Next.js catches, so log the real error there and return a generic message to the client.
- Sentry is off unless `SENTRY_DSN` is set (production only). Before an event leaves the server, cookies, auth headers, request bodies, query strings, IPs and user data are stripped, and no performance traces are sent. Node process warnings are ignored. Alert rules live in the Sentry dashboard ([setup](../deployment/providers.md#sentry)).
- `@vercel/analytics` reports page views once deployed on Vercel.
- There are no health checks, metrics endpoints or structured logging.

## Redirects

Anything the client says to go to after an action (the sign-in `callbackUrl`) goes through `safeCallbackPath` in `lib/validation.ts`: only a path on this site is followed, so an absolute, protocol-relative or backslash URL can't turn the sign-in page into an open redirect.

## The demo account

`demo@bitbin.dev` is a public sandbox: its password is published so anyone can try the app. `lib/demo.ts` (`isDemoEmail`) is the single check. Anything that changes the account itself (password, name, deletion, billing, email) refuses it with a 403 or an `ActionResult` error, and a daily cron (`/api/cron/reset-demo`, `vercel.json`, authorised by `CRON_SECRET`) restores its library from `prisma/demo-content.ts` in one transaction. A new feature that changes account-level state needs the same check.

## Destructive scripts

`db:seed` and `db:cleanup` call `assertSafeToRunDestructive` (`lib/db-safety.ts`) before touching data. They read the same `DATABASE_URL` as the app, so they refuse to run until the host is listed in `SAFE_DATABASE_HOSTS` (a development branch) or confirmed once with `CONFIRM_DATABASE_HOST`. `lib/db-url.ts` normalises `sslmode` for the pg driver, for the app and the scripts alike.

## Related

- [Coding conventions](../practices/coding-conventions.md)
- [Known pitfalls](../practices/gotchas/README.md)
