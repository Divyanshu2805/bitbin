"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import {
  Check,
  Code,
  CornerDownLeft,
  File,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  Link as LinkIcon,
  Sparkles,
  Star,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor } from "@/lib/utils/color";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { MOCK_SIDEBAR, MockCollectionRow, MockNavRow, MockPathPill, MockSearch, MockSectionLabel } from "./mock-app";

// The hero demo: two BitBin windows in a stack, the dashboard and the editor,
// the one behind peeking out above. One clock (`t`, ms) plays a story across
// them: the editor is shuffled to the front, a snippet types itself and AI tags
// it, the dashboard comes back and the snippet lands at the top of Recent, then
// ⌘K finds it again. It plays by itself; there's nothing to drag or click.
//
// A swap is a shuffle, not a flip: the front window slides out to the side and
// tucks behind while the other comes forward. Nothing turns edge-on, so the
// text never squashes.

const TICK = 50;
const SWAP_MS = 1100;
const SWAP_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

// The window in front, and the one behind: smaller, raised, dimmed
const FRONT = "translate3d(0, 0, 0) scale(1)";
const BACK = "translate3d(0, -26px, 0) scale(0.94)";
const BACK_OPACITY = 0.6;

// The story. The card is on the editor from SWAP_TO_EDITOR until SWAP_TO_DASHBOARD.
const SWAP_TO_EDITOR = 2600;
const TYPE_FROM = 3500;
const THINK_FROM = 6300;
const TAGS_FROM = 6900;
const SWAP_TO_DASHBOARD = 7900;
const LANDS_AT = 8800;
const PALETTE_FROM = 10000;
const QUERY_FROM = 10300;
const PICKED_AT = 11700;
const PALETTE_TO = 12400;
const COPIED_FROM = 12500;
const COPIED_TO = 13800;
const LOOP = 14600;

// With reduced motion nothing moves or plays; each window holds its best moment
const STILL_DASHBOARD_T = 9200;
const STILL_EDITOR_T = 7600;

type Tok = [text: string, className?: string];

const KW = "text-tok-kw";
const FN = "text-tok-fn";
const TY = "text-tok-type";
const NUM = "text-tok-num";

const CODE: Tok[][] = [
  [
    ["export function ", KW],
    ["useDebounce", FN],
    ["<"],
    ["T", TY],
    [">(value: "],
    ["T", TY],
    [", delay = "],
    ["300", NUM],
    [") {"],
  ],
  [["  const ", KW], ["[debounced, setDebounced] = "], ["useState", FN], ["(value);"]],
  [["  useEffect", FN], ["(() => {"]],
  [["    const ", KW], ["id = "], ["setTimeout", FN], ["(() => "], ["setDebounced", FN], ["(value), delay);"]],
  [["    return ", KW], ["() => "], ["clearTimeout", FN], ["(id);"]],
  [["  }, [value, delay]);"]],
  [["  return ", KW], ["debounced;"]],
  [["}"]],
];
const CODE_CHARS = CODE.flat().reduce((n, [text]) => n + text.length, 0);

const TAGS = ["react", "hooks", "typescript"];

const TYPES = [
  { icon: Code, name: "Snippets", color: "#3b82f6", count: 42 },
  { icon: Sparkles, name: "Prompts", color: "#8b5cf6", count: 18 },
  { icon: Terminal, name: "Commands", color: "#f97316", count: 67 },
  { icon: StickyNote, name: "Notes", color: "#fde047", count: 12 },
  { icon: LinkIcon, name: "Links", color: "#10b981", count: 29 },
  { icon: File, name: "Files", color: "#6b7280", count: 8 },
  { icon: ImageIcon, name: "Images", color: "#ec4899", count: 5 },
];

const COLLECTIONS = [
  { name: "React utils", color: "#3b82f6", count: 14 },
  { name: "Infra", color: "#f97316", count: 11 },
  { name: "Prompt kit", color: "#8b5cf6", count: 7 },
];

type Row = {
  title: string;
  icon: LucideIcon;
  color: string;
  tags: string[];
  age: string;
};

