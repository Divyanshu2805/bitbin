"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Download,
  File,
  FolderOpen,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor, readableTint as tint } from "@/lib/utils/color";
import { MOCK_SIDEBAR, MockCollectionRow, MockNavRow, MockSearch, MockSectionLabel } from "./mock-app";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { CycleWord } from "./CycleWord";
import { Accent, Section } from "./ui";

// "What goes in the bin": a circular carousel with one card per item type.
// Each card shows the item as BitBin would: a small window with its title,
// content, tags and collection. The cards sit on a ring, so there are always
// neighbours on both sides; the centre one is `.is-active`, and its content
// animates every time it comes round (the animations are keyed on that class,
// so they restart). It autoplays while on screen, pausing while the pointer is on a card.

/** Replays each time the card becomes active; neighbours show the content still. */
const ON_ACTIVE = "in-[.is-active]:animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]";
const AUTOPLAY_MS = 2000;

type Card = {
  icon: LucideIcon;
  name: string;
  color: string;
  count: string;
  text: string;
  pro?: boolean;
  item: { title: string; meta?: string; action?: React.ReactNode; tags: string[]; where: string };
  preview: React.ReactNode;
};

const CopyAction = ({ delay }: { delay: string }) => (
  <span
    className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors in-[.is-active]:border-[var(--accent-color)]/40 in-[.is-active]:text-[var(--accent-color)]"
    style={{ transitionDelay: delay }}
  >
    <Copy className="size-3" />
    copy
  </span>
);

