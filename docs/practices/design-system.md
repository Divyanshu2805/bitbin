# Design System

BitBin is **dark-first** (with a full light theme) and drawn as **an IDE for your knowledge**: near-black
editor surfaces, hairline borders, one loud accent (acid lime) for primary
actions, coral and cyan used sparingly, and mono metadata everywhere. The
homepage, the auth screens and the app share one vocabulary — `~/path` pills,
`// section` comment labels, TUI panes, terminal buttons, a status bar. All
tokens live in `src/app/globals.css`.

## Color tokens

| Token | Dark | Light | Used for |
| --- | --- | --- | --- |
| `--background` | `#08090a` | `#eff2e9` | Page background |
| `--surface` | `#0c0d0f` | `#ffffff` | Title bars, panel header strips, nested tiles |
| `--card` | `#0e1013` | `#ffffff` | Cards, panes, panels |
| `--popover` | `#121418` | `#ffffff` | Menus, dialogs, the ⌘K palette |
| `--muted` / `--secondary` | `#17191d` | `#eeeee9` | Chips, kbd, subtle fills |
| `--border` | `#23262c` | `#dcddd5` | Hairlines |
| `--foreground` | `#ededee` | `#14161a` | Body text |
| `--muted-foreground` | `#a3a8b1` | `#545961` | Secondary text, mono metadata |
| `--faint` | `#a3a8b1` at 55% | `#5e636b` | Decorative text that still has to be read: line numbers, `//` labels, hints. Use `text-faint dark:text-muted-foreground/50`, never a bare `text-muted-foreground/50` (about 2:1 in the light theme) |
| `--primary` / `--brand-lime` | `#c2f24b` | `#406200` | Primary buttons, active nav, focus ring, prompts (`$`, `>`) |
| `--brand-coral` | `#ff7a4d` | `#9d350a` | Upgrade, `PRO` tags, nearly-full limits, the logo's falling bit |
| `--brand-cyan` | `#5ee6d8` | `#08635d` | Collections, gradient partner to lime |
| `--destructive` | `#ff5a4a` | `#a42919` | Delete actions, errors |
| `--tok-*` | | | Syntax colours for code previews and terminal output |

The light brand hues are deepened versions of the dark ones, chosen so each
clears 4.5:1 as text on the page, on cards, on the green sidebar and on an 8%
wash of itself (badges and chips). `--input` is darker in the light theme
(3:1) because a field's edge is its only outline. `src/app/theme-contrast.test.ts`
reads the tokens from `globals.css` and fails when a pairing drops below AA, so
change a colour there and the test tells you what it breaks.

Tailwind exposes them as `bg-lime`, `text-coral`, `border-cyan`,
`bg-surface`, `text-tok-path`, etc. (see `@theme inline`).

## Themes

The light palette lives under `:root`, the dark one under `.dark`. next-themes
(`components/theme-provider.tsx`) puts `.dark` on `<html>` before paint and
remembers the choice; dark is the default, and `ThemeToggle` in the top bar
flips between light and dark in one click. Each palette also sets `color-scheme`, which is
what makes `light-dark()` pick the right half.

- **Never hardcode a dark-only colour** (`#1e1e1e`, `mix(…, white)`, a
  near-black keycap) in the app. Use a token, or one of the theme variables:
  `--tint` (what accent text mixes towards to stay readable),
  `--btn-drop`, `--editor-bg`, `--editor-chrome`, `--scroll-thumb`.
- For a one-off pair, `light-dark(#lightValue, #darkValue)` in a style works.
- Tailwind palette colours used as text need a light shade too:
  `text-amber-500 dark:text-amber-400`.
- Monaco's themes are all dark; in light mode the code editor uses
  `github-light` whatever the editor preference says.
- **The homepage follows the app theme**, with a `ThemeToggle` in its navbar.
  Its demo windows use the theme's surfaces like the app does (`bg-card`,
  `bg-background` for terminals), pass type colours through `readableColor()` /
  `readableTint()`, and write theme-dependent shadows or keycaps as
  `light-dark()` pairs. The bit rain reads its colours from the theme. The auth
  brand panel follows the theme the same way. In light mode both sit on a
  deeper green-grey page with darker secondary text (`BRAND_SURFACE` in
  `components/homepage/brand-surface.ts`).