const RECENT: Row[] = [
  {
    title: "docker system prune -af",
    icon: Terminal,
    color: "#f97316",
    tags: ["docker"],
    age: "2h",
  },
  {
    title: "Code review",
    icon: Sparkles,
    color: "#8b5cf6",
    tags: ["review"],
    age: "1d",
  },
  {
    title: "Deploy checklist",
    icon: StickyNote,
    color: "#fde047",
    tags: ["ops"],
    age: "3d",
  },
  {
    title: "React reference",
    icon: LinkIcon,
    color: "#10b981",
    tags: ["docs"],
    age: "5d",
  },
];
const SAVED: Row = {
  title: "useDebounce hook",
  icon: Code,
  color: "#3b82f6",
  tags: TAGS,
  age: "now",
};

// ⌘K looks for the snippet that was just saved. The others match the first
// letters typed and drop away until only useDebounce is left.
const RESULTS = [
  { title: "useDebounce hook", color: "#3b82f6", icon: Code },
  { title: "docker system prune -af", color: "#f97316", icon: Terminal },
  { title: "Deploy checklist", color: "#fde047", icon: StickyNote },
  { title: "Dockerfile for Next.js", color: "#3b82f6", icon: Code },
];

/** What the story is doing at `t`, for the caption under the card. */
function captionAt(t: number) {
  if (t < SWAP_TO_EDITOR) return { index: "00", text: "Your bin at a glance" };
  if (t < THINK_FROM) return { index: "01", text: "Save a snippet" };
  if (t < SWAP_TO_DASHBOARD) return { index: "02", text: "AI tags it" };
  if (t < PALETTE_FROM) return { index: "03", text: "It lands on your dashboard" };
  return { index: "04", text: "Find anything with ⌘K" };
}

// ---------------------------------------------------------------------------
// The clock, and which window it puts in front
// ---------------------------------------------------------------------------

type Face = "dashboard" | "editor";

const faceAt = (t: number): Face => (t >= SWAP_TO_EDITOR && t < SWAP_TO_DASHBOARD ? "editor" : "dashboard");
/** The clock moves on a tick; a click on the stack jumps it to the other window's part of the story. */
function clock(t: number, action: "tick" | "shuffle") {
  if (action === "shuffle") return faceAt(t) === "editor" ? SWAP_TO_DASHBOARD : SWAP_TO_EDITOR;
  return t + TICK >= LOOP ? 0 : t + TICK;
}

// ---------------------------------------------------------------------------
// The two faces
// ---------------------------------------------------------------------------

/** Renders the code with only the first `n` characters typed. */
function TypedCode({ n }: { n: number }) {
  let left = n;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < CODE.length; i++) {
    if (left <= 0) break;
    const parts: React.ReactNode[] = [];
    for (let j = 0; j < CODE[i].length; j++) {
      if (left <= 0) break;
      const [text, className] = CODE[i][j];
      parts.push(
        <span key={j} className={className}>
          {text.slice(0, left)}
        </span>
      );
      left -= text.length;
    }
    const typing = left <= 0 && n < CODE_CHARS;
    lines.push(
      // Long lines wrap under their own number on a narrow card instead of running off its edge
      <div key={i} className="flex whitespace-pre-wrap">
        <span className="mr-3 w-5 shrink-0 sm:mr-5 select-none text-right text-muted-foreground/40">{i + 1}</span>
        <span className="min-w-0">
          {parts}
          {typing ? <span className="caret" /> : null}
        </span>
      </div>
    );
  }
  return <>{lines}</>;
}

/** Title bar and status bar around a face, like the app's window. */
function Frame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <MockSearch className="mx-auto hidden w-64 sm:flex" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)]">{children}</div>
      <div
        className={cn(
          "hidden h-7 shrink-0 items-center gap-3 border-t border-border px-3 font-mono text-[10.5px] text-muted-foreground sm:flex",
          MOCK_SIDEBAR
        )}
      >
        <span className="text-foreground/70">~/bin/{path}</span>
        <span className="hidden items-center gap-2 lg:flex">
          {TYPES.slice(0, 5).map((type) => (
            <span key={type.name} className="flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ background: readableColor(type.color) }} />
              {type.count}
            </span>
          ))}
        </span>
        <span className="ml-auto">⌘K search</span>
        <span>? shortcuts</span>
        <span className="flex items-center gap-1 text-lime">
          <span className="size-1.5 rounded-full bg-lime" />
          pro
        </span>
      </div>
    </div>
  );
}

