# Where Do I Change…?

A task-oriented index into the code. Each row names the files to start from; follow the imports from there.

## Items and collections

| Task | Start here |
|---|---|
| A field on items | `prisma/schema.prisma` → migration → `src/lib/db/items.ts` (types and selects) → the Zod schemas in `src/actions/items.ts` → `new-item-dialog.tsx` and `item-drawer.tsx` → export / import in `src/lib/db/export.ts` and `src/actions/import.ts` |
| A new item type | `prisma/seed.ts` (system types), `ITEM_TYPE_ICONS` / `ITEM_TYPE_COLORS` in `src/lib/constants/item-types.ts`, `VALID_ITEM_TYPES` and the content-type mapping in `src/lib/db/items.ts`, the sidebar in `components/layout/sidebar-nav.tsx` — see [item types](../schema/item-types.md) |
| What an item card shows | `components/dashboard/item-card.tsx` and `components/items/item-row.tsx`; images use `components/items/image-thumbnail-card.tsx` |
| The item drawer | `components/items/item-drawer.tsx`, `item-drawer-provider.tsx`, the `GET /api/items/[id]` handler |
| Code or markdown editors | `components/items/code-editor.tsx`, `markdown-editor.tsx`, `editor-header.tsx`; defaults in `src/lib/constants/editor.ts` |
| Collections behaviour | `src/lib/db/collections.ts`, `src/actions/collections.ts`, `components/collections/*` |
| Dashboard sections | `src/app/(app)/dashboard/page.tsx`, `components/dashboard/*`, the dashboard queries in `src/lib/db/items.ts` and `collections.ts` |

## Plans, billing and limits

| Task | Start here |
|---|---|
| Free plan limits | `MAX_ITEMS` / `MAX_COLLECTIONS` in `src/lib/constants/plan.ts` (enforced in `src/lib/usage.ts`) — and the feature copy in `src/lib/constants/pricing.ts` |
| Prices | Stripe dashboard + `STRIPE_PRICE_ID_*`; the displayed prices are hard-coded in `components/homepage/PricingSection.tsx`, `components/settings/upgrade-pricing.tsx` and `billing-settings.tsx` |
| A new Stripe event | The `switch` in `src/app/api/webhooks/stripe/route.ts`, and subscribe the endpoint to it in Stripe |
| Something new behind Pro | Check `session.user.isPro` in the action (or `requirePro`), and use `components/shared/pro-ai-button.tsx`'s pattern for the disabled UI |

## Platform