const CARDS: Card[] = [
  {
    icon: Code,
    name: "Snippets",
    color: "#60a5fa",
    count: "42",
    text: "Reusable code with syntax highlighting, language detection and one-click copy.",
    item: { title: "sleep.ts", meta: "typescript", action: <CopyAction delay="1300ms" />, tags: ["async", "utils"], where: "React utils · 2d" },
    preview: (
      <pre className="overflow-hidden font-mono text-[12.5px] leading-[1.75]">
        {[
          <><span className="text-tok-kw">export const</span> <span className="text-tok-fn">sleep</span> = (ms: <span className="text-tok-type">number</span>) =&gt;</>,
          <>{"  "}<span className="text-tok-kw">new</span> <span className="text-tok-type">Promise</span>((r) =&gt; <span className="text-tok-fn">setTimeout</span>(r, ms));</>,
          <>{" "}</>,
          <><span className="text-tok-kw">await</span> <span className="text-tok-fn">sleep</span>(<span className="text-tok-num">250</span>); <span className="caret" /></>,
        ].map((line, i) => (
          <span key={i} className={cn("block whitespace-pre", ON_ACTIVE)} style={{ animationDelay: `${250 + i * 180}ms` }}>
            <span className="mr-4 inline-block w-3 select-none text-right text-muted-foreground/40">{i + 1}</span>
            {line}
          </span>
        ))}
      </pre>
    ),
  },
  {
    icon: Sparkles,
    name: "Prompts",
    color: "#a78bfa",
    count: "18",
    text: "Your prompt library for Claude, ChatGPT and friends, with variables you fill in.",
    item: { title: "Code review", meta: "prompt", action: <CopyAction delay="600ms" />, tags: ["review", "claude"], where: "Prompt kit · 5d" },
    preview: (
      <div className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
        <p className={ON_ACTIVE} style={{ animationDelay: "200ms" }}>
          You are a senior engineer. Review this{" "}
          <span className="inline-block rounded" style={{ background: tint("#a78bfa", 15), color: readableColor("#a78bfa") }}>
            <CycleWord words={["TypeScript", "Go", "Rust", "Python"]} className="inline-block min-w-[6.2rem] px-1.5 font-mono text-[12px]" />
          </span>{" "}
          code for bugs.
        </p>
        <p className={ON_ACTIVE} style={{ animationDelay: "450ms" }}>
          Explain each issue in one sentence, then suggest a fix as a diff.
        </p>
      </div>
    ),
  },
  {
    icon: Terminal,
    name: "Commands",
    color: "#fb923c",
    count: "67",
    text: "Shell incantations one copy away. No more digging through history.",
    item: { title: "Squash the last 3 commits", meta: "bash", action: <CopyAction delay="900ms" />, tags: ["git"], where: "Infra · 1w" },
    preview: (
      <div className="space-y-1.5 font-mono text-[12.5px]">
        <p className={cn("flex gap-2", ON_ACTIVE)} style={{ animationDelay: "250ms" }}>
          <span className="text-lime">$</span>
          <span>
            <span className="text-tok-fn">git</span> rebase -i HEAD~3
          </span>
        </p>
        <p className={cn("flex gap-2", ON_ACTIVE)} style={{ animationDelay: "550ms" }}>
          <span className="text-lime">$</span>
          <span>
            <span className="text-tok-fn">git</span> push --force-with-lease
          </span>
        </p>
      </div>
    ),
  },
  {
    icon: StickyNote,
    name: "Notes",
    color: "#fde047",
    count: "12",
    text: "Markdown notes, rendered, next to the code they explain.",
    item: { title: "Deploy checklist", meta: "markdown", tags: ["ops"], where: "Infra · 3d" },
    preview: (
      <div className="space-y-1.5 text-[13px] leading-relaxed">
        <p className="font-display text-[14px] font-semibold">Before every release</p>
        {["Run migrations against prod", "Bump the version", "Purge the CDN cache"].map((task, i) => (
          <p key={task} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="grid size-3.5 shrink-0 place-items-center rounded-sm border border-border text-[9px] text-transparent in-[.is-active]:animate-[tick_0.4s_ease-out_both]"
              style={{ animationDelay: `${350 + i * 350}ms` }}
            >
              ✓
            </span>
            {task}
          </p>
        ))}
      </div>
    ),
  },
  {
    icon: LinkIcon,
    name: "Links",
    color: "#34d399",
    count: "29",
    text: "Bookmarks that remember why you saved them.",
    item: {
      title: "React reference",
      meta: "link",
      action: <ArrowUpRight className="size-3.5 text-muted-foreground" />,
      tags: ["docs", "react"],
      where: "React utils · 2w",
    },
    preview: (
      <div className="space-y-2.5">
        <p className={cn("flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2", ON_ACTIVE)} style={{ animationDelay: "200ms" }}>
          <span
            className="grid size-6 shrink-0 place-items-center rounded-md font-mono text-[11px] font-bold"
            style={{ background: tint("#58c4dc", 15), color: readableColor("#58c4dc") }}
          >
            R
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] text-foreground">Built-in React Hooks</span>
            <span className="block truncate font-mono text-[11px] text-muted-foreground">react.dev/reference/react/hooks</span>
          </span>
        </p>
        <p className={cn("text-[12.5px] text-muted-foreground", ON_ACTIVE)} style={{ animationDelay: "550ms" }}>
          “The one page I open every time I forget what useLayoutEffect is for.”
        </p>
      </div>
    ),
  },
  {
    icon: File,
    name: "Files",
    color: "#9ca3af",
    count: "8",
    text: "Configs, docs and archives, stored with the code that uses them.",
    pro: true,
    item: { title: "nginx.conf", meta: "2.4 KB", action: <Download className="size-3.5 text-muted-foreground" />, tags: ["infra", "nginx"], where: "Infra · 4d" },
    preview: (
      <div className="font-mono text-[12px] text-muted-foreground">
        <div className="space-y-0.5 text-[12px] leading-[1.7]">
          <p className={ON_ACTIVE} style={{ animationDelay: "150ms" }}>
            <span className="text-tok-kw">server</span> {"{"}
          </p>
          <p className={cn("pl-4", ON_ACTIVE)} style={{ animationDelay: "300ms" }}>
            <span className="text-tok-fn">listen</span> <span className="text-tok-num">443</span> ssl;
          </p>
          <p className={cn("pl-4", ON_ACTIVE)} style={{ animationDelay: "450ms" }}>
            <span className="text-tok-fn">proxy_pass</span> http://api:3000;
          </p>
          <p className={ON_ACTIVE} style={{ animationDelay: "600ms" }}>{"}"}</p>
        </div>
        <span className="mt-3 block h-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full origin-left rounded-full bg-lime in-[.is-active]:animate-[bar-fill_1.1s_cubic-bezier(0.65,0,0.35,1)_0.2s_both]" />
        </span>
        <p className={cn("mt-1.5 flex items-center gap-1.5 text-[10.5px] text-lime", ON_ACTIVE)} style={{ animationDelay: "1.3s" }}>
          <Check className="size-3" /> uploaded
        </p>
      </div>
    ),
  },
  {
    icon: ImageIcon,
    name: "Images",
    color: "#f472b6",
    count: "5",
    text: "Screenshots and diagrams, with previews.",
    pro: true,
    item: { title: "architecture.png", meta: "1920×1080", action: <Download className="size-3.5 text-muted-foreground" />, tags: ["diagram"], where: "Infra · 6d" },
    preview: <ArchitectureDiagram />,
  },
  {
    icon: FolderOpen,
    name: "Collections",
    color: "#c2f24b",
    count: "∞",
    text: "Group anything by project or topic. One item can live in many.",
    item: { title: "Collections", meta: "4", tags: ["favorites"], where: "42 items" },
    preview: (
      // The sidebar's collections: folders in their colours, the open one on the lime pill
      <ul className="space-y-0.5 pl-2 text-[13px]">
        {(
          [
            ["React utils", 14, "#60a5fa"],
            ["Infra", 12, "#fb923c"],
            ["Interview prep", 9, "#a78bfa"],
            ["Prompt kit", 7, "#34d399"],
          ] as const
        ).map(([name, n, color], i) => (
          <li key={name} className={ON_ACTIVE} style={{ animationDelay: `${200 + i * 140}ms` }}>
            <MockCollectionRow name={name} color={color} count={n} active={i === 0} />
          </li>
        ))}
      </ul>
    ),
  },
];