- The app backdrop behind every page is `AppBackdrop` (DashboardLayout, rendered once by `src/app/(app)/layout.tsx`), a
  layer behind the whole window that doesn't scroll. The sidebar (`--sidebar`
  at 25% in dark, 60% in light) and the status bar are see-through over it, and the top bar and
  `<main>` are transparent, so the glows run on under all of them:
  a lime (top left) and a lime-cyan (top right) glow drifting slowly (still under
  `prefers-reduced-motion`), a faint diagonal beam of light, a vignette and a
  tiled grain, all from the `--backdrop-*` tokens. Nothing at the bottom
  right. No grid or dot pattern.

**Item type colors** (blue snippets, purple prompts, orange commands…) are
data, not theme. They come from the `item_types` table and stay the same in
every theme so users can recognize types at a glance. The app uses them for
icons, card accents (`--accent-color`), and the per-type bars. Pass them through
`readableColor()` (`lib/utils/color.ts`) before using one as text, an icon or
an accent: it returns a `light-dark()` pair — darkened until it reads on white
(note's yellow) and lifted towards white when it's too dark for the dark theme
(file's slate grey). Collection `dominantColor`s go through it too. For a tinted
fill or border, `readableTint(hex, percent)` mixes that pair with transparent
(no `${hex}33` suffixes: they can't follow the theme).

## Typography

Self-hosted from `src/app/fonts/` with `next/font/local` in `src/app/layout.tsx` (latin variable files from Google Fonts; `next/font/google` intermittently fails Turbopack builds):

| Role | Font | Tailwind |
| --- | --- | --- |
| Body / UI | Geist | `font-sans` (default) |
| Description text | IBM Plex Sans | `text-desc` (font + 80% foreground): page, panel, card and empty-state descriptions, landing and auth intros |
| Headings | JetBrains Mono | `font-display` (applied to `h1`–`h4` automatically) |
| Code, labels, counters, metadata | JetBrains Mono | `font-mono` |

Labels are written like code: `~/items/snippets` pills over page titles,
`// recent [10]` over sections, `[4]` for counts, `#tag` for tags.

## The app shell

`components/layout/dashboard-layout.tsx` draws the app as an editor window:

| Part | Component | Notes |
| --- | --- | --- |
| Title bar | `top-bar.tsx` | Sits over the content, beside the full-height sidebar, with no background or border (the backdrop runs through it). A three-column grid with the `>` search prompt (opens ⌘K) centred: example searches type themselves out with an always-blinking caret (`useTypewriter`). `upgrade` and the create buttons (their key on them) on the right; phones get the menu button and logo on the left |
| Explorer | `sidebar.tsx`, `sidebar-nav.tsx` | Runs the full height, headed by the logo, the name and a collapse button (the button fades with the labels; on the rail, hovering the logo turns it into the expand button, with a tooltip and `[`). Each type's digit shortcut sits under its icon as a subscript. Collapses to an icon rail (`<html data-sidebar>`, restored before paint): the width animates, icons stay on the rail's centre line, labels fade, and `.sidebar-fold` blocks fold their height. One pill follows the pointer (a faint lime tint) and another glides to the current page (a stronger lime) (`.sidebar-pill`); a band of lime light sweeps across a row on hover (one way, like the buttons). Rows swap their count for their shortcut on hover; on the rail a tooltip shows name + key. Free users get the usage grid (`sidebar-usage.tsx`) |
| Page | `main` | A faint grid and lime wash behind the header; content enters with `animate-page-in` |
| Status bar | `status-bar.tsx` | `~/bin/<path>`, items per type, key hints, plan. `md` and up |

### Keyboard shortcuts

`hooks/use-hotkey.ts` binds single keys that never fire while typing, with a
modifier, or while a dialog or menu is open. The full list lives in
`lib/constants/shortcuts.ts`, which also feeds the hints and the `?` sheet
(`components/layout/app-shortcuts.tsx`).

| Key | Action | Where |
| --- | --- | --- |
| `⌘K` / `Ctrl K`, `/` | Search | `search-provider.tsx`, `top-bar.tsx` |
| `N` | New item (set to the page's type on `/items/*`) | `top-bar.tsx` |
| `C` | New collection | `top-bar.tsx` |
| `G` then `D` `F` `C` `P` `S` `U` | Dashboard, favorites, collections, profile, settings, upgrade | `app-shortcuts.tsx` |
| `1`–`7` | Item types, in sidebar order | `app-shortcuts.tsx` |
| `[` | Collapse / expand the sidebar (also the sidebar head's buttons) | `app-shortcuts.tsx`, `sidebar.tsx` |
| `?` | The shortcuts sheet | `app-shortcuts.tsx` (also the status bar and user menu) |
| `E` `F` `P` `M` `⌫`, `⌘S` | Open item: edit, favorite, pin, full screen, delete; save while editing | `item-drawer.tsx` |
| `E` | Collection page: edit | `collection-actions.tsx` |

Show a shortcut where its control is: `.btn-kbd` inside a `.btn`, `<Kbd keys={…} />`
in rows, menus (`DropdownMenuShortcut`) and tooltips.

## Motion

Keyframes and utilities are defined once in `globals.css`:

| Utility | Effect |
| --- | --- |
| `animate-page-in` | App pages rise out of a soft blur |
| `animate-fade-up` | 14px rise + fade. Uses the `translate` property so it composes with hover transforms |
| `stagger` | Put on a grid/list. Children fade up one after another |
| `card-lift` | Hover lift + border/glow tinted by `--accent-color` (defaults to lime) |
| `card-glow` | A gradient border in `--accent-color` on hover/focus |
| Animated icons | Icons inside any button, link, `role="button"`/`radio`/`option`, menu item, sidebar row or `[data-anim-icons]` move on hover, each its own way, keyed off lucide's `lucide-*` classes (plus turns, trash wiggles, download bobs, star spins…) |
| `animate-shimmer` | Skeleton loading sweep (used by `<Skeleton />`) |
| `animate-led` | A breathing status LED (status bar) |
| `.logo-mark` | The logo loops: the lid swings open, the bit drops in, the lid shuts (`LogoMark`, on by default) |
| `.panel-anim` | The sidebar toggle's divider and arrow slide the way the panel will go on hover |
| `animate-spin-slow` | The light running round the Pro card's border |
| `shimmer-text` | A light sweeping across text (the agent spinner's verb) |

Other helpers: `bg-grid`, `bg-dots`, `mask-radial`, `noise`,
`text-brand-gradient`, `thin-scrollbar`, `.tui` / `.tui-title` (a pane whose
title sits in its top border).

`prefers-reduced-motion: reduce` disables all animations and transitions
globally; `<AnimatedNumber />` jumps straight to its final value and `<TypeText />` shows its text at once.

## Buttons

`.btn` (globals.css) is the site's button: a lit top edge, a lift on hover and a
real press. Variants: `.btn-primary` (lime), `.btn-secondary`, `.btn-terminal`
(dark glass, mono, `$` prompt and caret). The shadcn `<Button />` is still used
for icon/outline controls inside menus and forms.

Every app button is a **terminal button**:
`<Button>` (all variants but `ghost` and `link`) is `.term-btn` — glass with a
hairline edge and a mono label. Where the homepage's terminal button has its
`$` prompt, an app button has **its own icon**, in the accent; every text button carries one
(Cancel → `X`, Delete → `Trash2`, Save → `Save`…), so give new buttons one too.
There's no text animation (no `ScrambleLabel`, no caret) in the app — that
stays on the homepage. The auth submit (`AuthSubmit`) is a primary `<Button>` too,
with the BitBin logo as its prompt and a blinking caret. On hover the icon is constructed
stroke by stroke and holds (`gh-construct`, for every `[data-slot="button"]`,
ghost included), a band of light in the accent sweeps across once, one way
only, and resets unseen on leave (`.term-btn::after`), the edge lights in the accent and `.btn-kbd` keycaps
press. Crosses (`lucide-x`) never turn: they shrink and fade. Icons that swap by
`scale` (the theme toggle's sun and moon) carry `.theme-icon` so hover rules
leave their scale alone.
`.term-primary` (default variant) adds the accent glow along the bottom edge,
`.term-outline` (outline / secondary) a softer version of it, so every button
reads as lit at rest in its own accent, `.term-danger` is destructive. Set `--grid-color` to retint one (type chips use the item
type's colour, Collection cyan, Upgrade coral). The GitHub sign-in button keeps
its contribution grid (`.gh-button`, `<ContribGrid />`); the landing page's own
`.btn` buttons are unchanged.

**Text fields** use the sign-in page's viewfinder. `<Input>` and `<Textarea>`
render inside a `.field-frame`, whose four corner brackets snap in on focus;
the field's border and its label take the accent too. The accent is `--ring`:
lime, or the item type's colour in the item dialog and drawer. The tag box uses
the same frame. The code and markdown editors don't: they're windows
(`.editor-window`), so an editable one idles with grey traffic lights, and on
focus the lights come on, an accent line draws along its top edge like an
active editor tab, and the border, language label and a soft glow take the
accent. For a new custom text
box, put `field-frame` on its container (it must not clip with
`overflow-hidden`; wrap it if it does).

> `.btn` and `.btn-kbd` are unlayered CSS, so they beat Tailwind utilities such
> as `hidden` or `sm:inline-flex`. Put responsive visibility on a wrapper
> element, not on the `.btn` itself.

## Reusable pieces

| Component | Path | Use |
| --- | --- | --- |
| `PageHeader` | `components/shared/page-header.tsx` | `~/path` pill, title (types itself in behind a lime caret), `[count]`, description, actions |
| `SectionHeader` | `components/dashboard/section-header.tsx` | `// title [n] ─── view all →` rule over a section |
| `Panel` / `ProTag` | `components/shared/panel.tsx` | Settings/profile pane with a header strip; `tone="danger"` |
| `EmptyState` | `components/shared/empty-state.tsx` | The bin, a title and what to do next |
| `Kbd` | `components/shared/kbd.tsx` | Key caps for a shortcut hint |
| `UsageMeter` | `components/shared/usage-meter.tsx` | `items 18 / 50` over a bar that turns coral at 90% |
| `ItemCard` | `components/dashboard/item-card.tsx` | Grid card: type chip, title, code/URL preview with "+N more", tag chips; hover toolbar (copy, favorite, pin, ⋯ menu with delete) |
| `ItemRow` | `components/items/item-row.tsx` | One item per line, for the list view (`ItemsView`) and favorites |
| `BinOverview` | `components/dashboard/bin-overview.tsx` | The dashboard's `bin --stats` pane: counters and the per-type bar |
| `QuickCreate` | `components/dashboard/quick-create.tsx` | `+ new snippet prompt command …` chips |
| `AgentSpinner`, `ToolLine`, `ResultLine` | `components/shared/agent-spinner.tsx` | `✻ Indexing…` loading states; `⏺ Load(…)` / `⎿ result` lines |
| `TypeText` | `components/shared/type-text.tsx` | Content that types itself in, one character per step, behind a caret |
| `AnimatedNumber` | `components/shared/animated-number.tsx` | Count-up numbers |
| `ItemTypeIcon` | `components/shared/item-type-icon.tsx` | Renders an item type's Lucide icon by name |
| `Section`, `CtaLink`, `ScrambleLabel`, `Window` | `components/homepage/ui.tsx` | Homepage building blocks |
| `MockNavRow`, `MockCollectionRow`, `MockSectionLabel`, `MockSearch`, `MockButton`, `MockPathPill` | `components/homepage/mock-app.tsx` | The app shell drawn small for the homepage demos (hero, types, shortcuts, agent, extension). Change them with `components/layout` so the demos keep looking like the app |

shadcn/ui primitives (`components/ui/*`) keep their APIs and contain only the parts the app uses; `CommandInput` takes
an optional `icon` (the palette's `>` prompt).

## Accessibility notes

- A card that opens the drawer (an item) or a page (a collection) is a plain
  container with a real `<button data-card-open>` for its title, inside the
  heading. The title button is the keyboard and screen-reader target (its name
  is the title); the container's `onClick` keeps the whole card clickable for
  the mouse, and the card draws a focus ring when the title button has focus.
  The toolbar buttons stop propagation, so they don't open the card. Don't put
  `role="button"` on a container that holds other buttons.
- Pages have one `h1`; lists of cards sit under an `h2` (visible, or
  `sr-only` on the type and collection pages) so heading levels never skip.
- Muted text on the dark surfaces stays at `text-muted-foreground` or
  `/85`; fainter alphas fall below the 4.5:1 contrast ratio. Lighthouse's
  accessibility audit scores 100 on every page in the dark theme; the light
  theme hasn't been audited.
- Interactive demos on the homepage (the hero's shuffle) are an overlay
  `<button>` with only an `aria-label`, so the accessible name matches what the
  button does.
- Hover-only controls (copy, card menus) are always visible on touch screens
  and when focused.
- Active nav links set `aria-current`. Icon-only buttons have an `aria-label`.
- Bars and meters carry an `aria-label` (or `role="meter"`) with the numbers they draw.

## Grid and list views

Every page that lists items or collections renders them through `ItemsView` / `CollectionsView` (`components/shared/list-views.tsx`): cards in grid mode, rows in list mode. The choice is global, set by `ViewToggle` in the page header and kept in `localStorage` (`bitbin:view`, `lib/view-mode.ts`). `VIEW_SCRIPT` (`lib/view-mode-script.ts`, run in the root layout's `<head>`) copies it to `<html data-view>` before paint, and `globals.css` hides the `[data-view-content]` layout that doesn't match until React renders the right one. A new list page should use these views rather than its own grid.

## Related

- [Coding conventions](coding-conventions.md#components)
- [Where do I change…?](../architecture/where-to-change.md#look-and-feel)
