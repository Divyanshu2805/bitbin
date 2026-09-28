"use client";

import { useEffect, useRef, useState } from "react";
import { Code, Folder, FolderOpen, FolderPlus, Keyboard, LayoutDashboard, PanelLeft, Plus, Search, Sparkles, Star, StickyNote, Terminal, X, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { readableColor } from "@/lib/utils/color";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { Accent, Section } from "./ui";
import { MOCK_SIDEBAR, MockButton, MockNavRow, MockSearch, MockSectionLabel } from "./mock-app";

// The app's keyboard shortcuts, played out: a BitBin dashboard in an app window
// with a keyboard below it. One
// shortcut at a time, on a loop while on screen: its keys press down (held
// together for a chord, one after the other for a G-chord), the status bar shows
// what was typed, and then the dashboard does it
// (search opens, a dialog appears, the sidebar folds, the page changes). The
// list beside it follows along; click one to play it, hover to pause.

type Press = { key: string; from: number; to: number };
type Shortcut = { label: string; icon: LucideIcon; keys: string[]; sequence?: boolean; press: Press[] };

const chord = (mod: string, key: string): Press[] => [
  { key: mod, from: 150, to: 1150 },
  { key, from: 420, to: 1150 },
];
const tap = (key: string): Press[] => [{ key, from: 300, to: 750 }];
const gThen = (key: string): Press[] => [
  { key: "G", from: 150, to: 450 },
  { key, from: 650, to: 1000 },
];

const SHORTCUTS: Shortcut[] = [
  { label: "Search everything", icon: Search, keys: ["⌘", "K"], press: chord("cmd", "K") },
  { label: "New item", icon: Plus, keys: ["N"], press: tap("N") },
  { label: "New collection", icon: FolderPlus, keys: ["C"], press: tap("C") },
  { label: "Toggle sidebar", icon: PanelLeft, keys: ["⌘", "B"], press: chord("cmd", "B") },
  { label: "Go to dashboard", icon: LayoutDashboard, keys: ["G", "D"], sequence: true, press: gThen("D") },
  { label: "Go to favorites", icon: Star, keys: ["G", "F"], sequence: true, press: gThen("F") },
  { label: "Go to collections", icon: FolderOpen, keys: ["G", "C"], sequence: true, press: gThen("C") },
  { label: "Show all shortcuts", icon: Keyboard, keys: ["?"], press: chord("shift", "/") },
];

const STEP_MS = 2600;
const ACTION_AT = 1050; // when the dashboard reacts
const TICK = 50;

// A Mac-style keyboard, 15 units wide per row. [id, label, width, name under the symbol]
type Key = [id: string, label: string, width?: number, name?: string];
const ROWS: Key[][] = [
  [["`", "`"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["0", "0"], ["-", "-"], ["=", "="], ["delete", "delete", 2]],
  [["tab", "tab", 1.5], ["Q", "Q"], ["W", "W"], ["E", "E"], ["R", "R"], ["T", "T"], ["Y", "Y"], ["U", "U"], ["I", "I"], ["O", "O"], ["P", "P"], ["[", "["], ["]", "]"], ["\\", "\\", 1.5]],
  [["caps", "caps", 1.75], ["A", "A"], ["S", "S"], ["D", "D"], ["F", "F"], ["G", "G"], ["H", "H"], ["J", "J"], ["K", "K"], ["L", "L"], [";", ";"], ["'", "'"], ["return", "return", 2.25]],
  [["shift", "⇧", 2.25, "shift"], ["Z", "Z"], ["X", "X"], ["C", "C"], ["V", "V"], ["B", "B"], ["N", "N"], ["M", "M"], [",", ","], [".", "."], ["/", "/"], ["shift-r", "⇧", 2.75, "shift"]],
  [["fn", "fn"], ["ctrl", "⌃", 1, "control"], ["alt", "⌥", 1, "option"], ["cmd", "⌘", 1.25, "command"], ["space", "", 5.5], ["cmd-r", "⌘", 1.25, "command"], ["alt-r", "⌥", 1, "option"], ["left", "←"], ["down", "↓"], ["right", "→"]],
];

/** Clicking one of these keys plays the shortcut it belongs to. */
const KEY_PLAYS: Record<string, number> = { K: 0, N: 1, C: 2, B: 3, G: 4, D: 4, F: 5, "/": 7 };

export default function ShortcutsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const paused = usePagePaused();
  const [clock, setClock] = useState({ step: 0, t: 0 });
  const [hovered, setHovered] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  // A shortcut always plays to the end; hovering only stops the next one starting.
  useEffect(() => {
    if (!inView || still || paused) return;
    const id = window.setInterval(() => {
      setClock((c) => {
        if (c.t + TICK < STEP_MS) return { ...c, t: c.t + TICK };
        return hovered ? c : { step: (c.step + 1) % SHORTCUTS.length, t: 0 };
      });
    }, TICK);
    return () => window.clearInterval(id);
  }, [inView, still, hovered, paused]);

  // Try it on your own keyboard: N, C, ? and G then D/F/C play their shortcut
  // while the section is on screen. ⌘ combinations are left to the browser, and
  // nothing typed into a field counts.
  const gAt = useRef(0);
  useEffect(() => {
    if (!inView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = e.key.toLowerCase();
      const afterG = performance.now() - gAt.current < 1200;
      const play = (step: number) => setClock({ step, t: 0 });
      if (key === "g") gAt.current = performance.now();
      else if (afterG && key === "d") play(4);
      else if (afterG && key === "f") play(5);
      else if (afterG && key === "c") play(6);
      else if (key === "n") play(1);
      else if (key === "c") play(2);
      else if (e.key === "?") play(7);
      else return;
      if (key !== "g") gAt.current = 0;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inView]);

  const shortcut = SHORTCUTS[clock.step];
  // Reduced motion: the keys held down and the action done
  const t = still ? ACTION_AT + 50 : clock.t;
  const down = new Set(shortcut.press.filter((p) => t >= p.from && t < p.to).map((p) => p.key));
  const inPlay = new Set(shortcut.press.map((p) => p.key));
  const typed = shortcut.press.filter((p) => t >= p.from).length;
  const acted = t >= ACTION_AT;

  return (
    <Section
      id="keys"
      index="01.5"
      label="shortcuts"
      title={
        <>
          Your hands never <Accent>leave the keyboard.</Accent>
        </>
      }
      description="Every common action has a shortcut, with vim-style G-chords for jumping around. Press ? anywhere in the app to see them all."
    >
      <div
        ref={ref}
        className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:gap-10"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {/* Every shortcut; the one playing is lit. Not clickable: they play on their own, and the keyboard below takes real presses */}
        <ul className="order-2 grid gap-1 lg:order-1" data-reveal>
          {SHORTCUTS.map((item, i) => {
            const Icon = item.icon;
            const current = i === clock.step;
            return (
              <li key={item.label}>
                <div
                  aria-current={current}
                  className={cn(
                    "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left select-none transition-colors duration-200",
                    current ? "border-lime/30 bg-lime/[0.06]" : "border-transparent"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0 transition-colors", current ? "text-lime" : "text-muted-foreground")} />
                  <span className={cn("text-[14px] transition-colors", current ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                  <span className="ml-auto flex items-center gap-1 font-mono text-[11px]">
                    {item.keys.map((key, k) => (
                      <span key={k} className="flex items-center gap-1">
                        {k > 0 && item.sequence ? <span className="text-muted-foreground/60">then</span> : null}
                        <kbd className={cn("grid h-6 min-w-6 place-items-center rounded border border-b-2 px-1.5", current ? "border-lime/40 text-lime" : "border-border text-muted-foreground")}>
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </span>
                  {current ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-px origin-left bg-lime/70"
                      style={{ transform: `scaleX(${t / STEP_MS})`, transition: `transform ${TICK}ms linear` }}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {/* The app and the keyboard, as two separate pieces */}
        <div data-reveal style={{ "--d": "120ms" } as React.CSSProperties} className="order-1 space-y-4 lg:order-2">
          {/* The app window */}
          <div className="overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-lift)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-border bg-surface px-3.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="mx-auto font-mono text-[10.5px] text-muted-foreground">bitbin.divyanshuagrahari.dev</span>
            </div>
            <DashboardScreen
              step={clock.step}
              acted={acted}
              t={t}
              keys={
                <span className="flex items-center gap-1.5">
                  {shortcut.keys.slice(0, Math.min(typed, shortcut.keys.length)).map((key, k) => (
                    <span key={`${clock.step}-${k}`} className="flex items-center gap-1.5 animate-pop">
                      {k > 0 ? <span className="text-muted-foreground">{shortcut.sequence ? "then" : "+"}</span> : null}
                      <kbd className="grid h-5 min-w-5 place-items-center rounded border border-b-2 border-lime/50 bg-lime/10 px-1 text-lime">{key}</kbd>
                    </span>
                  ))}
                  {typed === 0 ? <span className="text-muted-foreground/60">waiting for keys…</span> : null}
                </span>
              }
            />
          </div>

          {/* The keyboard: keys in a shortcut can be clicked to play it */}
          <div className="rounded-2xl border border-[light-dark(#dcddd5,#23272e)] bg-gradient-to-b from-[light-dark(#f3f3ef,#15171b)] to-[light-dark(#e8e8e2,#0e1013)] p-2.5 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_30px_60px_-30px_light-dark(rgb(20_22_26/0.3),rgb(0_0_0/0.9))] sm:p-3.5">
            <div aria-hidden className="space-y-1 sm:space-y-1.5">
              {ROWS.map((row, r) => (
                <div key={r} className="flex gap-1 sm:gap-1.5">
                  {row.map(([id, label, width = 1, name]) => {
                    const pressed = down.has(id);
                    const inShortcut = inPlay.has(id);
                    const plays = KEY_PLAYS[id];
                    return (
                      <span
                        key={id}
                        onClick={plays === undefined ? undefined : () => setClock({ step: plays, t: 0 })}
                        style={{ flex: `${width} 1 0` }}
                        className={cn(
                          "relative flex h-6 min-w-0 flex-col items-center justify-center rounded-[6px] border bg-gradient-to-b font-mono leading-none transition-[transform,box-shadow,color,border-color] duration-100 sm:h-9",
                          plays !== undefined && !pressed && "cursor-pointer hover:-translate-y-px hover:border-lime/30 hover:text-foreground",
                          pressed
                            ? "translate-y-[2px] border-lime/60 from-lime/25 to-lime/[0.08] text-lime shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_0_0_1px_color-mix(in_srgb,var(--brand-lime)_15%,transparent),0_0_26px_-2px_var(--brand-lime)]"
                            : inShortcut
                              ? "border-lime/25 from-[light-dark(#ffffff,#20242a)] to-[light-dark(#f2f2ed,#16181c)] text-lime/90 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_0_light-dark(#cfd0c8,#07080a),0_3px_6px_-2px_light-dark(rgb(20_22_26/0.12),rgb(0_0_0/0.6))]"
                              : "border-[light-dark(#d6d7cf,#262a31)] from-[light-dark(#ffffff,#20242a)] to-[light-dark(#f2f2ed,#16181c)] text-muted-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_2px_0_light-dark(#cfd0c8,#07080a),0_3px_6px_-2px_light-dark(rgb(20_22_26/0.12),rgb(0_0_0/0.6))]"
                        )}
                      >
                        <span className={cn("truncate px-0.5", name ? "text-[9px] sm:text-[12px]" : "text-[8.5px] sm:text-[11px]")}>{label}</span>
                        {name ? <span className="mt-0.5 hidden text-[7.5px] opacity-70 sm:block">{name}</span> : null}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
              Try it: press <span className="text-lime">N</span>, <span className="text-lime">C</span>, <span className="text-lime">?</span> or{" "}
              <span className="text-lime">G</span> then <span className="text-lime">D</span> on your keyboard, or click a key
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

type Route = "dashboard" | "favorites" | "collections";

const NAV: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { route: "favorites", label: "Favorites", icon: Star },
  { route: "collections", label: "Collections", icon: FolderOpen },
];

const TYPE_COUNTS: Record<string, number> = { snippet: 42, command: 67, note: 12, prompt: 18 };

const TYPE_COLORS = {
  snippet: readableColor("#60a5fa"),
  command: readableColor("#fb923c"),
  note: readableColor("#fde047"),
  prompt: readableColor("#a78bfa"),
};
type ItemType = keyof typeof TYPE_COLORS;
const TYPE_ICONS: Record<ItemType, LucideIcon> = { snippet: Code, command: Terminal, note: StickyNote, prompt: Sparkles };

type Row = { title: string; type: ItemType; tags: string[]; age: string };
const RECENT: Row[] = [
  { title: "docker system prune -af", type: "command", tags: ["docker"], age: "2h" },
  { title: "useDebounce hook", type: "snippet", tags: ["react", "hooks"], age: "1d" },
  { title: "Deploy checklist", type: "note", tags: ["ops"], age: "3d" },
];
const FAVORITES: Row[] = [
  { title: "useDebounce hook", type: "snippet", tags: ["react"], age: "1d" },
  { title: "kubectl logs -f deploy/api", type: "command", tags: ["k8s"], age: "4d" },
  { title: "Code review", type: "prompt", tags: ["review"], age: "1w" },
  { title: "Postgres indexes", type: "note", tags: ["sql"], age: "2w" },
];

/** What a shortcut's result types into its field: `text`, a character at a time, from ACTION_AT. */
function typing(text: string, t: number, delay = 250) {
  return text.slice(0, Math.max(0, Math.floor((t - ACTION_AT - delay) / 55)));
}

/** The app, reacting to the shortcut being played, with a status bar showing what was typed. */
function DashboardScreen({ step, acted, t, keys }: { step: number; acted: boolean; t: number; keys: React.ReactNode }) {
  // Where you are: G-chords move you, and you stay there until the next one
  const route: Route = step < 5 || (step === 5 && !acted) ? "dashboard" : step === 5 || (step === 6 && !acted) ? "favorites" : "collections";
  const collapsed = step === 3 && acted;
  const overlay = acted ? (["search", "item", "collection", null, null, null, null, "help"] as const)[step] : null;
  const page = NAV.find((n) => n.route === route)!;
  const shortcut = SHORTCUTS[step];
  const ActionIcon = shortcut.icon;

  return (
    <div className="flex flex-col">
      <div className="relative flex h-[300px] bg-card text-left sm:h-[340px]">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex shrink-0 flex-col gap-0.5 overflow-hidden border-r border-border p-2 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            MOCK_SIDEBAR,
            collapsed ? "w-11" : "w-[150px]"
          )}
        >
          <span className="mb-1 flex h-7 items-center gap-1.5 px-1 whitespace-nowrap">
            <LogoMark className="size-4 shrink-0" />
            <span className={cn("font-display text-[12.5px] font-bold transition-opacity duration-300", collapsed && "opacity-0")}>
              Bit<span className="text-lime">Bin</span>
            </span>
          </span>
          {/* The app's sidebar: labels fade on the rail but keep their height, so icons never move */}
          <MockSectionLabel className={cn("transition-opacity duration-300", collapsed && "opacity-0")}>overview</MockSectionLabel>
          {NAV.map((item) => (
            <MockNavRow key={item.route} icon={item.icon} label={item.label} active={item.route === route} hideLabel={collapsed} />
          ))}
          <MockSectionLabel className={cn("mt-1.5 transition-opacity duration-300", collapsed && "opacity-0")}>types</MockSectionLabel>
          {(Object.keys(TYPE_COLORS) as ItemType[]).map((type) => (
            <MockNavRow
              key={type}
              icon={TYPE_ICONS[type]}
              iconColor={TYPE_COLORS[type]}
              label={`${type.charAt(0).toUpperCase()}${type.slice(1)}s`}
              count={TYPE_COUNTS[type]}
              hideLabel={collapsed}
            />
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3.5">
            <PanelLeft className="size-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold">{page.label}</span>
            <MockSearch text="search" className="ml-auto h-6 w-36" />
            <MockButton primary icon={Plus} keys="N" className="h-6 px-1.5" />
          </div>

          {/* The page; it slides in when the route changes */}
          <div key={route} className="min-h-0 flex-1 overflow-hidden p-3.5 animate-[fade-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
            {route === "dashboard" ? (
              <>
                {/* The dashboard's `$ bin --stats` pane: one panel, a column per number */}
                <div className="relative mt-1.5 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
                  <span className="absolute -top-2 left-3 bg-card px-1 font-mono text-[9px] text-muted-foreground">
                    <span className="text-lime">$</span> bin --stats
                  </span>
                  {(
                    [
                      ["items", "42", "+3 this week", "var(--brand-lime)"],
                      ["collections", "6", "2 shared tags", "var(--brand-cyan)"],
                      ["starred", "9", "1 new", "light-dark(#d97706, #fbbf24)"],
                    ] as const
                  ).map(([label, n, note, color]) => (
                    <span key={label} className="px-3 pt-2.5 pb-2">
                      <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-muted-foreground">
                        <span className="size-1.5 rounded-full" style={{ background: color }} />
                        {label}
                      </span>
                      <span className="mt-0.5 block font-mono text-[18px] leading-tight font-bold">{n}</span>
                      <span className="text-[9.5px] text-muted-foreground/70">{note}</span>
                    </span>
                  ))}
                </div>
                <p className="mt-3 mb-1.5 font-mono text-[10px] text-muted-foreground">
                  <span className="text-muted-foreground/50">{"// "}</span>recent <span className="text-muted-foreground/60">[3]</span>
                </p>
                <Rows rows={RECENT} />
              </>
            ) : route === "favorites" ? (
              <>
                <p className="mb-2 text-[10.5px] text-muted-foreground">4 starred items</p>
                <Rows rows={FAVORITES} starred />
              </>
            ) : (
              // Collection cards as the app draws them: a lime rule and wash on top, a folder
              // tile in the collection's colour, and a bar of what's inside by type
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["React utils", "Hooks and patterns", "#60a5fa", 14, [["snippet", 9], ["note", 5]]],
                    ["Infra", "Servers and deploys", "#fb923c", 12, [["command", 7], ["snippet", 3], ["note", 2]]],
                    ["Prompt kit", "Prompts that work", "#a78bfa", 7, [["prompt", 7]]],
                    ["Interview prep", "Notes to revise", "#34d399", 9, [["note", 6], ["snippet", 3]]],
                  ] as const
                ).map(([name, description, color, n, types]) => (
                  <span
                    key={name}
                    className="relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--brand-lime)_22%,var(--border))] bg-card px-3 pt-2.5 pb-2.5 shadow-[var(--shadow-soft)]"
                  >
                    <span className="absolute inset-x-0 top-0 h-px bg-lime/70" />
                    <span className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-lime/[0.07] to-transparent" />
                    <span className="relative flex items-center gap-2">
                      <span
                        className="grid size-6 shrink-0 place-items-center rounded-md"
                        style={{ background: `color-mix(in srgb, ${readableColor(color)} 14%, transparent)`, color: readableColor(color) }}
                      >
                        <Folder className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold">{name}</span>
                        <span className="block font-mono text-[9px] text-muted-foreground">{n} items</span>
                      </span>
                    </span>
                    <span className="relative mt-1.5 block truncate text-[10px] text-muted-foreground">{description}</span>
                    <span className="relative mt-2 flex h-1 gap-0.5 overflow-hidden rounded-full">
                      {types.map(([type, count]) => (
                        <span key={type} className="h-full" style={{ flex: count, background: TYPE_COLORS[type] }} />
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* What the shortcut opened, centred over the app */}
        {overlay ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/35 p-4 animate-fade-in">
            <div
              key={overlay}
              className="w-full max-w-[340px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_60px_-20px_light-dark(rgb(20_22_26/0.3),rgb(0_0_0/0.9))] animate-[fade-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]"
            >
              {overlay === "search" ? <SearchPalette t={t} /> : overlay === "help" ? <HelpSheet /> : overlay === "item" ? <NewItemForm t={t} /> : <NewCollectionForm t={t} />}
            </div>
          </div>
        ) : null}
      </div>

      {/* Status bar: the keys as they're typed, then the action */}
      <div aria-live="polite" className="flex h-8 items-center gap-2 border-t border-border bg-surface px-3 font-mono text-[10.5px]">
        {keys}
        {acted ? (
          <span key={`a${step}`} className="ml-auto flex items-center gap-1.5 text-foreground/90 animate-fade-in">
            <ActionIcon className="size-3 text-lime" />
            {shortcut.label}
          </span>
        ) : (
          <span className="ml-auto text-muted-foreground/60">ready</span>
        )}
      </div>
    </div>
  );
}

function Rows({ rows, starred = false }: { rows: Row[]; starred?: boolean }) {
  // The app's list view: one framed, hairline-divided list; a tinted tile per type
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
      {rows.map((row) => {
        const Icon = TYPE_ICONS[row.type];
        return (
          <p key={row.title} className="flex items-center gap-2.5 px-2.5 py-1.5 text-[11.5px]">
            <span
              className="grid size-5 shrink-0 place-items-center rounded-md"
              style={{ background: `color-mix(in srgb, ${TYPE_COLORS[row.type]} 13%, transparent)`, color: TYPE_COLORS[row.type] }}
            >
              <Icon className="size-3" />
            </span>
            <span className="min-w-0 truncate font-medium">{row.title}</span>
            {starred ? <Star className="size-3 shrink-0" style={{ color: TYPE_COLORS.note, fill: TYPE_COLORS.note }} /> : null}
            <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
              {row.tags.map((tag) => (
                <span key={tag}>
                  <span className="text-muted-foreground/50">#</span>
                  {tag}
                </span>
              ))}
              <span className="w-6 text-right">{row.age}</span>
            </span>
          </p>
        );
      })}
    </div>
  );
}

function DialogHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <p className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-[12.5px] font-semibold">
      <Icon className="size-3.5 text-lime" />
      {title}
      <span className="ml-auto flex items-center gap-1.5">
        <span className="rounded border border-border px-1 font-mono text-[9px] font-normal text-muted-foreground">esc</span>
        <X className="size-3.5 text-muted-foreground" />
      </span>
    </p>
  );
}

function Field({ label, children, focused = false }: { label: string; children: React.ReactNode; focused?: boolean }) {
  return (
    <span className="grid gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "flex h-7 items-center rounded-md border bg-card px-2 text-[11px]",
          focused ? "border-lime/50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-lime)_10%,transparent)]" : "border-border"
        )}
      >
        {children}
      </span>
    </span>
  );
}

function Footer() {
  return (
    <span className="flex items-center justify-end gap-2 border-t border-border px-3.5 py-2">
      <MockButton className="h-6 px-2 text-[10.5px]">Cancel</MockButton>
      <MockButton primary className="h-6 px-2.5 text-[10.5px]">
        Create
      </MockButton>
    </span>
  );
}

function NewItemForm({ t }: { t: number }) {
  const title = typing("Retry with backoff", t);
  return (
    <>
      <DialogHeader icon={Plus} title="New item" />
      <div className="grid gap-2.5 p-3.5">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
          <Field label="Type">
            <Code className="mr-1.5 size-3" style={{ color: TYPE_COLORS.snippet }} />
            Snippet
            <span className="ml-auto text-[8px] text-muted-foreground">▾</span>
          </Field>
          <Field label="Title *" focused>
            <span className="truncate">{title}</span>
            <span className="caret" />
          </Field>
        </div>
        <span className="grid gap-1">
          <span className="text-[10px] text-muted-foreground">Content</span>
          <span className="rounded-md border border-border bg-card px-2 py-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
            <span className="text-tok-kw">await</span> <span className="text-tok-fn">retry</span>(fn, {"{"} tries: <span className="text-tok-num">3</span> {"}"})
          </span>
        </span>
        <span className="grid gap-1">
          <span className="text-[10px] text-muted-foreground">Tags</span>
          <span className="flex gap-1.5">
            <span className="flex h-7 min-w-0 flex-1 items-center rounded-md border border-border bg-card px-2 text-[11px] text-muted-foreground/60">
              Separate tags with commas
            </span>
            <MockButton icon={Sparkles} className="text-[10.5px]">
              Suggest
            </MockButton>
          </span>
        </span>
      </div>
      <Footer />
    </>
  );
}

function NewCollectionForm({ t }: { t: number }) {
  const name = typing("Side projects", t);
  return (
    <>
      <DialogHeader icon={FolderPlus} title="New collection" />
      <div className="grid gap-2.5 p-3.5">
        <Field label="Name *" focused>
          <span className="truncate">{name}</span>
          <span className="caret" />
        </Field>
        <span className="grid gap-1">
          <span className="text-[10px] text-muted-foreground">Description</span>
          <span className="h-12 rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground/60">Enter collection description</span>
        </span>
      </div>
      <Footer />
    </>
  );
}

function SearchPalette({ t }: { t: number }) {
  const query = typing("dock", t, 200);
  const results: Row[] = [
    { title: "docker system prune -af", type: "command", tags: ["docker"], age: "2h" },
    { title: "Dockerfile for Next.js", type: "snippet", tags: ["docker"], age: "5d" },
    { title: "docker compose up -d", type: "command", tags: ["docker"], age: "1w" },
  ];
  return (
    <>
      <p className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-[12px]">
        <span className="font-mono text-lime">&gt;</span>
        {query ? <span className="font-mono">{query}</span> : <span className="font-mono text-muted-foreground/60">search your bin</span>}
        <span className="caret -ml-1" />
        <span className="ml-auto rounded border border-border px-1 font-mono text-[9px] text-muted-foreground">esc</span>
      </p>
      <div className="h-[118px] p-1.5">
        {query.length >= 2 ? (
          <>
            <p className="px-2 pt-1 pb-1 font-mono text-[9px] tracking-[0.14em] text-muted-foreground/70 uppercase">3 results</p>
            {results.map((row, i) => {
              const Icon = TYPE_ICONS[row.type];
              return (
                <p
                  key={row.title}
                  className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] animate-fade-in", i === 0
                      ? "bg-lime/[0.11] text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-lime)_18%,transparent)]"
                      : "text-muted-foreground")}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Icon className="size-3.5 shrink-0" style={{ color: TYPE_COLORS[row.type] }} />
                  <span className="truncate">{row.title}</span>
                  <span className="ml-auto shrink-0 font-mono text-[9.5px] text-muted-foreground">
                    {row.type} · {row.age}
                  </span>
                </p>
              );
            })}
          </>
        ) : null}
      </div>
      <p className="flex gap-3 border-t border-border px-3.5 py-1.5 font-mono text-[9.5px] text-muted-foreground">
        <span>↑↓ navigate</span>
        <span>⏎ open</span>
        <span className="ml-auto">esc close</span>
      </p>
    </>
  );
}

function HelpSheet() {
  return (
    <>
      <DialogHeader icon={Keyboard} title="Keyboard shortcuts" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3.5 text-[10.5px] text-muted-foreground">
        {SHORTCUTS.map((s) => (
          <span key={s.label} className="flex items-center justify-between gap-2">
            <span className="truncate">{s.label}</span>
            <span className="flex shrink-0 items-center gap-0.5 font-mono">
              {s.keys.map((k, i) => (
                <kbd key={i} className="grid h-4 min-w-4 place-items-center rounded border border-border px-0.5 text-[9px] text-foreground/80">
                  {k}
                </kbd>
              ))}
            </span>
          </span>
        ))}
      </div>
    </>
  );
}
