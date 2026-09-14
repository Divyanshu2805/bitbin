# Where Do I Change…?

A task-oriented index into the code. Each row names the files to start from; follow the imports from there.

## Items and collections

| Task | Start here |
|---|---|
| A field on items | `prisma/schema.prisma` → migration → `src/lib/db/items.ts` (types and selects) → the Zod schemas in `src/actions/items.ts` → `new-item-dialog.tsx` and `item-drawer.tsx` → export / import in `src/lib/db/export.ts` and `src/actions/import.ts` |
| A new item type | `prisma/seed.ts` (system types), `ITEM_TYPE_ICONS` / `ITEM_TYPE_COLORS` in `src/lib/constants/item-types.ts`, `VALID_ITEM_TYPES` and the content-type mapping in `src/lib/db/items.ts`, the sidebar in `components/layout/sidebar-nav.tsx` — see [item types](../item-types.md) |
| What an item card shows | `components/dashboard/item-card.tsx`; files and images use `components/items/file-list-row.tsx` and `image-thumbnail-card.tsx` |
| The item drawer | `components/items/item-drawer.tsx`, `item-drawer-provider.tsx`, the `GET /api/items/[id]` handler |
| Code or markdown editors | `components/items/code-editor.tsx`, `markdown-editor.tsx`, `editor-header.tsx`; defaults in `src/lib/constants/editor.ts` |
| Collections behaviour | `src/lib/db/collections.ts`, `src/actions/collections.ts`, `components/collections/*` |
| Dashboard sections | `src/app/dashboard/page.tsx`, `components/dashboard/*`, the dashboard queries in `src/lib/db/items.ts` and `collections.ts` |

## Plans, billing and limits

| Task | Start here |
|---|---|
| Free plan limits | `MAX_ITEMS` / `MAX_COLLECTIONS` in `src/lib/usage.ts` — and the feature copy in `src/lib/constants/pricing.ts` |
| Prices | Stripe dashboard + `STRIPE_PRICE_ID_*`; the displayed prices are hard-coded in `components/homepage/PricingSection.tsx`, `components/settings/upgrade-pricing.tsx` and `billing-settings.tsx` |
| A new Stripe event | The `switch` in `src/app/api/webhooks/stripe/route.ts`, and subscribe the endpoint to it in Stripe |
| Something new behind Pro | Check `session.user.isPro` in the action (or `requirePro`), and use `components/shared/pro-ai-button.tsx`'s pattern for the disabled UI |

## Platform

| Task | Start here |
|---|---|
| Sign-in behaviour | `src/auth.ts` (providers, `signIn` / `jwt` / `session` callbacks); `src/auth.config.ts` only for what `proxy.ts` needs — a provider change goes in both |
| Auth emails | `src/lib/email.ts` (templates; the sender is the `FROM_EMAIL` variable), `src/lib/tokens.ts` (lifetimes) |
| A new protected page | Call `auth()` and `redirect('/sign-in')` in the page; extend the matcher in `src/proxy.ts` only if it belongs under `/dashboard` |
| A rate limit | `rateLimitConfigs` in `src/lib/rate-limit.ts`, then `checkRateLimit` in the handler — see [rate limits](../rate-limiting.md) |
| Upload types or sizes | `FILE_CONSTRAINTS` in `src/lib/r2.ts` (and `next.config.ts` for new image hosts) |
| AI prompts, model or provider | The prompt strings in `src/actions/ai.ts`; the model and provider are the `AI_MODEL` and `OPENAI_BASE_URL` variables, read in `src/lib/openai.ts` |
| Export / import format | `src/lib/db/export.ts` and the Zod schema in `src/actions/import.ts` — bump `version` if the shape changes incompatibly |
| ⌘K search | `src/actions/search.ts`, `components/search/*` |

## Look and feel

| Task | Start here |
|---|---|
| Colours, fonts, motion | `src/app/globals.css`, fonts in `src/app/layout.tsx` — see [design system](../design-system.md) |
| Navigation | `components/layout/sidebar-nav.tsx` (shared by desktop and mobile), `top-bar.tsx` |
| Homepage | `src/app/page.tsx`, `components/homepage/*` |
| Logo and favicon | `components/shared/logo.tsx`, `src/app/icon.svg`, README art in `docs/assets/` |

## Data and infrastructure

| Task | Start here |
|---|---|
| Any schema change | `prisma/schema.prisma` → `npm run db:migrate` → commit the migration — see [migrations](../database.md) |
| Seed data | `prisma/seed.ts` |
| Environment variables | `.env.example`, [configuration](../local-development/configuration.md), and Vercel's project settings |
