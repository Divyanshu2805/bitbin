# Design System

BitBin is **dark only** and drawn on warm paper, the landing page's look on
every page: charcoal sheets, each layer (page, surface, card,
popover) a clear step from the one under it, flat rounded cards, serif headings, one accent (clay) for
primary actions, sage and heather used sparingly, and mono kept for labels and metadata. Nothing is
see-through, blurred or glowing: every surface is a solid colour. All tokens live in `src/app/globals.css`.

## Color tokens

| Token | Value | Used for |
| --- | --- | --- |
| `--background` | `#151514` | Page background |
| `--surface` | `#1c1b19` | Title bars, panel header strips, nested tiles, every second sheet of the landing page |
| `--card` | `#222120` | Cards, panes, panels |
| `--card-ink` | `#100f0e` | Item and collection cards (`card-ink`): the same brown as `--card` |
| `--popover` | `#2b2927` | Menus, dialogs, the ⌘K palette |
| `--muted` / `--secondary` | `#2f2d2a` | Chips, kbd, subtle fills |
| `--border` | `#4b453b` | Hairlines |
| `--foreground` | `#fbfaf6` | Body text |
| `--muted-foreground` | `#d3cec4` | Secondary text, mono metadata |
| `--faint` | `#b8b1a4` | Decorative text that still has to be read: line numbers, `//` labels, hints. Use `text-faint` |
| `--primary` / `--brand-lime` | `#e3a184` | Primary buttons, active nav, focus ring, prompts (`$`, `>`). Clay; the token and its `lime` utilities keep their first name |
| `--brand-coral` | `#e3a184` | Upgrade, `PRO` tags, nearly-full limits. The same clay as the primary |
| `--logo-light` / `--logo-deep` / `--logo-bit` | `#f4bfa5` / `#d98863` / `#ffc857` | The logo only: the bin and the `Bin` of the wordmark (`.logo-word`) run from the light clay down to the deep one, and the falling bit is amber. `icon.svg`, `apple-icon.tsx` and `opengraph-image.tsx` repeat the three values |
| `--brand-cyan` | `#afc6b1` | Collections. Sage |
| `--brand-violet` | `#c9a4c1` | The AI helpers. Heather |
| `--brand-green` | `#7fd196` | The homepage's data and privacy section and its navbar link. Green |
| `--destructive` | `#ff8679` | Delete actions, errors |
| `--tok-*` | | | Syntax colours for code previews and terminal output |

Each accent clears 4.5:1 as text on the page, on cards, on muted fills, on the sidebar and on an 8%
wash of itself (badges and chips). `src/app/theme-contrast.test.ts` reads the tokens from `globals.css`
and fails when a pairing drops below AA, so change a colour there and the test tells you what it breaks.

Tailwind exposes them as `bg-lime`, `text-coral`, `border-cyan`,
`bg-surface`, `text-tok-path`, etc. (see `@theme inline`).

## Theme

There is one theme, and it is dark. The palette lives under `:root` with `color-scheme: dark`, and the
root layout puts `class="dark"` on `<html>`, so `dark:` utilities and `light-dark()` pairs written
before the light theme was removed keep resolving to their dark half. There is no theme toggle and no
theme provider. New code uses the tokens directly and needs neither a `dark:` variant nor a
`light-dark()` pair.