/** A tiny system diagram standing in for a saved screenshot. */
function ArchitectureDiagram() {
  const box = "fill-[var(--background)] stroke-[var(--border)]";
  const label = "fill-[var(--muted-foreground)] font-mono text-[9px]";
  return (
    <svg viewBox="0 0 280 110" className="h-auto max-h-[150px] w-full" role="img" aria-label="A diagram: web to api, api to postgres and redis">
      {[
        { x: 8, y: 40, w: 60, name: "web" },
        { x: 110, y: 40, w: 60, name: "api" },
        { x: 212, y: 12, w: 60, name: "postgres" },
        { x: 212, y: 68, w: 60, name: "redis" },
      ].map((b, i) => (
        <g key={b.name} className={ON_ACTIVE} style={{ animationDelay: `${150 + i * 150}ms` }}>
          <rect x={b.x} y={b.y} width={b.w} height={30} rx={6} className={box} />
          <text x={b.x + b.w / 2} y={b.y + 19} textAnchor="middle" className={label}>
            {b.name}
          </text>
        </g>
      ))}
      {["M68 55 H110", "M170 50 C190 50 192 27 212 27", "M170 60 C190 60 192 83 212 83"].map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={readableColor("#f472b6")}
          strokeWidth={1.5}
          strokeDasharray={80}
          strokeDashoffset={80}
          className="in-[.is-active]:animate-[draw_0.7s_ease-out_both]"
          style={{ animationDelay: `${650 + i * 180}ms` }}
        />
      ))}
    </svg>
  );
}

/**
 * A card is a small BitBin window, like the hero demo: window chrome with the
 * search bar, the type sidebar with this card's type selected, then the item open
 * in the main pane (tab, title, content, tags). The sidebar shows once the
 * window is wide enough.
 */
