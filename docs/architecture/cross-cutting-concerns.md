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

- **It fails open.** Without Upstash configured — unset, still a `YOUR_…` placeholder, or an invalid URL — or when Redis errors, every check passes and a warning or error is logged. A Redis outage never locks users out — and never protects anything either. See [ADR 0005](decisions/0005-rate-limits-fail-open.md).
- **The IP is the first `x-forwarded-for` entry**, then `x-real-ip`, then `127.0.0.1`. On Vercel the platform sets these headers.

## Keeping the UI fresh

There is no client-side data cache. After a successful mutation, the component calls `router.refresh()`, which re-renders the server components on the current route with fresh data. Actions don't call `revalidatePath`.

The ⌘K search index is the exception: it's loaded once when the dashboard layout mounts and is not refreshed after mutations — see [search](flows/search.md).

## Pagination

Constants in `src/lib/constants/pagination.ts`:

| Constant | Value | Used by |
|---|---|---|
| `ITEMS_PER_PAGE` | 21 | `/items/[type]`, collection detail |
| `COLLECTIONS_PER_PAGE` | 21 | `/collections` |
| `DASHBOARD_COLLECTIONS_LIMIT` | 6 | Dashboard collections section |
| `DASHBOARD_RECENT_ITEMS_LIMIT` | 10 | Dashboard recent items |

Pages read `?page=` from the URL; pagination is offset-based.

## Configuration

Everything is an environment variable — see [configuration](../local-development/configuration.md). Constants that look like configuration but live in code:

| Constant | File |
|---|---|
| `MAX_ITEMS` (50), `MAX_COLLECTIONS` (3) | `src/lib/usage.ts` |
| `MAX_CONTENT_LENGTH` (2,000) — the model itself is the `AI_MODEL` variable | `src/actions/ai.ts` |
| `FILE_CONSTRAINTS` (5 MB images, 10 MB files, allowed extensions) | `src/lib/r2.ts` |
| `rateLimitConfigs` | `src/lib/rate-limit.ts` |
| Token lifetimes (24 h verification, 1 h reset) | `src/lib/tokens.ts` |
| `STRIPE_APP_TAG` (`bitbin`) | `src/lib/stripe.ts` |
| Plan feature lists (`FREE_FEATURES`, `PRO_FEATURES`) | `src/lib/constants/pricing.ts`. Displayed prices are literals in `PricingSection.tsx`, `upgrade-pricing.tsx` and `billing-settings.tsx`; the charged price comes from the Stripe price ids |

## Observability

- Server errors go to `console.error` / `console.warn`, which Vercel captures in its function logs. There is no error tracker or structured logging.
- `@vercel/analytics` reports page views once deployed on Vercel.
- There are no health checks or metrics endpoints.

## Related

- [Coding conventions](../practices/coding-conventions.md)
- [Known pitfalls](../practices/gotchas/README.md)
