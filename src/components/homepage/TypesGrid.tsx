"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
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
import { scrollToY } from "@/lib/smooth-scroll";
import { Accent, Section } from "./ui";

// "What goes in the bin": a stack of cards, one per item type and one for
// collections. Each card shows the item as BitBin would: a small window with
// the item panel's header, its content, tags and collection, with what the type
// is for written beside it: on the right of the first window, the left of the
// second, and so on down the stack (under the window on a narrow screen). The
// page's scroll drives it: a card sticks in the middle of the screen and the
// next scrolls up over it, so the cards pile up one by one with their top edges
// showing (like the "how it works" stack); the page moves on once the last has
// landed. The newest card is `.is-active`, and
// its content animates as it comes up (the animations are keyed on that class).

/** Plays when the card becomes the newest; the others show the content still. */
const ON_ACTIVE = "in-[.is-active]:animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]";
/** The window's body grows with the screen, so a stuck card fills it on a phone and on a desktop. */
const BODY_H = "clamp(320px, 52svh, 520px)";
/** Where the first card sticks on a narrow screen: centred (the chrome, the card's padding, the text under the window and the stack's edges add about 300px), and never under the navbar. */
const PIN_TOP = `max(5.5rem, calc((100svh - ${BODY_H} - 300px) / 2))`;
/** The same on a wide screen, where the text sits beside the window, so less is added. */
const PIN_TOP_WIDE = `max(5.5rem, calc((100svh - ${BODY_H} - 160px) / 2))`;
/** How much lower each card sticks than the one before, in pixels. */
const PEEK = 8;
/** The space between two cards as they scroll, in pixels. */
const GAP = 32;
/** A card: the window and its text side by side, and never wider than the section. */
const CARD_W = "min(1120px, 100%)";