/** The app's sidebar, with `active` lit. Snippets counts the one just saved. */
function Sidebar({ active, saved }: { active: string; saved: boolean }) {
  return (
    <aside className={cn("hidden flex-col gap-3 border-r border-border p-3 md:flex", MOCK_SIDEBAR)}>
      <div className="space-y-0.5">
        <MockSectionLabel>overview</MockSectionLabel>
        <MockNavRow icon={LayoutGrid} label="Dashboard" active={active === "Dashboard"} />
        <MockNavRow icon={Star} label="Favorites" />
        <MockNavRow icon={FolderOpen} label="Collections" />
      </div>
      <div className="space-y-0.5">
        <MockSectionLabel>types</MockSectionLabel>
        {TYPES.map((type) => (
          <MockNavRow
            key={type.name}
            icon={type.icon}
            iconColor={type.color}
            label={type.name}
            count={type.name === "Snippets" && saved ? type.count + 1 : type.count}
            active={active === type.name}
          />
        ))}
      </div>
      <div className="space-y-0.5">
        <MockSectionLabel>collections</MockSectionLabel>
        {COLLECTIONS.map((c) => (
          <MockCollectionRow key={c.name} name={c.name} color={c.color} count={c.count} />
        ))}
      </div>
    </aside>
  );
}

/** A row of the list view: a tinted tile, the title, tags and when. */
function RecentRow({ row, fresh = false }: { row: Row; fresh?: boolean }) {
  const Icon = row.icon;
  const color = readableColor(row.color);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-[12.5px]",
        fresh && "bg-lime/[0.07] animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both]"
      )}
    >
      <span
        className="grid size-6 shrink-0 place-items-center rounded-md"
        style={{
          background: `color-mix(in srgb, ${color} 13%, transparent)`,
          color,
        }}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 truncate font-medium">{row.title}</span>
      {fresh ? (
        <span className="shrink-0 rounded border border-lime/40 px-1 font-mono text-[9px] font-semibold text-lime">
          NEW
        </span>
      ) : null}
      <span className="ml-auto hidden shrink-0 gap-2 font-mono text-[10.5px] text-muted-foreground sm:flex">
        {row.tags.map((tag) => (
          <span key={tag}>
            <span className="text-muted-foreground/50">#</span>
            {tag}
          </span>
        ))}
      </span>
      <span className="w-9 shrink-0 text-right font-mono text-[10.5px] text-muted-foreground">{row.age}</span>
    </div>
  );
}