| Task | Start here |
|---|---|
| Sign-in behaviour | `src/auth.ts` (providers, `signIn` / `jwt` / `session` callbacks); `src/auth.config.ts` only for what `proxy.ts` needs — a provider change goes in both |
| Auth emails | `src/lib/email.ts` (templates; the sender is the `FROM_EMAIL` variable), `src/lib/tokens.ts` (lifetimes) |
| A new protected page | Call `auth()` and `redirect('/sign-in')` in the page; extend the matcher in `src/proxy.ts` only if it belongs under `/dashboard` |
| Session lifetime, "Sign out everywhere" | `src/lib/constants/session.ts`, `signOutEverywhere` in `src/actions/settings.ts`, `revokeUserSessions` in `lib/db/users.ts` |
| What an API token may do | `src/lib/api-scopes.ts` (the list), the scope each handler passes to `authenticateApiRequest(request, scope)`, `components/settings/extension-settings.tsx` (the create form) |
| The Content Security Policy | `src/lib/csp.ts` (built from `next.config.ts`); the code editor's location is `loader.config` in `components/items/code-editor.tsx` and `scripts/copy-monaco.mjs` |
| A route that changes state with the session cookie | Call `rejectCrossSite(request)` from `src/lib/same-origin.ts` first |
| Upload processing (photo re-encoding, malware check) | `src/lib/image-sanitize.ts`, `src/lib/virus-check.ts`, called from `src/app/api/upload/route.ts` |
| The email-abuse limits and the Turnstile check | `registerEmail` / `forgotPasswordEmail` / `resendVerificationEmail` in `lib/rate-limit.ts`; `src/lib/turnstile.ts` and `components/auth/turnstile-widget.tsx` |
| Where sign-in redirects after success | `safeCallbackPath` in `src/lib/validation.ts` (only same-site paths) and `components/auth/sign-in-form.tsx` |
| The public demo account | `src/lib/demo.ts` (the check), `prisma/demo-content.ts` and `prisma/seed.ts` (its library), `src/app/api/cron/reset-demo/route.ts` and `vercel.json` (the daily reset). Anything that changes an account itself must refuse it with `isDemoEmail` |
| Link previews, SEO and icons | Site name, description and the public origin in `src/lib/site.ts`; the Open Graph / Twitter metadata in `src/app/layout.tsx`; the share image in `src/app/opengraph-image.tsx` (reused by `twitter-image.tsx`); `robots.ts` and `sitemap.ts` for crawlers; the homepage's canonical URL and structured data in `src/app/page.tsx`. A new public page goes in `PUBLIC_PATHS`, a new private area in `PRIVATE_PATHS`, and any signed-in or token page also needs `robots: { index: false }` |
| Privacy and Terms pages | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, framed by `components/shared/legal-page.tsx`; linked from `components/homepage/Footer.tsx` and the register form |
| Error monitoring | `src/lib/monitoring.ts` (options and scrubbing), `src/instrumentation.ts`; see [Sentry setup](../deployment/providers.md#sentry) |
| CI and the coverage floor | `.github/workflows/ci.yml`, `vitest.config.ts` (`coverage.thresholds`) |
| A script that deletes data | Call `assertSafeToRunDestructive` from `src/lib/db-safety.ts` first |
| A rate limit | `rateLimitConfigs` in `src/lib/rate-limit.ts`, then `checkRateLimit` in the handler — see [rate limits](../api/errors-and-rate-limits.md#adding-a-limit) |
| Upload types or sizes | `FILE_CONSTRAINTS` in `src/lib/r2.ts` |
| AI prompts, model or provider | The prompt strings in `src/actions/ai.ts`; the model and provider are the `AI_MODEL` and `OPENAI_BASE_URL` variables, read in `src/lib/openai.ts` |
| Export / import format | `src/lib/db/export.ts` and the Zod schema in `src/actions/import.ts` — bump `version` if the shape changes incompatibly |
| ⌘K search | `src/actions/search.ts`, `components/search/*` |
| The browser extension | `extension/` (popup, options, type guessing in `lib.js`); its endpoints in `src/app/api/v1/*` and the token check in `src/lib/api-auth.ts`. See the [token API](../api/token-api.md) before changing a response. The Settings download is packaged by `src/lib/extension-package.ts`; bump `version` in `extension/manifest.json` for every extension change |
| The desktop tray app | `desktop/` (`main.js` for tray, shortcut and IPC; `src/` for the API client, config store and type guessing; `renderer/` for the two windows). It uses the [token API](../api/token-api.md) like the extension, so check a response change against both. `src/guess.js` mirrors `extension/lib.js`; change them together. See [save from the desktop](flows/save-from-desktop.md) |

## Look and feel

| Task | Start here |
|---|---|
| Colours, fonts, motion | `src/app/globals.css`, fonts in `src/app/layout.tsx` — see [design system](../practices/design-system.md) |
| Navigation | `components/layout/sidebar-nav.tsx` (shared by desktop and mobile), `top-bar.tsx`, `status-bar.tsx`; the sidebar's data is loaded in `src/app/(app)/layout.tsx` |
| Keyboard shortcuts | `lib/constants/shortcuts.ts` (the list), `hooks/use-hotkey.ts`, `layout/app-shortcuts.tsx` (G-sequences, 1–7, `[`, `?`), `top-bar.tsx`, `items/items-page-header.tsx`, `items/item-drawer.tsx` |
| Homepage | `src/app/page.tsx`, `components/homepage/*` |
| Logo and favicon | `components/shared/logo.tsx`, `src/app/icon.svg`, the README banner in `docs/assets/` |

## Data and infrastructure

| Task | Start here |
|---|---|
| Any schema change | `prisma/schema.prisma` → `npm run db:migrate` → commit the migration — see [migrations](../schema/migrations-and-seeding.md) |
| Seed data | `prisma/seed.ts` |
| Environment variables | `.env.example`, [configuration](../local-development/configuration.md), and Vercel's project settings |