type Card = {
  icon: LucideIcon;
  name: string;
  /** The type's own name, as the item panel writes it under the title */
  type: string;
  color: string;
  count: string;
  text: string;
  pro?: boolean;
  item: { title: string; meta?: string; action?: React.ReactNode; tags: string[]; collection?: string; age: string };
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

// In the sidebar's order: the seven types (the digits 1–7 open them), then collections
const CARDS: Card[] = [
  {
    icon: Code,
    name: "Snippets",
    type: "snippet",
    color: "#60a5fa",
    count: "42",
    text: "Reusable code with syntax highlighting, language detection and one-click copy.",
    item: { title: "sleep.ts", meta: "typescript", action: <CopyAction delay="1300ms" />, tags: ["async", "utils"], collection: "React utils", age: "2d ago" },
    preview: (
      <pre className="overflow-hidden font-mono text-[12.5px] leading-[1.75]">
        {[
          <><span className="text-tok-kw">export const</span> <span className="text-tok-fn">sleep</span> = (ms: <span className="text-tok-type">number</span>) =&gt;</>,
          <>{"  "}<span className="text-tok-kw">new</span> <span className="text-tok-type">Promise</span>((r) =&gt; <span className="text-tok-fn">setTimeout</span>(r, ms));</>,
          <>{" "}</>,
          <><span className="text-tok-kw">export async function</span> <span className="text-tok-fn">retry</span>&lt;<span className="text-tok-type">T</span>&gt;(fn: () =&gt; <span className="text-tok-type">Promise</span>&lt;<span className="text-tok-type">T</span>&gt;, tries = <span className="text-tok-num">3</span>) {"{"}</>,
          <>{"  "}<span className="text-tok-kw">for</span> (<span className="text-tok-kw">let</span> i = <span className="text-tok-num">1</span>; ; i++) {"{"}</>,
          <>{"    "}<span className="text-tok-kw">try</span> {"{"}</>,
          <>{"      "}<span className="text-tok-kw">return await</span> <span className="text-tok-fn">fn</span>();</>,
          <>{"    } "}<span className="text-tok-kw">catch</span> (err) {"{"}</>,
          <>{"      "}<span className="text-tok-kw">if</span> (i === tries) <span className="text-tok-kw">throw</span> err;</>,
          <>{"      "}<span className="text-tok-kw">await</span> <span className="text-tok-fn">sleep</span>(<span className="text-tok-num">250</span> * i);</>,
          <>{"    }"}</>,
          <>{"  }"}</>,
          <>{"}"} <span className="caret" /></>,
        ].map((line, i) => (
          <span key={i} className={cn("block whitespace-pre", ON_ACTIVE)} style={{ animationDelay: `${200 + i * 80}ms` }}>
            <span className="mr-4 inline-block w-4 select-none text-right text-faint dark:text-muted-foreground/40">{i + 1}</span>
            {line}
          </span>
        ))}
      </pre>
    ),
  },
  {
    icon: Sparkles,
    name: "Prompts",
    type: "prompt",
    color: "#a78bfa",
    count: "18",
    text: "Your prompt library for Claude, ChatGPT and friends, written in Markdown and one copy away.",
    item: { title: "Code review", meta: "markdown", action: <CopyAction delay="600ms" />, tags: ["review", "claude"], collection: "Prompt kit", age: "5d ago" },
    preview: (
      <div className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
        <p className={ON_ACTIVE} style={{ animationDelay: "200ms" }}>
          You are a senior engineer. Review the code below for <strong className="font-semibold text-foreground">bugs</strong> and{" "}
          <strong className="font-semibold text-foreground">unclear names</strong>.
        </p>
        <p className={ON_ACTIVE} style={{ animationDelay: "400ms" }}>
          Explain each issue in one sentence, then suggest a fix as a diff.
        </p>
        <ul className={cn("list-disc space-y-1 pl-5", ON_ACTIVE)} style={{ animationDelay: "600ms" }}>
          <li>Quote the line you mean.</li>
          <li>Skip anything a linter would catch.</li>
          <li>If nothing is wrong, say so in one line.</li>
        </ul>
        <p className={cn("rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px]", ON_ACTIVE)} style={{ animationDelay: "800ms" }}>
          <span className="text-tok-kw">{"{{"}</span>code<span className="text-tok-kw">{"}}"}</span>
        </p>
      </div>
    ),
  },
  {
    icon: Terminal,
    name: "Commands",
    type: "command",
    color: "#fb923c",
    count: "67",
    text: "Shell incantations one copy away. No more digging through history.",
    item: { title: "Squash the last 3 commits", meta: "bash", action: <CopyAction delay="900ms" />, tags: ["git"], collection: "Infra", age: "1w ago" },
    preview: (
      <div className="space-y-1.5 font-mono text-[12.5px]">
        {(
          [
            ["# squash the last three into one", null],
            ["git", "rebase -i HEAD~3"],
            ["# push without clobbering a teammate", null],
            ["git", "push --force-with-lease"],
            ["# went wrong? step back", null],
            ["git", "reflog"],
            ["git", "reset --hard HEAD@{1}"],
          ] as const
        ).map(([head, rest], i) => (
          <p key={i} className={cn("flex gap-2", rest === null && i > 0 && "pt-2", ON_ACTIVE)} style={{ animationDelay: `${200 + i * 130}ms` }}>
            {rest === null ? (
              <span className="text-faint dark:text-muted-foreground/50">{head}</span>
            ) : (
              <>
                <span className="text-lime">$</span>
                <span>
                  <span className="text-tok-fn">{head}</span> {rest}
                </span>
              </>
            )}
          </p>
        ))}
      </div>
    ),
  },
  {
    icon: StickyNote,
    name: "Notes",
    type: "note",
    color: "#fde047",
    count: "12",
    text: "Markdown notes, rendered, next to the code they explain.",
    item: { title: "Deploy checklist", meta: "markdown", tags: ["ops"], collection: "Infra", age: "3d ago" },
    preview: (
      <div className="text-[13px] leading-relaxed">
        {(
          [
            ["Before every release", ["Run migrations against prod", "Bump the version", "Purge the CDN cache"], true],
            ["After it is live", ["Smoke-test sign-in and checkout", "Watch the error tracker for ten minutes", "Post the changelog"], false],
          ] as const
        ).map(([heading, tasks, done], group) => (
          <div key={heading} className={cn("space-y-1.5", group > 0 && "pt-3")}>
            <p className="font-display text-[14px] font-semibold">{heading}</p>
            {tasks.map((task, i) => (
              <p key={task} className="flex items-center gap-2 text-muted-foreground">
                <span
                  className={cn(
                    "grid size-3.5 shrink-0 place-items-center rounded-sm border border-border text-[9px] text-transparent",
                    done && "in-[.is-active]:animate-[tick_0.4s_ease-out_both]"
                  )}
                  style={{ animationDelay: `${350 + i * 350}ms` }}
                >
                  ✓
                </span>
                {task}
              </p>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: File,
    name: "Files",
    type: "file",
    color: "#9ca3af",
    count: "8",
    text: "PDFs, configs and data files up to 10 MB, previewed right where you saved them.",
    pro: true,
    item: { title: "docker-compose.yaml", meta: "1.2 KB", action: <Download className="size-3.5 text-muted-foreground" />, tags: ["infra", "docker"], collection: "Infra", age: "4d ago" },
    preview: (
      <div className="font-mono text-[12px] text-muted-foreground">
        <div className="space-y-0.5 text-[12px] leading-[1.7]">
          {(
            [
              [0, "services", ""],
              [1, "api", ""],
              [2, "image", "bitbin/api:latest"],
              [2, "ports", '["3000:3000"]'],
              [2, "depends_on", "[db]"],
              [1, "db", ""],
              [2, "image", "postgres:17"],
              [2, "volumes", "[pgdata:/var/lib/postgresql/data]"],
              [0, "volumes", ""],
              [1, "pgdata", "{}"],
            ] as const
          ).map(([depth, key, value], i) => (
            <p key={i} className={cn("truncate", ON_ACTIVE)} style={{ paddingLeft: depth * 16, animationDelay: `${150 + i * 90}ms` }}>
              <span className={depth === 0 ? "text-tok-kw" : "text-tok-fn"}>{key}</span>:{value ? <> {value}</> : null}
            </p>
          ))}
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
    type: "image",
    color: "#f472b6",
    count: "5",
    text: "Screenshots and diagrams up to 5 MB, shown as thumbnails and opened in a viewer.",
    pro: true,
    item: { title: "architecture.png", meta: "184 KB", action: <Download className="size-3.5 text-muted-foreground" />, tags: ["diagram"], collection: "Infra", age: "6d ago" },
    preview: <ArchitectureDiagram />,
  },
  {
    icon: LinkIcon,
    name: "Links",
    type: "link",
    color: "#34d399",
    count: "29",
    text: "Bookmarks that remember why you saved them.",
    item: {
      title: "React reference",
      action: <ArrowUpRight className="size-3.5 text-muted-foreground" />,
      tags: ["docs", "react"],
      collection: "React utils",
      age: "2w ago",
    },
    preview: (
      <div className="space-y-2.5">
        {(
          [
            ["R", "#58c4dc", "Built-in React Hooks", "react.dev/reference/react/hooks"],
            ["R", "#58c4dc", "You Might Not Need an Effect", "react.dev/learn/you-might-not-need-an-effect"],
            ["M", "#a78bfa", "Array.prototype.reduce()", "developer.mozilla.org/docs/Web/JavaScript/…/reduce"],
          ] as const
        ).map(([letter, color, name, url], i) => (
          <p key={url} className={cn("flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2", ON_ACTIVE)} style={{ animationDelay: `${200 + i * 150}ms` }}>
            <span className="grid size-6 shrink-0 place-items-center rounded-md font-mono text-[11px] font-bold" style={{ background: tint(color, 15), color: readableColor(color) }}>
              {letter}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] text-foreground">{name}</span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">{url}</span>
            </span>
          </p>
        ))}
        <p className={cn("text-[12.5px] text-muted-foreground", ON_ACTIVE)} style={{ animationDelay: "700ms" }}>
          “The one page I open every time I forget what useLayoutEffect is for.”
        </p>
      </div>
    ),
  },
  {
    icon: FolderOpen,
    name: "Collections",
    type: "collections",
    color: "#afc6b1",
    count: "7",
    text: "Group anything by project or topic. One item can live in many, and a new one is a name away.",
    item: { title: "Collections", tags: [], age: "181 items" },
    preview: (
      // The sidebar's collections: folders in their colours, the open one on the lime pill
      <ul className="space-y-0.5 pl-2 text-[13px]">
        {(
          [
            ["React utils", 14, "#60a5fa"],
            ["Infra", 12, "#fb923c"],
            ["Interview prep", 9, "#a78bfa"],
            ["Prompt kit", 7, "#34d399"],
            ["Design tokens", 6, "#f472b6"],
            ["Reading list", 11, "#fde047"],
            ["Shell tricks", 8, "#9ca3af"],
          ] as const
        ).map(([name, n, color], i) => (
          <li key={name} className={ON_ACTIVE} style={{ animationDelay: `${200 + i * 110}ms` }}>
            <MockCollectionRow name={name} color={color} count={n} active={i === 0} />
          </li>
        ))}
      </ul>
    ),
  },
];

// The sidebar's `types`: every card but the collections one
const TYPE_CARDS = CARDS.filter((card) => card.type !== "collections");

/** A tiny system diagram standing in for a saved screenshot. */
function ArchitectureDiagram() {
  const box = "fill-[var(--background)] stroke-[var(--border)]";
  const label = "fill-[var(--muted-foreground)] font-mono text-[9px]";
  return (
    <svg viewBox="0 0 280 110" className="h-auto max-h-full w-full" role="img" aria-label="A diagram: web to api, api to postgres and redis">
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

/** One card's item, as its panel shows it: the path, a tile in the type's colour, the title and what it is, its content, then its tags and collection. */
function ItemPane({ card }: { card: Card }) {
  const Icon = card.icon;
  const { title, meta, action, tags, collection, age } = card.item;
  const isCollections = card.type === "collections";
  const color = readableColor(card.color);
  return (
    <div className="relative flex h-full min-w-0 flex-col px-4 pt-3 pb-3">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, ${color}, transparent 75%)` }} />
      <p className="font-mono text-[10px] text-muted-foreground">
        <span className="text-lime">~/</span>
        {isCollections ? "collections" : `items/${card.type}s`}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border" style={{ background: tint(card.color, 12), borderColor: tint(card.color, 30), color }}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate font-display text-[14.5px] font-bold tracking-tight">{title}</span>
            {card.pro ? <span className="shrink-0 rounded border border-coral/30 bg-coral/10 px-1.5 font-mono text-[9.5px] font-semibold text-coral">PRO</span> : null}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {isCollections ? (
              <>
                {card.count} collections · {age}
              </>
            ) : (
              <>
                <span style={{ color }}>{card.type}</span>
                {meta ? <> · {meta}</> : null} · updated {age}
              </>
            )}
          </p>
        </div>
        {action ? <span className="ml-auto shrink-0">{action}</span> : null}
      </div>
      <div className="mt-3.5 min-h-0 flex-1 overflow-hidden">{card.preview}</div>
      {isCollections ? null : (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
          {tags.map((tag) => (
            <span key={tag} className="rounded-md border border-border bg-card px-1.5">
              <span className="text-faint dark:text-muted-foreground/50">#</span>
              {tag}
            </span>
          ))}
          {collection ? (
            <span className="ml-auto inline-flex min-w-0 items-center gap-1 rounded-md border border-cyan/25 bg-cyan/[0.06] px-1.5 font-sans text-foreground/90">
              <FolderOpen className="size-3 shrink-0 text-cyan" />
              <span className="truncate">{collection}</span>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

const SIDEBAR_BUTTON = "block w-full rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A card is a small BitBin window, like the hero demo: window chrome with the
 * search bar, the sidebar with this card's type on the lime pill, then the item
 * as its panel shows it. The sidebar shows once the window is wide enough, and
 * its rows scroll the page to their card.
 */
function AppWindow({ card, index, onPick }: { card: Card; index: number; onPick: (index: number) => void }) {
  return (
    <div className="@container flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-[0_30px_70px_-34px_light-dark(rgb(20_22_26/0.22),rgb(0_0_0/0.9))]">
      {/* Window chrome */}
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-3.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <MockSearch className="mx-auto hidden h-6 w-56 @[420px]:flex" />
        <span className="ml-auto font-mono text-[10.5px] text-faint dark:text-muted-foreground/60 tabular-nums @[420px]:ml-0">
          {String(index + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
        </span>
      </div>

      <div className="grid grid-cols-1 @[600px]:grid-cols-[172px_minmax(0,1fr)]" style={{ height: BODY_H }}>
        {/* Sidebar */}
        <aside className={cn("hidden flex-col gap-0.5 border-r border-border p-2.5 @[600px]:flex", MOCK_SIDEBAR)}>
          <MockSectionLabel>overview</MockSectionLabel>
          <button type="button" onClick={() => onPick(CARDS.length - 1)} className={SIDEBAR_BUTTON}>
            <MockNavRow icon={FolderOpen} label="Collections" active={index === CARDS.length - 1} />
          </button>
          <MockSectionLabel className="mt-1.5">types</MockSectionLabel>
          {TYPE_CARDS.map((type, i) => (
            // The app's sidebar row: the card's type sits on the lime pill
            <button key={type.name} type="button" onClick={() => onPick(i)} className={SIDEBAR_BUTTON}>
              <MockNavRow icon={type.icon} iconColor={type.color} label={type.name} count={type.count} active={i === index} />
            </button>
          ))}
        </aside>

        {/* Main pane: the item, as its panel shows it */}
        <ItemPane card={card} />
      </div>
    </div>
  );
}

export default function TypesGrid() {
  const cards = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Each card writes how far the next one has come up over it into `--cover`
  // (0 to 1), in the scroll event itself, so the stack moves in the same frame
  // as the page and React only re-renders when the newest card changes.
  // It only listens while the stack is near the screen: measuring the cards forces a
  // layout, which the rest of the page (the pinned hero above all) shouldn't pay for.
  useEffect(() => {
    const written: string[] = [];
    const update = () => {
      const rects = cards.current.map((el) => el?.getBoundingClientRect());
      let newest = 0;
      rects.forEach((rect, i) => {
        const el = cards.current[i];
        if (!el || !rect) return;
        const next = rects[i + 1];
        const cover = (next ? Math.min(1, Math.max(0, 1 - (next.top - rect.top) / rect.height)) : 0).toFixed(4);
        if (cover !== written[i]) {
          written[i] = cover;
          el.style.setProperty("--cover", cover);
        }
        // A card takes over once it is most of the way up the screen
        if (rect.top < window.innerHeight * 0.6) newest = i;
      });
      setActive(newest);
    };
    const track = cards.current[0]?.parentElement;
    let listening = false;
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) window.addEventListener("scroll", update, { passive: true });
      else window.removeEventListener("scroll", update);
    };
    update();
    const observer =
      track && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              listen(entry.isIntersecting);
              // Also as it leaves, so a jump right past it still leaves the stack as it should be
              update();
            },
            { rootMargin: "50% 0px" }
          )
        : null;
    if (observer && track) observer.observe(track);
    else listen(true);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      listen(false);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Choosing a card scrolls the page to where that card lands on the stack. A
  // stuck card's own position says nothing about its place in the page, so that
  // is added up from the heights of the cards before it.
  const goTo = useCallback((i: number) => {
    const index = Math.min(CARDS.length - 1, Math.max(0, i));
    const first = cards.current[0];
    const target = cards.current[index];
    const track = first?.parentElement;
    if (!first || !target || !track) return;
    let offset = 0;
    for (let j = 0; j < index; j++) offset += (cards.current[j]?.offsetHeight ?? 0) + GAP;
    const pinTop = parseFloat(getComputedStyle(target).top) || 0;
    scrollToY(window.scrollY + track.getBoundingClientRect().top + offset - pinTop);
  }, []);

  return (
    <Section
      id="types"
      index="01.1"
      label="snippets & more"
      title={
        <>
          Seven item types. <Accent>One place to find them.</Accent>
        </>
      }
      description="Everything a developer copies, pastes and forgets, with a title, tags, a description and as many collections as you like. In the app, 1 to 7 jump straight to a type."
    >
      {/* The track: the cards one under another. Each sticks where the stack
          sits, so the next scrolls up over it; they let go together at the end. */}
      <div
        role="region"
        aria-label="Item types"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          goTo(active + step);
        }}
        className="mt-8 grid outline-none"
      >
        {/* The rail: every card's number down the left margin, the current one drawn
            out in its colour. It shares the cards' grid cell, so it takes no room
            of its own, and its box is as tall as a card (the chrome, padding and
            borders add 88px to the window's body): it starts 2rem lower, which
            is the margin under a card, so it sticks beside the stack and lets go
            of the screen at the same moment the first card does. Shown once the page's margin can hold it. */}
        <nav
          aria-label="Item types"
          className="pointer-events-none sticky top-(--pin-wide) z-10 hidden h-(--rail-h) self-start [grid-area:1/1] min-[1440px]:block"
          style={{ "--pin-wide": `calc(${PIN_TOP_WIDE} + 2rem)`, "--rail-h": `calc(${BODY_H} + 88px)` } as React.CSSProperties}
        >
          <ol className="pointer-events-auto absolute top-0 right-[calc(50%+560px+3.5rem)] space-y-1">
            {CARDS.map((card, i) => (
              <li key={card.name}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={card.name}
                  aria-current={i === active ? "step" : undefined}
                  className="group flex h-7 items-center gap-3 rounded-md font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ "--accent-color": readableColor(card.color) } as React.CSSProperties}
                >
                  <span className={cn("w-5 transition-colors duration-300", i === active ? "font-bold text-[var(--accent-color)]" : "text-muted-foreground group-hover:text-foreground")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="block w-9">
                    <span aria-hidden className={cn("block h-px origin-left transition-[scale,background-color] duration-300", i === active ? "bg-[var(--accent-color)]" : "scale-x-[0.4] bg-muted-foreground/50")} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 [grid-area:1/1]">
        {CARDS.map((card, i) => {
          return (
            <article
              key={card.name}
              ref={(el) => {
                cards.current[i] = el;
              }}
              aria-label={`${i + 1} of ${CARDS.length}: ${card.name}`}
              style={
                {
                  "--accent-color": readableColor(card.color),
                  // Each card lands a little lower than the one before, so the stack shows its edges
                  "--pin": `calc(${PIN_TOP} + ${i * PEEK}px)`,
                  "--pin-wide": `calc(${PIN_TOP_WIDE} + ${i * PEEK}px)`,
                  width: CARD_W,
                  marginBottom: GAP,
                  // A solid panel washed with the type's colour, so it hides the cards under it
                  background: `color-mix(in srgb, ${card.color} 9%, var(--card))`,
                  borderColor: `color-mix(in srgb, ${card.color} 24%, var(--border))`,
                  // Steps back as the next card covers it
                  transform: "scale(calc(1 - 0.05 * var(--cover, 0)))",
                } as React.CSSProperties
              }
              // Size comes from the scroll, so nothing here is a transition
              className={cn(
                "sticky top-(--pin) mx-auto grid origin-top items-center gap-x-10 gap-y-5 rounded-[22px] border p-4 shadow-(--shadow-lift) will-change-transform sm:p-6 lg:top-(--pin-wide) lg:px-8",
                "lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]",
                i === active && "is-active"
              )}
            >
              <div className="min-w-0">
                <AppWindow card={card} index={i} onPick={goTo} />
              </div>

              {/* What the type is for: beside the window, on its right */}
              <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
                <p className="flex items-center justify-center gap-2.5 lg:justify-start">
                  <CaptionIcon card={card} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {card.count} {card.type === "collections" ? "made" : "saved"}
                  </span>
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight lg:text-3xl">{card.name}</h3>
                <p className="mt-2 min-h-[3.25em] text-[15px] leading-relaxed text-muted-foreground lg:min-h-0">{card.text}</p>
              </div>
            </article>
          );
        })}
        {/* The last card holds for a moment before the stack lets go */}
        <div aria-hidden className="h-[20svh]" />
        </div>
      </div>
    </Section>
  );
}

function CaptionIcon({ card }: { card: Card }) {
  const Icon = card.icon;
  return (
    <span className="grid size-7 place-items-center rounded-md" style={{ background: tint(card.color, 16), color: readableColor(card.color) }}>
      <Icon className="size-4" />
    </span>
  );
}