function DashboardFace({ t }: { t: number }) {
  const landed = t >= LANDS_AT;
  const paletteOpen = t >= PALETTE_FROM && t < PALETTE_TO;
  const query = "debounce".slice(0, Math.max(0, Math.floor((t - QUERY_FROM) / 120)));
  const results = RESULTS.filter((r) => r.title.toLowerCase().includes(query));
  const picked = t >= PICKED_AT;
  const copied = t >= COPIED_FROM && t < COPIED_TO;
  const items = landed ? 43 : 42;

  return (
    <Frame path="dashboard">
      <Sidebar active="Dashboard" saved={landed} />
      <div className="relative min-w-0 overflow-hidden p-4 sm:p-5">
        <MockPathPill path="dashboard" />
        <h3 className="mt-2.5 font-display text-[22px] font-bold tracking-tight">
          Welcome back, <span className="text-brand-gradient">Ada</span>
        </h3>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Here&apos;s what&apos;s in your bin. Last change{" "}
          <span className="font-mono text-foreground/80">{landed ? "just now" : "2h ago"}</span>.
        </p>

        {/* `$ bin --stats` */}
        <div className="relative mt-5 rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <span className="absolute -top-2 left-3 bg-card px-1 font-mono text-[10px] text-muted-foreground">
            <span className="text-lime">$</span> bin --stats
          </span>
          <div className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
            {(
              [
                ["items", items, "var(--brand-lime)"],
                ["collections", 6, "var(--brand-cyan)"],
                ["starred items", 9, "light-dark(#d97706, #fbbf24)"],
                ["starred collections", 2, "var(--brand-coral)"],
              ] as const
            ).map(([label, n, color]) => (
              <div key={label} className="px-3.5 pt-3 pb-2.5">
                <p className="flex items-center gap-1.5 truncate font-mono text-[10px] text-muted-foreground">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  {label}
                </p>
                <p
                  key={n}
                  className={cn(
                    "mt-0.5 font-mono text-[22px] leading-tight font-bold",
                    label === "items" && landed && "animate-pop text-lime"
                  )}
                >
                  {n}
                </p>
              </div>
            ))}
          </div>
          {/* What's in the bin, by type */}
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-b-xl border-t border-border">
            {TYPES.map((type) => (
              <span
                key={type.name}
                className="h-full"
                style={{
                  flex: type.count + (type.name === "Snippets" && landed ? 1 : 0),
                  background: readableColor(type.color),
                }}
              />
            ))}
          </div>
        </div>

        {/* `// recent`, as the list view draws it; the saved snippet lands on top */}
        <p className="mt-5 mb-2 font-mono text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/50">{"// "}</span>recent{" "}
          <span className="text-muted-foreground/60">[{landed ? 5 : 4}]</span>
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          {landed ? <RecentRow row={SAVED} fresh /> : null}
          {RECENT.map((row) => (
            <RecentRow key={row.title} row={row} />
          ))}
        </div>

        {/* ⌘K */}
        <div
          className={cn(
            "absolute inset-x-4 top-12 mx-auto max-w-md rounded-xl border border-border bg-popover shadow-[var(--shadow-lift)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-x-8",
            paletteOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-2 scale-[0.97] opacity-0"
          )}
        >
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3 font-mono text-[13px]">
            <span className="text-lime">&gt;</span>
            {query || <span className="text-muted-foreground">search your bin</span>}
            {!picked ? <span className="caret" /> : null}
            <span className="kbd ml-auto">esc</span>
          </div>
          <ul className="p-1.5">
            {results.map((r, i) => {
              const Icon = r.icon;
              const selected = i === 0 && picked;
              return (
                <li
                  key={r.title}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                    // The highlighted row wears the menus' lime pill
                    selected
                      ? "bg-lime/[0.11] text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-lime)_18%,transparent)]"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-3.5" style={{ color: readableColor(r.color) }} />
                  <span className="truncate">{r.title}</span>
                  {selected ? <CornerDownLeft className="ml-auto size-3.5 text-lime" /> : null}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Toast */}
        <div
          className={cn(
            "absolute right-4 bottom-4 flex items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-lift)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            copied ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          )}
        >
          <span className="grid size-4 place-items-center rounded-full bg-lime text-primary-foreground">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          Copied to clipboard
        </div>
      </div>
    </Frame>
  );
}

function EditorFace({ t }: { t: number }) {
  const typed = Math.min(CODE_CHARS, Math.max(0, Math.floor((t - TYPE_FROM) / 10)));
  const thinking = t >= THINK_FROM && t < TAGS_FROM;
  const tags = t < TAGS_FROM ? 0 : Math.min(TAGS.length, 1 + Math.floor((t - TAGS_FROM) / 200));

  return (
    <Frame path="items/snippets">
      <Sidebar active="Snippets" saved={false} />
      <div className="flex min-w-0 flex-col">
        <div className="flex h-9 shrink-0 items-stretch border-b border-border bg-surface/60 font-mono text-xs">
          <span className="relative flex items-center gap-2 border-r border-border bg-card px-4 text-foreground">
            <Code className="size-3.5" style={{ color: readableColor("#3b82f6") }} /> useDebounce.ts
            <span className="absolute inset-x-0 top-0 h-px bg-lime" />
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-sans text-base font-semibold tracking-normal">useDebounce hook</h3>
            <span className="rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">
              typescript
            </span>
            <span
              className={cn(
                "ml-1 inline-flex items-center gap-1 font-mono text-[11px]",
                thinking ? "text-lime" : "text-muted-foreground/60"
              )}
            >
              <Sparkles className={cn("size-3.5", thinking && "animate-pulse")} />
              {thinking ? "suggesting tags…" : tags > 0 ? "" : "tags"}
            </span>
            {TAGS.slice(0, tags).map((tag) => (
              <span
                key={tag}
                className="animate-pop rounded-md border border-lime/30 bg-lime/10 px-1.5 font-mono text-[11px] text-lime"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-surface p-4 font-mono text-[12px] leading-[1.8] sm:text-[13px]">
            <TypedCode n={typed} />
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------

export default function IdeDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.2 });
  const paused = usePagePaused();
  const [still, setStill] = useState(false);
  const [t, dispatch] = useReducer(clock, 0);
  // With reduced motion the clock stands still and a click just swaps the window shown
  const [stillFront, setStillFront] = useState<Face>("dashboard");
  const windows = useRef<Partial<Record<Face, HTMLDivElement | null>>>({});
  const lastFront = useRef<Face>("dashboard");

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!inView || still || paused) return;
    const id = window.setInterval(() => dispatch("tick"), TICK);
    return () => window.clearInterval(id);
  }, [inView, still, paused]);

  const front: Face = still ? stillFront : faceAt(t);
  const shuffle = () => (still ? setStillFront(front === "dashboard" ? "editor" : "dashboard") : dispatch("shuffle"));
  const caption = captionAt(still ? (stillFront === "editor" ? STILL_EDITOR_T : STILL_DASHBOARD_T) : t);

  // The shuffle. Each window's resting pose is already rendered; this plays the
  // path between them before the frame paints. The leaving window swings out
  // left and drops behind halfway; the arriving one eases right, then forward.
  useLayoutEffect(() => {
    if (front === lastFront.current) return;
    const back = lastFront.current;
    lastFront.current = front;
    if (still) return;
    const timing = { duration: SWAP_MS, easing: SWAP_EASE };
    windows.current[back]?.animate(
      [
        { transform: FRONT, opacity: 1, zIndex: 2 },
        { transform: "translate3d(-46%, 18px, 0) rotate(-2.5deg) scale(0.97)", opacity: 1, zIndex: 2, offset: 0.5 },
        { zIndex: 1, offset: 0.5 },
        { transform: BACK, opacity: BACK_OPACITY, zIndex: 1 },
      ],
      timing
    );
    windows.current[front]?.animate(
      [
        { transform: BACK, opacity: BACK_OPACITY, zIndex: 1 },
        { transform: "translate3d(14%, -34px, 0) rotate(1.5deg) scale(0.96)", opacity: 0.9, zIndex: 1, offset: 0.5 },
        { zIndex: 2, offset: 0.5 },
        { transform: FRONT, opacity: 1, zIndex: 2 },
      ],
      timing
    );
  }, [front, still]);

  return (
    <div ref={ref}>
      <p className="sr-only">
        A looping demo of BitBin: two app windows take turns at the front, the dashboard and the editor. A snippet is
        saved and tagged by AI, lands at the top of the dashboard, and ⌘K search finds that snippet again and copies it.
      </p>

      <div className="relative pt-7">
        <div aria-hidden className="absolute -inset-x-10 -top-10 -bottom-16 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--brand-lime)_13%,transparent),transparent)] blur-2xl" />

        {/* Click (or Enter / Space) to shuffle the other window to the front */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`BitBin demo, showing the ${front}. Shuffle to the ${front === "dashboard" ? "editor" : "dashboard"}.`}
          onClick={shuffle}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            shuffle();
          }}
          className="relative isolate h-[480px] cursor-pointer select-none outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-lime/50 sm:h-[528px] md:h-[568px]"
        >
          {(["dashboard", "editor"] as const).map((name) =>
            still && name !== front ? null : (
              <div
                key={name}
                aria-hidden
                ref={(el) => {
                  windows.current[name] = el;
                }}
                className="absolute inset-0 origin-top overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-[0_40px_120px_-40px_light-dark(rgb(20_22_26/0.3),rgb(0_0_0/0.9))] will-change-transform"
                style={{
                  transform: name === front ? FRONT : BACK,
                  opacity: name === front ? 1 : BACK_OPACITY,
                  zIndex: name === front ? 2 : 1,
                }}
              >
                {name === "dashboard" ? <DashboardFace t={still ? STILL_DASHBOARD_T : t} /> : <EditorFace t={still ? STILL_EDITOR_T : t} />}
              </div>
            )
          )}
        </div>
      </div>

      {/* What's happening */}
      <p
        key={caption.index}
        aria-hidden
        className="mt-6 text-center font-mono text-[12.5px] text-muted-foreground animate-fade-in"
      >
        <span className="text-lime">{caption.index}</span> {caption.text}
      </p>
    </div>
  );
}
