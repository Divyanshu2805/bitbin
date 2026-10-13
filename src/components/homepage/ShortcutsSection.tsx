"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Code, Folder, FolderOpen, FolderPlus, Hash, Keyboard, LayoutGrid, PanelLeft, Plus, Search, Sparkles, Star, StickyNote, Terminal, X, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { readableColor, readableTint } from "@/lib/utils/color";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { Accent, Section } from "./ui";
import { MOCK_SIDEBAR, MockButton, MockNavRow, MockSearch, MockSectionLabel } from "./mock-app";

// The app's keyboard shortcuts, played out: a BitBin dashboard in an app window
// with a keystroke stage under it. One shortcut at a time, on a loop while on
// screen: only its keys appear on the stage, large, and press down (held
// together for a chord, one after the other for a G-chord), the status bar shows
// what was typed, and then the dashboard does it (search opens, a dialog
// appears, the sidebar folds, the page changes). The keys are the app's own
// (lib/constants/shortcuts.ts): keep the two in step. The list beside it follows
// along and plays a shortcut when clicked; hover to pause.

type Press = { key: string; from: number; to: number };
type Shortcut = { label: string; icon: LucideIcon; keys: string[]; sequence?: boolean; press: Press[]; group: "anywhere" | "go to" };

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
  { label: "Search everything", icon: Search, keys: ["⌘", "K"], press: chord("cmd", "K"), group: "anywhere" },
  { label: "New item", icon: Plus, keys: ["N"], press: tap("N"), group: "anywhere" },
  { label: "New collection", icon: FolderPlus, keys: ["C"], press: tap("C"), group: "anywhere" },
  { label: "Collapse the sidebar", icon: PanelLeft, keys: ["["], press: tap("["), group: "anywhere" },
  { label: "Show all shortcuts", icon: Keyboard, keys: ["?"], press: chord("shift", "/"), group: "anywhere" },
  { label: "Go to dashboard", icon: LayoutGrid, keys: ["G", "D"], sequence: true, press: gThen("D"), group: "go to" },
  { label: "Go to favorites", icon: Star, keys: ["G", "F"], sequence: true, press: gThen("F"), group: "go to" },
  { label: "Go to collections", icon: FolderOpen, keys: ["G", "C"], sequence: true, press: gThen("C"), group: "go to" },
  { label: "Jump to a type (1–7)", icon: Hash, keys: ["3"], press: tap("3"), group: "go to" },
];
const GROUPS = ["anywhere", "go to"] as const;

// The steps the screen reacts to by name
const STEP = { search: 0, item: 1, collection: 2, sidebar: 3, help: 4, dashboard: 5, favorites: 6, collections: 7, type: 8 } as const;

const STEP_MS = 2600;
const ACTION_AT = 1050; // when the dashboard reacts
const TICK = 50;

