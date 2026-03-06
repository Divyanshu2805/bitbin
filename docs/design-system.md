# Design system

BitBin is **dark-first**. The look is "graphite + lime": near-black neutral
surfaces, one loud accent (acid lime) for primary actions, and coral and cyan
used sparingly for highlights. All tokens live in `src/app/globals.css`.

## Color tokens

| Token | Dark | Used for |
| --- | --- | --- |
| `--background` | `#0a0b0d` | Page background |
| `--surface` | `#0f1114` | Alternating homepage bands, footer |
| `--card` | `#111317` | Cards, form panel |
| `--popover` / `--surface-2` | `#15181c` | Menus, dialogs, nested tiles |
| `--muted` / `--secondary` | `#1b1e24` | Chips, kbd, subtle fills |
| `--border` | `#22262d` | Hairlines |
| `--foreground` | `#eceef0` | Body text |
| `--muted-foreground` | `#8b919b` | Secondary text |
| `--primary` / `--brand-lime` | `#c2f24b` | Primary buttons, active nav, focus ring |
| `--brand-coral` | `#ff7a4d` | Upgrade CTAs, "Pro" badges, the logo's falling bit |
| `--brand-cyan` | `#5ee6d8` | Gradient partner to lime, collections accent |
| `--destructive` | `#ff5a4a` | Delete actions, errors |

Tailwind exposes them as `bg-lime`, `text-coral`, `border-cyan`,
`bg-surface-2`, etc. (see `@theme inline`). A light palette is defined under
`:root` for completeness, but `<html>` ships with `class="dark"`.

**Item type colors** (blue snippets, purple prompts, orange commands…) are
data, not theme. They come from the `item_types` table and stay the same in
every theme so users can recognize types at a glance.

## Typography

Loaded with `next/font/google` in `src/app/layout.tsx`:

| Role | Font | Tailwind |
| --- | --- | --- |
| Body / UI | Manrope | `font-sans` (default) |
| Headings | Space Grotesk | `font-display` (applied to `h1`–`h4` automatically) |
| Code, labels, counters | JetBrains Mono | `font-mono` |

Mono "eyebrow" labels (`font-mono text-xs uppercase tracking-[0.2em] text-lime`)
sit above page titles and section headings.

## Logo

`src/components/shared/logo.tsx`

- `<LogoMark />`: lime bin with three "bits" inside and a coral bit
  dropping in. Pass `animated` to play the drop loop.
- `<Logo />`: mark + "Bit**Bin**" wordmark. `collapseOnMobile` hides the
  wordmark under `sm`.

The favicon is `src/app/icon.svg`. README artwork is in `docs/assets/`.

## Motion

Keyframes and utilities are defined once in `globals.css`:

| Utility | Effect |
| --- | --- |
| `animate-fade-up` | 14px rise + fade. Uses the `translate` property so it composes with hover transforms |
| `stagger` | Put on a grid/list. Children fade up 60ms apart |
| `card-lift` | Hover lift + border/glow tinted by `--accent-color` (defaults to lime) |
| `animate-shimmer` | Skeleton loading sweep (used by `<Skeleton />`) |
| `animate-float` | Slow 8px bob (CTA logo, "Explain" bubble, empty states) |
| `animate-marquee` | Infinite ticker on the homepage (pauses on hover) |
| `animate-blink` | Terminal cursor |
| `animate-bit-drop` | Logo bit dropping into the bin |
| `animate-spin-slow` | Rotating conic border on the Pro pricing card |

Other helpers: `bg-grid`, `bg-dots`, `mask-radial`, `noise`,
`text-brand-gradient`, `thin-scrollbar`.

`prefers-reduced-motion: reduce` disables all animations and transitions
globally, and `<AnimatedNumber />` jumps straight to its final value.

## Reusable pieces

| Component | Path | Use |
| --- | --- | --- |
| `PageHeader` | `components/shared/page-header.tsx` | Eyebrow + title + count on app pages |
| `EmptyState` | `components/shared/empty-state.tsx` | Dashed placeholder with floating logo |
| `AnimatedNumber` | `components/shared/animated-number.tsx` | Count-up numbers in stat cards |
| `ItemTypeIcon` | `components/shared/item-type-icon.tsx` | Renders an item type's Lucide icon by name |
| `SectionHeader` | `components/dashboard/section-header.tsx` | Dashboard section titles with "View all" |
| `SectionHeading` | `components/homepage/SectionHeading.tsx` | Homepage section titles |
| `ScrollFadeIn` | `components/homepage/ScrollFadeIn.tsx` | Reveal-on-scroll wrapper with optional `delay` |

shadcn/ui primitives (`components/ui/*`) keep their APIs. Only styling was
adjusted: buttons scale down slightly on press, and primary buttons pick up a
soft lime glow on hover.

## Accessibility notes

- Cards that open the drawer are focusable (`role="button"`, `tabIndex=0`)
  and respond to Enter/Space. Nested buttons don't trigger the card.
- Hover-only controls (copy, card menus) are always visible on touch screens
  and when focused.
- Active nav links set `aria-current="page"`. Icon-only buttons have an
  `aria-label`.