- **The homepage uses the same palette.**
  The navbar is a flat bar across the top: the logo and the sections on the left,
  Sign in on the right; a hairline and a light blur come in once the page scrolls. One card highlights its
  links (`.nav-pill`): the section you are in is a solid card popped up out of the bar in the section's
  colour, not an underline, and it glides to the next link as you scroll; the link under the pointer or focus
  gets the same card, lighter, sliding from link to link. Hovering Features opens a panel under the bar laid
  out like Claude's menus: a column per group, a small heading over plain links, the one you are in in its colour.
  Once the page is inside one of the five feature sections, "Features" unfolds in place into a link for
  each (Types, MCP, AI, Capture, Shortcuts) with the card on the current one, and folds back on leaving.
  Its demo windows use the theme's surfaces like the app does (`bg-card`,
  `bg-background` for terminals), pass type colours through `readableColor()` /
  `readableTint()`, and write theme-dependent shadows or keycaps as
  `light-dark()` pairs. The landing page uses the app palette (`src/app/landing.css`
  holds its layout and motion, not colours); its footer is the last sheet and
  uses `--surface` like every second sheet.
  Landing headings are set in a serif (Georgia) at regular weight, never italic; Geist is the
  body face and JetBrains Mono is kept for code and metadata.
  The hero is centred: the headline (its last line in clay, with a pen stroke that
  draws under it) and the two actions in the middle of a ring of cards, with the bin they are
  sorted into below (`HeroSort`). Behind it plays a muted, looping clip of someone at work at a computer, at 1.5× speed
  (`HeroVideo`, `public/hero/desk.mp4`), darkened and faded at the edges; it pauses while the tab is hidden,
  holds still for reduced motion and fades out as the scroll begins. It is the first sheet, with rounded shoulders under the navbar. The sheet after it
  is "how it works" (`HowItWorks`): three stacked cards, each playing
  its idea on a loop with rows in their item type's colour. How the page moves is under [Landing motion](#landing-motion).
  The navbar pause control sets `data-motion-paused`, stopping CSS loops and demo
  clocks through `usePagePaused`; scroll-linked motion keeps following the page.
  Reduced-motion preferences disable CSS animation.
  The sign-in pages and the Privacy and Terms pages share the landing page's look through
  `src/app/brand.css` (imported by the homepage, the `(auth)` layout and `LegalPage`): `.brand` on a page's
  root turns on the landing buttons, and headings use
  a `.brand-serif` title that rises in (`.hero-line`) with a pen stroke under its accent
  word. The auth brand panel is the landing hero in miniature (`HeroLogo`, `HeroVideo`, `.hero-backdrop`), its headline typing what the bin holds (`TypedWord`);
  auth fields are plain boxes that take the accent on focus (`.auth-input`).
- The app has no backdrop. The shell (sidebar, top bar, status bar) sits on `--sidebar`, and the page is a
  sheet in `--background` laid over it with the landing sheets' rounded shoulder at its top left
  (`DashboardLayout`).

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
| Body / UI, buttons, card titles, numbers | Geist | `font-sans` (default) |
| Description text | Geist, in `--muted-foreground` | `text-desc`: page, panel, card and empty-state descriptions, landing and auth intros |
| Headings | Fraunces, upright, regular weight | `font-display` (applied to `h1`–`h4` automatically, with the "soft" axis set); `.brand-serif` for anything else |
| Code, labels, counters, metadata | JetBrains Mono | `font-mono` |

A page or dialog title has no label above it, and
it rises out of its own line on load (`.hero-line`). Counts are `[4]`, tags `#tag`.
Small titles inside cards and rows stay in Geist.

## The app shell

`components/layout/dashboard-layout.tsx` draws the app as an editor window:

| Part | Component | Notes |
| --- | --- | --- |
| Title bar | `top-bar.tsx` | Sits over the page sheet, beside the full-height sidebar, on the shell's surface. A three-column grid with the `>` search prompt (opens ⌘K) centred: example searches type themselves out with an always-blinking caret (`useTypewriter`). `upgrade` and the create buttons (their key on them) on the right; phones get the menu button and logo on the left |
| Explorer | `sidebar.tsx`, `sidebar-nav.tsx` | Runs the full height, headed by the logo, the name and a collapse button (the button fades with the labels; on the rail, hovering the logo turns it into the expand button, with a tooltip and `[`). Each type's digit shortcut sits under its icon as a subscript. Collapses to an icon rail (`<html data-sidebar>`, restored before paint): the width animates, icons stay on the rail's centre line, labels fade, and `.sidebar-fold` blocks fold their height. A row under the pointer gets a light clay tint and the current page's row a stronger one, popped up a step (`.sidebar-row`); nothing slides between rows. Rows swap their count for their shortcut on hover; on the rail a tooltip shows name + key. Free users get the usage grid (`sidebar-usage.tsx`) |
| Page | `main` | A sheet in `--background` with a rounded top-left corner; content enters with `animate-page-in` |
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
| `card-surface` | The one card: see [Cards](#cards) |
| `card-lift` | On a card that opens something: a 2px rise and a touch more of its `--tone` in the surface. The edge doesn't change; no glow, no shadow |
| `card-ink` | Item and collection cards, in place of `card-surface card-lift`: see [Cards](#cards) |
| Animated icons | Icons inside any button, link, `role="button"`/`radio`/`option`, menu item, sidebar row or `[data-anim-icons]` move on hover, each its own way, keyed off lucide's `lucide-*` classes (plus turns, trash wiggles, download bobs, star spins…) |
| `animate-shimmer` | Skeleton loading sweep (used by `<Skeleton />`) |
| `animate-led` | A breathing status LED (status bar) |
| `.logo-mark` | The logo loops every 4.8s: the bit hops, the lid swings open, the bit tumbles in, the bin squashes and squints, the lid snaps shut, a new bit pops in, and it blinks while it waits (`LogoMark`, on by default). Four transform animations a mark; the hero's large mark (`.landing-hero-logo`) also moves its mouth and changes the bit's colour each loop. A mark under about 20px takes `animated={false}`: each running mark repaints its SVG every frame. `BinningLoader` is the same bin, large |
| `.panel-anim` | The sidebar toggle's divider and arrow slide the way the panel will go on hover |
| `shimmer-text` | A light sweeping across text (the agent spinner's verb) |

### Landing motion

The landing page's motion lives in `src/app/landing.css`. Two kinds, kept apart:

**Loops**, which the navbar's pause control stops: the demos in the sheets below the hero, and the turning of the hero's ring.

**The hero's story** (`HeroSort`) is told by the scroll. The hero is four screens tall and pins its
contents under the navbar (`.hero-pin`); how far through it the page is (0 to 1) is the clock.
At the top, twelve cards, each led by the large logo of the app it is stuck in with a short name under it, ride a ring
around the headline. The ring is wider than the screen, so cards come and go at its edges; it turns by itself, quicker
under the pointer, the scroll carries it along, and a wheel-up at the very top spins it backwards. One card at a time
goes dashed and wears a `?`. The bin waits at the foot of the screen. Scrolling lifts the words away, raises the bin to
the middle of the ring, and brings the cards in one after another, each into the panel for its type (six
panels, two cards each: three to a row on a wide screen, two on a phone), whose count goes up as it lands. A card spins
a full turn on the way and shrinks into its slot while the app's face melts into a BitBin item card with its type
(`data-kept` says it is past half way). The loop writes each value on the element it moves, never as a custom property on the section or the bin, which would restyle everything inside on every frame. Nothing about a card is see-through, faded or glowing. With
everything in, `debounce` is typed into the bin's search and the match lifts out of its row, with the footer's caption
changing from what you'd be muttering ("which tab was that in?") to what you have. Scrolling back plays it in reverse.
The switch in the bin's footer (its knob carries the logo, Without BitBin / With BitBin) shows which state is on screen
and is a real control: a click scrolls to the other end of the story. One frame loop writes every card's place straight
to the DOM, so React re-renders only when a card lands or leaves. The bin is a container sized in `cqw`, so it scales
as one piece; its title bar and footer are scaled by `--k`, so they keep their size when the bin is wider. Under reduced motion nothing is pinned: the words, then the bin, sorted and still.

**Scroll-linked motion**, written with CSS scroll timelines
(`animation-timeline: view()` / `scroll()`), so it runs off the main thread, plays
backwards on the way up and needs no JavaScript. Nothing travels against the
scroll as it enters; blocks hinge, tilt and widen in place.

| What | How |
| --- | --- |
| Sheets | Every `main > section` is opaque, alternates `--surface` / `--background` (the hero is the first, starting under the navbar), has rounded shoulders and overlaps the end of the one before. While it is covered, the outgoing section's inner block sinks, shrinks and dims (`sheet-recede`). The section itself never moves, so in-page links and the scroll spy measure the real layout |
| `data-scroll="unfold"` | Hinged at its top edge, the block swings up to face you |
| `data-scroll="tilt"` | Lies back like a screen and stands up (the hero demo, the shortcuts demo) |
| `data-scroll="book-left"` / `"book-right"` | A pair opens like two pages (pricing cards, the data and privacy panels). `unfold` below 768px |
| `data-scroll="widen"` | Grows outward from its middle |
| `data-scroll="cascade"` / `"stack"` | On a parent: its children open one after another across a row, or each as it arrives down a column (the FAQ) |
| `.ink` | A section heading is inked in reading order as it climbs the screen (`SectionHeading` wraps the title) |
| `.flow-stack` | The "how it works" cards are `position: sticky` and stack; each shrinks a step while the next covers it |

Use `data-scroll` for a large block (a window, a card, a panel) and keep
`data-reveal` for text and small controls. Don't put both on one element, and don't
put `data-scroll` on a `position: sticky` element. Browsers without scroll timelines
fall back to the timed `data-reveal` fade (`useReveal` marks both attributes).

Landing buttons (`.landing .btn-primary`, `.btn-secondary`) don't lift. The arrow
sits in a round badge, which is a circle clipped out of a full-size layer
(`::before`); on hover the circle grows until its colour is the whole button, the
label takes the contrasting colour, and the arrow rides out on the right as a
second comes in from the left. A button with no arrow fills from where the pointer
came in (`--mx` / `--my`, written by `usePointerEffects`). "See it in action" draws
its underline, and its ringed arrow fills with clay and drops through.

Other helpers: `bg-grid`, `bg-dots`, `mask-radial`, `noise`,
`text-brand-gradient` (the accent word of a heading, solid clay), `thin-scrollbar`.

`prefers-reduced-motion: reduce` disables all animations and transitions
globally; `<AnimatedNumber />` jumps straight to its final value.

## Buttons

`.btn` (globals.css) is the landing and sign-in pages' button, with the fill described under
[Landing motion](#landing-motion). Variants: `.btn-primary` (clay), `.btn-secondary`, `.btn-terminal`
(mono, `$` prompt and caret, in the landing demos).

Every app button is **the landing page's button** (`.term-btn`, on every `<Button>` variant but `ghost`
and `link`): a flat block with a Geist label and a 10px corner. On hover a second colour (`--btn-fill`)
grows out as a circle from where the pointer came in (`--mx` / `--my`, written by `useButtonFill`, one
document listener mounted by `DashboardLayout`; from the bottom edge without it) until it is the whole
button, and the label takes the contrasting colour (`--btn-ink`). No lift, no sheen, no glow; it shrinks a
little on press. `.term-primary` (default variant) is clay filling with ink, `.term-outline` (outline /
secondary) a card filling with a tint of its accent, `.term-danger` fills red, and `.term-bare` (the theme
toggle, toolbar icons) shows only its icon at rest. Set `--grid-color` to retint an outline button (the
quick-create chips use the item type's colour); its icon wears that colour. Give a text button an icon and
write its label in sentence case. `.btn-kbd` inside is a flat keycap in the label's colour. An outline toggle that is on
(`aria-pressed="true"`: the drawer's Favorite and Pin, each in its own `--btn-accent`) keeps its tint. A
picker's trigger adds `term-field`: no fill, only a neutral step lighter on hover, like a field. The GitHub
sign-in button keeps its contribution grid (`.gh-button`, `<ContribGrid />`).

**Text fields** are the landing page's search box. `<Input>` and `<Textarea>` render inside a
`.field-frame`: a plain box in the card colour with a 10px corner whose edge takes the accent on focus,
with a soft ring round it; the field's label takes the accent too. The accent is `--ring`: clay, or
whatever a dialog sets. The tag box uses the same frame (put `field-frame` on a custom box's container).
The code and markdown editors are windows (`.editor-window`): an editable one idles with grey traffic
lights, and on focus the lights come on, an accent line draws along its top edge like an active editor
tab, and the border and language label take the accent.

## Cards

The card is `card-surface` (a utility in `globals.css`): opaque, the card colour, a neutral hairline
edge and a 22px corner (`--card-radius`, 18px on a phone; `rounded-card` for anything that only needs the
corner). No blur, no transparency, no gradient wash, no drop shadow and no glowing, coloured or animated
border. Set `--tone` on it and a little of that colour (7%, 11% on hover for a `card-lift` card) is mixed
into the surface as a solid colour; fills on a card (a type chip, a tag) are solid mixes too, never a
colour over `transparent`:

| Card | `--tone` |
| --- | --- |
| Item cards, image cards | The item type's colour, through `readableColor()`, on `card-ink` (below) |
| Collection cards | `--brand-cyan` (sage), on `card-ink` (below) |
| The Pro plan card | Clay at the landing pricing card's strength (34% into `--plan-ink`); the Free card sits on `--plan-ink` |
| A danger `Panel` | None: plain `--card` with a red hairline |
| Panels, the dashboard overview, lists, the Free plan card, `<Card>` | None: plain `--card` |

Dialogs and the item drawer are the same shape (`rounded-card`, `bg-card`, `--shadow-lift`) over a plain
dimmed overlay. Tiles nested in a card (a code preview, a stat, a usage meter) are `rounded-xl` boxes in
`--background` with a hairline. A new card uses `card-surface`; never write `bg-card/80`,
`backdrop-blur` or a coloured `box-shadow`.

Item and collection cards (`ItemCard`, `ImageThumbnailCard`, `CollectionCard`) are the exception:
`card-ink` gives them the overview card's brown (`--card-ink`, the same as `--card`) with the same neutral hairline, and on hover they only
rise (no colour, no glow). The `--tone` stays off the card itself. On an item card it shows where an
editor would show it: the type chip (mixed into `--card-ink`), a snippet's line numbers and gutter rule,
a command's `$`, a link's icon, and the rule beside a prompt's or note's excerpt. Every preview is the same
rounded `--background` tile with a hairline, so it reads darker than the card. On a collection card it is the folder icon's sage, beside the bar of its item types.

> `.btn` and `.btn-kbd` are unlayered CSS, so they beat Tailwind utilities such
> as `hidden` or `sm:inline-flex`. Put responsive visibility on a wrapper
> element, not on the `.btn` itself.

## Reusable pieces

| Component | Path | Use |
| --- | --- | --- |
| `PageHeader` | `components/shared/page-header.tsx` | Kicker, serif title that rises in, `[count]`, description, actions |
| `SectionHeader` | `components/dashboard/section-header.tsx` | Serif title, `[n]`, a hairline and a `View all →` link over a section |
| `Panel` / `ProTag` | `components/shared/panel.tsx` | Settings/profile card with a header (icon, serif title, description); `tone="danger"` |
| `EmptyState` | `components/shared/empty-state.tsx` | The bin, a title and what to do next |
| `Kbd` | `components/shared/kbd.tsx` | Key caps for a shortcut hint |
| `UsageMeter` | `components/shared/usage-meter.tsx` | `items 18 / 50` over a bar that turns coral at 90% |
| `ItemCard` | `components/dashboard/item-card.tsx` | Grid card: type chip, title, code/URL preview with "+N more", tag chips; hover toolbar (copy, favorite, pin, ⋯ menu with delete) |
| `ItemRow` | `components/items/item-row.tsx` | One item per line, for the list view (`ItemsView`) and favorites |
| `BinOverview` | `components/dashboard/bin-overview.tsx` | The dashboard's overview card: counters and the per-type bar |
| `QuickCreate` | `components/dashboard/quick-create.tsx` | `New` and a chip per type, each in the type's colour |
| `AgentSpinner`, `ToolLine`, `ResultLine` | `components/shared/agent-spinner.tsx` | `✻ Indexing…` loading states; `⏺ Load(…)` / `⎿ result` lines |
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