function AppWindow({ card, index }: { card: Card; index: number }) {
  const Icon = card.icon;
  const { title, meta, action, tags, where } = card.item;
  return (
    <div className="@container flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-[0_30px_70px_-34px_light-dark(rgb(20_22_26/0.22),rgb(0_0_0/0.9))]">
      {/* Window chrome */}
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-3.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <MockSearch className="mx-auto hidden h-6 w-56 @[420px]:flex" />
        <span className="ml-auto font-mono text-[10.5px] text-muted-foreground/60 tabular-nums @[420px]:ml-0">
          {String(index + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
        </span>
      </div>

      <div className="grid h-[300px] grid-cols-1 @[600px]:grid-cols-[164px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className={cn("hidden flex-col gap-0.5 border-r border-border p-2.5 @[600px]:flex", MOCK_SIDEBAR)}>
          <MockSectionLabel>types</MockSectionLabel>
          {CARDS.map((type) => (
            // The app's sidebar row: the card's type sits on the lime pill
            <MockNavRow
              key={type.name}
              icon={type.icon}
              iconColor={type.name === "Collections" ? undefined : type.color}
              label={type.name}
              count={type.count}
              active={type.name === card.name}
            />
          ))}
        </aside>

        {/* Main pane: the item, open in a tab */}
        <div className="flex min-w-0 flex-col">
          <div className="flex h-8 shrink-0 items-stretch border-b border-border bg-surface/60 font-mono text-[11px]">
            <span className="relative flex items-center gap-1.5 border-r border-border bg-card px-3 text-foreground">
              <Icon className="size-3.5" style={{ color: readableColor(card.color) }} />
              <span className="max-w-[16rem] truncate">{title}</span>
              <span className="absolute inset-x-0 top-0 h-px" style={{ background: readableColor(card.color) }} />
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-3.5 pb-3">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-semibold">{title}</p>
              {meta ? <span className="shrink-0 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">{meta}</span> : null}
              {card.pro ? <span className="shrink-0 rounded border border-coral/30 bg-coral/10 px-1.5 font-mono text-[10px] font-semibold text-coral">PRO</span> : null}
              {action ? <span className="ml-auto shrink-0">{action}</span> : null}
            </div>
            <div className="mt-3.5 min-h-0 flex-1 overflow-hidden">{card.preview}</div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
              {tags.map((tag) => (
                <span key={tag} className="rounded-md border px-1.5" style={{ borderColor: tint(card.color, 25), background: tint(card.color, 7), color: readableColor(card.color) }}>
                  #{tag}
                </span>
              ))}
              <span className="ml-auto truncate pl-2">{where}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shortest signed distance from `active` to `i` around the ring of cards. */
function ringOffset(i: number, active: number) {
  const n = CARDS.length;
  let d = (((i - active) % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

const SLIDE_W = "min(680px, 100vw - 40px)";

export default function TypesGrid() {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const wheelAt = useRef(0);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const inView = useInView(root, { threshold: 0.35 });
  const paused = usePagePaused();
  const playing = inView && !hovered && !focused && !paused;

  const goTo = useCallback((i: number) => setActive(((i % CARDS.length) + CARDS.length) % CARDS.length), []);

  // Autoplay: the next card every AUTOPLAY_MS, round and round, while on screen,
  // unless the pointer is on a card or the keyboard is in the carousel. Any change of card restarts the clock.
  useEffect(() => {
    if (!playing || prefersReducedMotion()) return;
    const id = window.setTimeout(() => goTo(active + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, active, goTo]);

  return (
    <Section
      id="types"
      index="01.1"
      label="item types"
      title={
        <>
          Seven item types. <Accent>One place to find them.</Accent>
        </>
      }
      description="Everything a developer copies, pastes and forgets, with a title, tags, a description and as many collections as you like."
    >
      <div
        ref={root}
        data-reveal
        // Keyboard focus pauses; a mouse click that leaves focus behind doesn't.
        onFocus={(e) => e.target.matches(":focus-visible") && setFocused(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
      >
        {/* The stage: full-bleed, every card stacked in one grid cell and moved by
            its distance from the active one, so there are always cards either side. */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Item types"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") goTo(active + 1);
            else if (e.key === "ArrowLeft") goTo(active - 1);
          }}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, moved: false };
          }}
          onPointerUp={(e) => {
            const start = drag.current;
            if (!start) return;
            const dx = e.clientX - start.x;
            if (Math.abs(dx) > 40) {
              start.moved = true;
              goTo(active + (dx < 0 ? 1 : -1));
            }
          }}
          onWheel={(e) => {
            if (Math.abs(e.deltaX) < 24 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
            const now = performance.now();
            if (now - wheelAt.current < 500) return;
            wheelAt.current = now;
            goTo(active + (e.deltaX > 0 ? 1 : -1));
          }}
          className="relative left-1/2 grid w-screen -translate-x-1/2 touch-pan-y justify-items-center overflow-hidden pt-8 pb-24 -mb-16 outline-none select-none [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]"
        >
          {CARDS.map((card, i) => {
            const d = ringOffset(i, active);
            const isActive = d === 0;
            const shown = Math.abs(d) <= 2;
            return (
              <article
                key={card.name}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${CARDS.length}: ${card.name}`}
                aria-hidden={!isActive}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                onClick={() => {
                  if (drag.current?.moved) return;
                  if (!isActive) goTo(i);
                }}
                style={
                  {
                    "--accent-color": readableColor(card.color),
                    width: SLIDE_W,
                    zIndex: 10 - Math.abs(d),
                    opacity: isActive ? 1 : shown ? (Math.abs(d) === 1 ? 0.5 : 0.2) : 0,
                    filter: isActive ? "none" : `blur(${Math.abs(d) === 1 ? 1 : 2.5}px)`,
                    transform: `translateX(calc(${d} * (${SLIDE_W} + 20px))) scale(${isActive ? 1 : 0.9})`,
                    pointerEvents: shown ? undefined : "none",
                  } as React.CSSProperties
                }
                className={cn(
                  "relative transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [grid-area:1/1]",
                  isActive ? "is-active" : "cursor-pointer"
                )}
              >
                {/* A soft glow in the type's colour under the active window, like the hero demo */}
                <span
                  aria-hidden
                  className="absolute -inset-x-10 -top-8 -bottom-14 -z-10 rounded-[3rem] opacity-0 blur-2xl transition-opacity duration-700 in-[.is-active]:opacity-100"
                  style={{ background: `radial-gradient(closest-side, ${tint(card.color, 14)}, transparent)` }}
                />
                <AppWindow card={card} index={i} />
              </article>
            );
          })}
        </div>

        {/* Caption for the active card */}
        <div key={active} className="relative z-10 mx-auto -mt-2 mb-5 max-w-xl text-center animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]" aria-live="polite">
          <p className="flex items-center justify-center gap-2 font-display text-lg font-bold tracking-tight">
            <CaptionIcon card={CARDS[active]} />
            {CARDS[active].name}
            <span className="font-mono text-[11px] font-normal text-muted-foreground">{CARDS[active].count} saved</span>
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{CARDS[active].text}</p>
        </div>

        {/* Controls, centred: previous, a tab per type (the active one fills as
            autoplay counts down), next. Below sm only the active tab shows its name. */}
        <div className="mt-2 flex justify-center">
          <div className="flex max-w-full items-center gap-1 rounded-[10px] border border-border bg-card/70 p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),var(--btn-drop)] backdrop-blur-md">
            <ArrowButton label="Previous type" onClick={() => goTo(active - 1)}>
              <ChevronLeft className="size-4" />
            </ArrowButton>
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CARDS.map((card, i) => {
                const current = i === active;
                const Icon = card.icon;
                return (
                  <button
                    key={card.name}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Show ${card.name}`}
                    aria-current={current}
                    className={cn(
                      "relative isolate flex h-8 shrink-0 items-center gap-1.5 overflow-hidden rounded-md px-2.5 font-mono text-[12px] transition-colors duration-300",
                      current ? "text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                    style={current ? { background: tint(card.color, 12), boxShadow: `inset 0 0 0 1px ${tint(card.color, 38)}` } : undefined}
                  >
                    <Icon className="size-3.5 shrink-0" style={{ color: current ? readableColor(card.color) : undefined }} />
                    <span className={cn(current ? "inline" : "hidden sm:inline")}>{card.name}</span>
                    {current ? (
                      <>
                        {/* The countdown: the tab fills with its colour, and a bar runs along its bottom */}
                        <span
                          key={`fill-${active}`}
                          aria-hidden
                          className="absolute inset-0 -z-10 origin-left animate-[bar-fill_linear_both]"
                          style={{
                            background: tint(card.color, 18),
                            animationDuration: `${AUTOPLAY_MS}ms`,
                            animationPlayState: playing ? "running" : "paused",
                          }}
                        />
                        <span
                          key={`bar-${active}`}
                          aria-hidden
                          className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[bar-fill_linear_both]"
                          style={{
                            background: readableColor(card.color),
                            animationDuration: `${AUTOPLAY_MS}ms`,
                            animationPlayState: playing ? "running" : "paused",
                          }}
                        />
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <ArrowButton label="Next type" onClick={() => goTo(active + 1)}>
              <ChevronRight className="size-4" />
            </ArrowButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ArrowButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function CaptionIcon({ card }: { card: Card }) {
  const Icon = card.icon;
  return (
    <span className="grid size-7 place-items-center rounded-md" style={{ background: tint(card.color, 8), color: readableColor(card.color), boxShadow: `inset 0 0 0 1px ${tint(card.color, 20)}` }}>
      <Icon className="size-4" />
    </span>
  );
}