// How a pressed key is drawn on the stage: its symbol, the name printed under it, and wide modifiers
const CAPS: Record<string, { label: string; sub?: string; wide?: boolean }> = {
  cmd: { label: "⌘", sub: "command", wide: true },
  shift: { label: "⇧", sub: "shift", wide: true },
  "/": { label: "?", sub: "/" },
};

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

  // Try it on your own keyboard: N, C, [, 3, ? and G then D/F/C play their shortcut
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
      else if (afterG && key === "d") play(STEP.dashboard);
      else if (afterG && key === "f") play(STEP.favorites);
      else if (afterG && key === "c") play(STEP.collections);
      else if (key === "n") play(STEP.item);
      else if (key === "c") play(STEP.collection);
      else if (key === "[") play(STEP.sidebar);
      else if (key === "3") play(STEP.type);
      else if (e.key === "?") play(STEP.help);
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
      description="Every common action has a key: N and C to create, [ for the sidebar, 1 to 7 for the types and vim-style G-chords for the pages. Press ? anywhere in the app to see them all."
    >
      <div
        ref={ref}
        className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:gap-10 2xl:gap-14"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {/* Every shortcut, in the `?` sheet's groups; the one playing is lit, and clicking one plays it */}
        <div className="order-2 grid gap-5 lg:order-1" data-reveal>
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 flex items-center gap-3 px-3">
                <span className="font-display text-[12px] font-semibold tracking-[0.14em] text-foreground/80 uppercase">{group}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">{SHORTCUTS.filter((s) => s.group === group).length}</span>
              </p>
              <ul className="grid gap-0.5">
                {SHORTCUTS.map((item, i) => {
                  if (item.group !== group) return null;
                  const Icon = item.icon;
                  const current = i === clock.step;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        aria-current={current}
                        onClick={() => setClock({ step: i, t: 0 })}
                        className={cn(
                          "group relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-lime/50 focus-visible:outline-none",
                          !current && "hover:bg-lime/10 hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-5 shrink-0 place-items-center transition-colors",
                            current ? "text-lime" : "text-muted-foreground group-hover:text-lime"
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className={cn("text-[14px] transition-colors", current ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{item.label}</span>
                        <span className="ml-auto flex items-center gap-1 font-mono text-[11px]">
                          {item.keys.map((key, k) => (
                            <span key={k} className="flex items-center gap-1">
                              {k > 0 && item.sequence ? <span className="text-faint dark:text-muted-foreground/60">then</span> : null}
                              <kbd className={cn("grid h-6 min-w-6 place-items-center rounded border border-b-2 px-1.5", current ? "border-lime/40 text-lime" : "border-border text-muted-foreground transition-colors group-hover:border-lime/40 group-hover:text-lime")}>
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
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* The app and the keystroke stage, as two separate pieces */}
        <div data-scroll="tilt" className="order-1 space-y-4 lg:order-2">
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
                  {typed === 0 ? <span className="text-faint dark:text-muted-foreground/60">waiting for keys…</span> : null}
                </span>
              }
            />
          </div>

          {/* Just the playing shortcut's keys, large, pressing down as they're typed */}
          <div aria-hidden className="relative flex justify-center pt-2">
            <span
              className="pointer-events-none absolute top-1/2 left-1/2 h-20 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/10 blur-3xl transition-opacity duration-300"
              style={{ opacity: down.size ? 1 : 0.3 }}
            />
            <div key={clock.step} className="relative flex min-h-[72px] items-center gap-2.5 sm:min-h-[80px] sm:gap-3">
              {shortcut.press.map((p, i) => (
                <span key={p.key} className="flex items-center gap-2.5 animate-pop sm:gap-3" style={{ animationDelay: `${i * 60}ms` }}>
                  {i > 0 ? <span className="font-mono text-[12px] text-muted-foreground">{shortcut.sequence ? "then" : "+"}</span> : null}
                  <Cap id={p.key} state={down.has(p.key) ? "down" : t >= p.to ? "done" : "idle"} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/** A large keycap on the stage: raised while waiting, pushed in and glowing while held, lit once released. */
function Cap({ id, state }: { id: string; state: "idle" | "down" | "done" }) {
  const cap = CAPS[id] ?? { label: id };
  return (
    <span
      className={cn(
        "relative flex h-14 flex-col items-center justify-center rounded-xl border bg-gradient-to-b font-mono leading-none transition-[transform,box-shadow,color,border-color] duration-100 sm:h-16",
        cap.wide ? "w-20 sm:w-24" : "w-14 sm:w-16",
        state === "down"
          ? "translate-y-[3px] border-lime/60 from-lime/25 to-lime/[0.08] text-lime shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_0_light-dark(#cfd0c8,#07080a),0_0_0_1px_color-mix(in_srgb,var(--brand-lime)_15%,transparent),0_0_32px_-4px_var(--brand-lime)]"
          : cn(
              "from-[light-dark(#ffffff,#22262c)] to-[light-dark(#f0f0ea,#16181c)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_4px_0_light-dark(#cfd0c8,#07080a),0_8px_14px_-6px_light-dark(rgb(20_22_26/0.2),rgb(0_0_0/0.7))]",
              state === "done" ? "border-lime/40 text-lime" : "border-[light-dark(#d6d7cf,#2a2e35)] text-foreground/85"
            )
      )}
    >
      <span className={cap.wide ? "text-[20px] sm:text-[22px]" : "text-[19px] sm:text-[22px]"}>{cap.label}</span>
      {cap.sub ? <span className="mt-1 text-[8.5px] opacity-60 sm:text-[9.5px]">{cap.sub}</span> : null}
    </span>
  );
}

type Route = "dashboard" | "favorites" | "collections" | "commands";

const NAV: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { route: "favorites", label: "Favorites", icon: Star },
  { route: "collections", label: "Collections", icon: FolderOpen },
];

const TYPE_COLORS = {
  snippet: readableColor("#60a5fa"),
  prompt: readableColor("#a78bfa"),
  command: readableColor("#fb923c"),
  note: readableColor("#fde047"),
};
type ItemType = keyof typeof TYPE_COLORS;
const TYPE_ICONS: Record<ItemType, LucideIcon> = { snippet: Code, prompt: Sparkles, command: Terminal, note: StickyNote };
// The sidebar's first four types, in its order: 1 snippets, 2 prompts, 3 commands, 4 notes
const TYPE_COUNTS: Record<ItemType, number> = { snippet: 42, prompt: 18, command: 67, note: 12 };

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
const COMMANDS: Row[] = [
  { title: "docker system prune -af", type: "command", tags: ["docker"], age: "2h" },
  { title: "kubectl logs -f deploy/api", type: "command", tags: ["k8s"], age: "4d" },
  { title: "Squash the last 3 commits", type: "command", tags: ["git"], age: "1w" },
  { title: "psql connect to staging", type: "command", tags: ["postgres"], age: "2w" },
];

/** What a shortcut's result types into its field: `text`, a character at a time, from ACTION_AT. */
function typing(text: string, t: number, delay = 250) {
  return text.slice(0, Math.max(0, Math.floor((t - ACTION_AT - delay) / 55)));
}

/** Where you are: a G-chord or a digit moves you, and you stay there until the next one. */
function routeAt(step: number, acted: boolean): Route {
  if (step < STEP.favorites || (step === STEP.favorites && !acted)) return "dashboard";
  if (step === STEP.favorites || (step === STEP.collections && !acted)) return "favorites";
  if (step === STEP.collections || (step === STEP.type && !acted)) return "collections";
  return "commands";
}

/** The app, reacting to the shortcut being played, with a status bar showing what was typed. */
function DashboardScreen({ step, acted, t, keys }: { step: number; acted: boolean; t: number; keys: React.ReactNode }) {
  const route = routeAt(step, acted);
  const collapsed = step === STEP.sidebar && acted;
  const overlay = !acted ? null : step === STEP.search ? "search" : step === STEP.item ? "item" : step === STEP.collection ? "collection" : step === STEP.help ? "help" : null;
  const shortcut = SHORTCUTS[step];
  const ActionIcon = shortcut.icon;

  return (
    <div className="flex flex-col">
      <div className="relative flex h-[320px] bg-card text-left sm:h-[360px] xl:h-[400px]">
        {/* Sidebar: the logo and the collapse button on top, as in the app */}
        <aside
          className={cn(
            "flex shrink-0 flex-col gap-0.5 overflow-hidden border-r border-border p-2 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            MOCK_SIDEBAR,
            collapsed ? "w-11" : "w-[150px] xl:w-[176px]"
          )}
        >
          <span className="mb-1 flex h-7 items-center gap-1.5 px-1 whitespace-nowrap">
            <LogoMark animated={false} className="size-4 shrink-0" />
            <span className={cn("font-display text-[12.5px] font-bold transition-opacity duration-300", collapsed && "opacity-0")}>
              Bit<span className="logo-word">Bin</span>
            </span>
            <PanelLeft className={cn("ml-auto size-3.5 shrink-0 text-muted-foreground transition-opacity duration-300", collapsed && "opacity-0")} />
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
              active={route === "commands" && type === "command"}
              hideLabel={collapsed}
            />
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar: the search prompt, then New collection and New item with their keys */}
          <div className="flex h-10 shrink-0 items-center gap-2 px-3.5">
            <MockSearch className="mx-auto h-6 w-full max-w-56" />
            <MockButton accent="var(--brand-coral)" icon={FolderPlus} keys="C" className="hidden h-6 px-1.5 sm:inline-flex [&_svg]:text-coral" />
            <MockButton primary icon={Plus} keys="N" className="h-6 px-1.5" />
          </div>

          {/* The page; it slides in when the route changes */}
          <div key={route} className="min-h-0 flex-1 overflow-hidden px-3.5 pb-3.5 animate-[fade-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
            <p className="mb-2.5 font-mono text-[9.5px] text-lime">
              ~/{route === "commands" ? "items/commands" : route}
            </p>
            {route === "dashboard" ? (
              <>
                {/* The dashboard's `$ bin --stats` pane: one panel, a column per counter */}
                <div className="relative mt-1.5 grid grid-cols-2 rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] sm:grid-cols-4 sm:divide-x sm:divide-border">
                  <span className="absolute -top-2 left-3 bg-card px-1 font-mono text-[9px] text-muted-foreground">
                    <span className="text-lime">$</span> bin --stats
                  </span>
                  {(
                    [
                      ["Items", "181", "var(--brand-lime)"],
                      ["Collections", "6", "var(--brand-cyan)"],
                      ["Starred items", "9", "light-dark(#7f4d06, #ffc857)"],
                      ["Starred collections", "2", "var(--brand-coral)"],
                    ] as const
                  ).map(([label, n, color]) => (
                    <span key={label} className="min-w-0 px-3 pt-2.5 pb-2">
                      <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-muted-foreground">
                        <span className="size-1.5 shrink-0 rounded-[2px]" style={{ background: color }} />
                        <span className="truncate">{label}</span>
                      </span>
                      <span className="mt-0.5 block font-display text-[18px] leading-tight font-bold tabular-nums">{n}</span>
                    </span>
                  ))}
                </div>
                <p className="mt-3 mb-1.5 font-mono text-[10px] text-muted-foreground">
                  Recent <span className="text-faint dark:text-muted-foreground/60">[3]</span>
                </p>
                <Rows rows={RECENT} />
              </>
            ) : route === "favorites" ? (
              <>
                <p className="mb-1.5 font-mono text-[10px] text-muted-foreground">
                  items <span className="text-faint dark:text-muted-foreground/60">[4]</span>
                </p>
                <Rows rows={FAVORITES} starred />
              </>
            ) : route === "commands" ? (
              <>
                <p className="mb-1.5 flex items-center gap-2 font-display text-[14px] font-bold tracking-tight">
                  <Terminal className="size-3.5" style={{ color: TYPE_COLORS.command }} />
                  Commands
                  <span className="font-mono text-[10px] font-normal text-muted-foreground">[{TYPE_COUNTS.command}]</span>
                </p>
                <Rows rows={COMMANDS} />
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
                        style={{ background: `color-mix(in srgb, ${readableColor(color)} 14%, var(--card))`, color: readableColor(color) }}
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
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/35 p-3 animate-fade-in sm:p-4">
            <div
              key={overlay}
              className={cn(
                "w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_60px_-20px_light-dark(rgb(20_22_26/0.3),rgb(0_0_0/0.9))] animate-[fade-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]",
                overlay === "item" || overlay === "help" ? "max-w-[440px]" : "max-w-[360px]"
              )}
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
            {step === STEP.type ? "Go to commands" : shortcut.label}
          </span>
        ) : (
          <span className="ml-auto text-faint dark:text-muted-foreground/60">ready</span>
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
              style={{ background: `color-mix(in srgb, ${TYPE_COLORS[row.type]} 13%, var(--card))`, color: TYPE_COLORS[row.type] }}
            >
              <Icon className="size-3" />
            </span>
            <span className="min-w-0 truncate font-medium">{row.title}</span>
            {starred ? <Star className="size-3 shrink-0" style={{ color: TYPE_COLORS.note, fill: TYPE_COLORS.note }} /> : null}
            <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
              {row.tags.map((tag) => (
                <span key={tag}>
                  <span className="text-faint dark:text-muted-foreground/50">#</span>
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

/** The New item dialog, small: its path and title, the type chips, the title and code, tags and a collection. */
function NewItemForm({ t }: { t: number }) {
  const title = typing("Retry with backoff", t);
  const types: ItemType[] = ["snippet", "prompt", "command", "note"];
  return (
    <>
      <div className="relative border-b border-border px-3.5 pt-3 pb-2.5">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-lime to-transparent" />
        <p className="font-mono text-[9.5px] text-muted-foreground">
          <span className="text-lime">~/</span>items/snippets/<span className="text-foreground/70">new</span>
        </p>
        <p className="mt-1 flex items-center gap-2 font-display text-[13.5px] font-bold tracking-tight">
          <span
            className="grid size-5 place-items-center rounded-md"
            style={{ background: readableTint("#60a5fa", 16), color: TYPE_COLORS.snippet }}
          >
            <Code className="size-3" />
          </span>
          New snippet
          <X className="ml-auto size-3.5 text-muted-foreground" />
        </p>
      </div>
      {/* The type switcher: a chip per type, the chosen one filled with its colour */}
      <p className="flex gap-1 overflow-hidden border-b border-border bg-surface/60 px-3.5 py-1.5 font-mono text-[9.5px]">
        {types.map((type, i) => {
          const Icon = TYPE_ICONS[type];
          return (
            <span
              key={type}
              className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5", i === 0 ? "text-foreground" : "text-muted-foreground")}
              style={{ background: `color-mix(in srgb, ${TYPE_COLORS[type]} ${i === 0 ? 30 : 14}%, var(--card))` }}
            >
              <Icon className="size-3" style={{ color: TYPE_COLORS[type] }} />
              {type}
            </span>
          );
        })}
        <span className="inline-flex h-5 items-center px-1 text-faint dark:text-muted-foreground/50">file · image · link</span>
      </p>
      <div className="grid gap-2 px-3.5 py-2.5">
        <Field label="Title *" focused>
          <span className="truncate font-medium">{title}</span>
          <span className="caret" />
        </Field>
        <span className="grid gap-1">
          <span className="flex items-center justify-between text-[10px] text-muted-foreground">
            Code
            <span className="inline-flex items-center gap-1 rounded border border-border px-1 font-mono text-[9px]">
              typescript <ChevronsUpDown className="size-2.5 opacity-60" />
            </span>
          </span>
          <span className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
            <span className="text-tok-kw">await</span> <span className="text-tok-fn">retry</span>(fn, {"{"} tries: <span className="text-tok-num">3</span> {"}"})
          </span>
        </span>
        <span className="hidden grid-cols-2 gap-2 sm:grid">
          <span className="grid gap-1">
            <span className="flex items-center justify-between text-[10px] text-muted-foreground">
              Tags
              <span className="inline-flex items-center gap-1 font-mono text-[9px] text-violet">
                <Sparkles className="size-2.5" /> Suggest Tags
              </span>
            </span>
            <span className="flex h-7 items-center rounded-md border border-border bg-card px-2 font-mono text-[10px] text-faint dark:text-muted-foreground/60">
              Enter or comma to add
            </span>
          </span>
          <Field label="Collections">
            <span className="text-faint dark:text-muted-foreground/60">Select collections…</span>
            <ChevronsUpDown className="ml-auto size-3 text-muted-foreground" />
          </Field>
        </span>
      </div>
      <span className="flex items-center gap-2 border-t border-border bg-surface/60 px-3.5 py-2">
        <span className="hidden items-center gap-1 font-mono text-[9.5px] text-muted-foreground sm:flex">
          <span className="kbd">⌘</span>
          <span className="kbd">↵</span> create
        </span>
        <MockButton icon={X} className="ml-auto h-6 px-2 text-[10.5px]">
          Cancel
        </MockButton>
        <MockButton primary icon={Plus} className="h-6 px-2.5 text-[10.5px]">
          Create snippet
        </MockButton>
      </span>
    </>
  );
}

function NewCollectionForm({ t }: { t: number }) {
  const name = typing("Side projects", t);
  return (
    <>
      <p className="flex items-center gap-2 px-3.5 pt-3.5 text-[13px] font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-lime/20 text-lime">
          <FolderPlus className="size-3.5" />
        </span>
        New Collection
        <X className="ml-auto size-3.5 text-muted-foreground" />
      </p>
      <div className="grid gap-2.5 p-3.5">
        <Field label="Name *" focused>
          <span className="truncate">{name}</span>
          <span className="caret" />
        </Field>
        <span className="grid gap-1">
          <span className="text-[10px] text-muted-foreground">Description</span>
          <span className="h-12 rounded-md border border-border bg-card px-2 py-1.5 text-[11px] text-faint dark:text-muted-foreground/60">Enter collection description</span>
        </span>
      </div>
      <span className="flex items-center justify-end gap-2 px-3.5 pb-3.5">
        <MockButton className="h-6 px-2 text-[10.5px]">Cancel</MockButton>
        <MockButton primary icon={FolderPlus} className="h-6 px-2.5 text-[10.5px]">
          Create
        </MockButton>
      </span>
    </>
  );
}

/** ⌘K: the palette, as the app draws it: the prompt, `items`, a tile per result with its tags and type. */
function SearchPalette({ t }: { t: number }) {
  const query = typing("dock", t, 200);
  const results: Row[] = [
    { title: "docker system prune -af", type: "command", tags: ["docker"], age: "2h" },
    { title: "Dockerfile for Next.js", type: "snippet", tags: ["docker", "next"], age: "5d" },
    { title: "docker compose up -d", type: "command", tags: ["docker"], age: "1w" },
  ];
  return (
    <>
      <p className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-[12px]">
        <span className="font-mono font-semibold text-lime">&gt;</span>
        {query ? <span className="font-mono">{query}</span> : <span className="truncate font-mono text-faint dark:text-muted-foreground/60">Search items, #tags and collections</span>}
        <span className="caret -ml-1" />
      </p>
      <div className="h-[132px] p-1.5">
        {query.length >= 2 ? (
          <>
            <p className="px-2 pt-0.5 pb-1 font-mono text-[9.5px] text-muted-foreground">Items</p>
            {results.map((row, i) => {
              const Icon = TYPE_ICONS[row.type];
              return (
                <p
                  key={row.title}
                  className={cn("flex items-center gap-2 rounded-md px-2 py-1 text-[11.5px] animate-fade-in", i === 0 && "bg-lime/[0.09]")}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${TYPE_COLORS[row.type]} 14%, var(--card))` }}>
                    <Icon className="size-3" style={{ color: TYPE_COLORS[row.type] }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.title}</span>
                    <span className="block truncate font-mono text-[9px] text-cyan">{row.tags.map((tag) => `#${tag}`).join(" ")}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[9.5px]" style={{ color: TYPE_COLORS[row.type] }}>
                    {row.type}
                  </span>
                </p>
              );
            })}
          </>
        ) : null}
      </div>
      <p className="flex gap-3 border-t border-border bg-surface/60 px-3.5 py-1.5 font-mono text-[9.5px] text-muted-foreground">
        <span>↑↓ move</span>
        <span>⏎ open</span>
        <span className="ml-auto">esc close</span>
      </p>
    </>
  );
}

// The `?` sheet's groups, as the app lists them
const HELP: { title: string; items: [label: string, keys: string[]][] }[] = [
  {
    title: "General",
    items: [
      ["Search everything", ["⌘", "K"]],
      ["New item", ["N"]],
      ["New collection", ["C"]],
      ["Collapse the sidebar", ["["]],
    ],
  },
  {
    title: "Go to",
    items: [
      ["Dashboard", ["G", "D"]],
      ["Favorites", ["G", "F"]],
      ["Collections", ["G", "C"]],
      ["A type's page", ["1", "–", "7"]],
    ],
  },
  {
    title: "Open item",
    items: [
      ["Edit", ["E"]],
      ["Favorite", ["F"]],
      ["Pin", ["P"]],
      ["Full screen", ["M"]],
    ],
  },
  {
    title: "Editing",
    items: [
      ["Save", ["⌘", "S"]],
      ["Delete", ["⌫"]],
      ["Edit a collection", ["E"]],
      ["This sheet", ["?"]],
    ],
  },
];

function HelpSheet() {
  return (
    <>
      <p className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-[12.5px] font-semibold">
        <Keyboard className="size-3.5 text-lime" />
        Keyboard shortcuts
        <span className="ml-auto flex items-center gap-1.5">
          <span className="rounded border border-border px-1 font-mono text-[9px] font-normal text-muted-foreground">esc</span>
          <X className="size-3.5 text-muted-foreground" />
        </span>
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-3.5">
        {HELP.map((group) => (
          <div key={group.title}>
            <p className="mb-1 font-mono text-[9.5px] text-muted-foreground">
              {group.title}
            </p>
            <div className="grid gap-1 text-[10.5px] text-muted-foreground">
              {group.items.map(([label, keys]) => (
                <span key={label} className="flex items-center justify-between gap-2">
                  <span className="truncate">{label}</span>
                  <span className="flex shrink-0 items-center gap-0.5 font-mono">
                    {keys.map((k, i) => (
                      <kbd key={i} className="grid h-4 min-w-4 place-items-center rounded border border-border px-0.5 text-[9px] text-foreground/80">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
