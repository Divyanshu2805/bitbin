"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Code, Link as LinkIcon, Sparkles, StickyNote, Terminal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MockSearch } from "./mock-app";
import { readableColor, readableTint } from "@/lib/utils/color";
import { prefersReducedMotion } from "@/hooks/use-motion";
import { Accent, SectionHeading } from "./ui";

// Before and after, side by side in one panel. On the left, the things you've
// saved are a pile of chips from the apps they're stuck in, jostling around and
// scattering from the pointer. On the right, an empty BitBin with a dashed slot
// for each of them. Flip the switch to "After" and every chip flies across into
// its slot, grouped by type. It flips by itself once it's been on screen a moment.

const SOURCES = {
  notion: { app: "Notion", color: "#e5e7eb", svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.29c-.42-.326-.98-.7-2.055-.607L3.01 2.89c-.466.046-.56.28-.374.466l1.823 1.852zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.84c-.56.047-.747.327-.747.98zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.746 0-.933-.234-1.493-.933l-4.571-7.182v6.95l1.446.327s0 .84-1.166.84l-3.22.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.453-.233 4.759 7.275V9.2l-1.213-.14c-.093-.513.28-.886.746-.933l3.22-.187z"/></svg>` },
  github: { app: "GitHub Gist", color: "#e5e7eb", svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>` },
  slack: { app: "Slack", color: "#e01e5a", svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z"/></svg>` },
  vscode: { app: "VS Code", color: "#3b9eff", svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.583 2.002L7.637 10.596 3.213 7.569l-1.21.752v7.358l1.21.752 4.424-3.027 9.946 8.594L22 19.9V4.1l-4.417-2.098zM7.396 14.358L4.542 12l2.854-2.358v4.716zM17.583 17.1l-7.474-5.1 7.474-5.1v10.2z"/></svg>` },
  browser: { app: "Browser tab", color: "#34d399", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` },
  terminal: { app: "~/.zsh_history", color: "#fb923c", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>` },
  textfile: { app: "notes.txt", color: "#fde047", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
  bookmark: { app: "Bookmarks", color: "#a78bfa", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>` },
} as const;

type Source = keyof typeof SOURCES;

// In the bin, each type is a panel; the panels sit two to a row, in this order,
// and a panel's tiles sit side by side.
const GROUPS: { name: string; icon: LucideIcon; color: string }[] = [
  { name: "Snippets", icon: Code, color: "#60a5fa" },
  { name: "Commands", icon: Terminal, color: "#fb923c" },
  { name: "Prompts", icon: Sparkles, color: "#a78bfa" },
  { name: "Notes", icon: StickyNote, color: "#fde047" },
  { name: "Links", icon: LinkIcon, color: "#34d399" },
];

const ITEMS: { title: string; group: string; source: Source }[] = [
  { title: "useDebounce.ts", group: "Snippets", source: "vscode" },
  { title: "zod helpers", group: "Snippets", source: "github" },
  { title: "retry-backoff.ts", group: "Snippets", source: "slack" },
  { title: "docker prune", group: "Commands", source: "terminal" },
  { title: "git rebase", group: "Commands", source: "slack" },
  { title: "kubectl logs", group: "Commands", source: "terminal" },
  { title: "Code review", group: "Prompts", source: "notion" },
  { title: "Postgres indexes", group: "Notes", source: "textfile" },
  { title: "React reference", group: "Links", source: "browser" },
  { title: "Tailwind docs", group: "Links", source: "bookmark" },
];

const CHIP_W = 80; // the tiles are squarish, the same size before and after
const CHIP_H = 64;
const TILE_GAP = 8;
const PANEL_PAD = 10;
const PANEL_HEADER = 22;
const PANEL_GAP = 12;
const PAD = 16;
const BAR = 44; // the BitBin window's title bar
const MESS_TOP = 36; // room for the ~/everywhere label
const SPEED = 1.3; // px per 60 fps frame; the loop scales it by real frame time
const REPEL_RADIUS = 120;
const REPEL_FORCE = 0.7;

type Rect = { x: number; y: number; w: number; h: number };
type Layout = {
  mess: Rect;
  bin: Rect;
  /** Where each item's tile lands, by item index */
  slots: { x: number; y: number }[];
  panels: (Rect & { name: string })[];
  height: number;
  stacked: boolean;
};

/** Both panes, every group panel and every tile's slot, for a panel `width` wide. */
function computeLayout(width: number): Layout {
  const stacked = width < 820;
  const binW = stacked ? width : Math.round(width * 0.54);
  const cols = binW >= 480 ? 2 : 1;
  const panelW = (binW - PAD * 2 - PANEL_GAP * (cols - 1)) / cols;
  const perRow = Math.max(1, Math.floor((panelW - PANEL_PAD * 2 + TILE_GAP) / (CHIP_W + TILE_GAP)));
  const binX = stacked ? 0 : width - binW;

  const slots: Layout["slots"] = [];
  const panels: Layout["panels"] = [];
  let y = BAR + PAD;
  for (let start = 0; start < GROUPS.length; start += cols) {
    const rowGroups = GROUPS.slice(start, start + cols);
    let rowH = 0;
    rowGroups.forEach((group, c) => {
      const x = binX + PAD + c * (panelW + PANEL_GAP);
      const members = ITEMS.map((item, i) => (item.group === group.name ? i : -1)).filter((i) => i >= 0);
      members.forEach((itemIndex, k) => {
        slots[itemIndex] = {
          x: x + PANEL_PAD + (k % perRow) * (CHIP_W + TILE_GAP),
          y: y + PANEL_PAD + PANEL_HEADER + Math.floor(k / perRow) * (CHIP_H + TILE_GAP),
        };
      });
      const tileRows = Math.max(1, Math.ceil(members.length / perRow));
      const h = PANEL_PAD * 2 + PANEL_HEADER + tileRows * CHIP_H + (tileRows - 1) * TILE_GAP;
      panels.push({ x, y, w: panelW, h, name: group.name });
      rowH = Math.max(rowH, h);
    });
    // Panels in a row share its height
    for (const panel of panels.slice(-rowGroups.length)) panel.h = rowH;
    y += rowH + PANEL_GAP;
  }
  const binH = y - PANEL_GAP + PAD;

  if (stacked) {
    const messH = 300;
    // Shift the bin below the mess.
    for (const slot of slots) slot.y += messH;
    for (const panel of panels) panel.y += messH;
    return {
      mess: { x: 0, y: 0, w: width, h: messH },
      bin: { x: 0, y: messH, w: width, h: binH },
      slots,
      panels,
      height: messH + binH,
      stacked,
    };
  }
  const height = Math.max(binH, 400);
  return {
    mess: { x: 0, y: 0, w: width - binW, h: height },
    bin: { x: binX, y: 0, w: binW, h: height },
    slots,
    panels,
    height,
    stacked,
  };
}

/** `s` is the tile's own cruising speed, so they don't all drift in step. */
type Body = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number };

export default function OrganizeSection() {
  const boxRef = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  const bodies = useRef<Body[]>([]);
  const pointer = useRef({ x: -9999, y: -9999 });
  const frame = useRef(0);
  const autoRan = useRef(false);
  const onScreen = useRef(false);
  const [binned, setBinned] = useState(false);
  const [layout, setLayout] = useState<Layout>(() => computeLayout(1136));

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setLayout(computeLayout(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // The physics only runs while the section is on screen.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting;
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Flip to "After" by itself once it's been on screen for a moment.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || autoRan.current) return;
        autoRan.current = true;
        timer = window.setTimeout(() => setBinned(true), prefersReducedMotion() ? 0 : 2000);
      },
      { threshold: 0.5 }
    );
    observer.observe(box);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const place = useCallback((i: number, b: Body) => {
    const el = chips.current[i];
    if (el) el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.r}deg)`;
  }, []);

  // Before: the chips pile up in the left pane, drift, knock the walls and
  // scatter away from the pointer.
  useEffect(() => {
    if (binned) return;
    const { mess } = layout;
    const maxX = mess.x + mess.w - CHIP_W - PAD;
    const minY = mess.y + MESS_TOP;
    const maxY = mess.y + mess.h - CHIP_H - PAD;

    // Scatter them anywhere in the pane: of a few random spots, take the one
    // furthest from the tiles already placed, so it's messy but not one heap.
    const placed: { x: number; y: number }[] = [];
    bodies.current = ITEMS.map(() => {
      let best = { x: 0, y: 0 };
      let bestGap = -1;
      for (let attempt = 0; attempt < 12; attempt++) {
        const x = mess.x + PAD + Math.random() * Math.max(0, maxX - mess.x - PAD);
        const y = minY + Math.random() * Math.max(0, maxY - minY);
        const gap = Math.min(Infinity, ...placed.map((p) => Math.hypot(p.x - x, p.y - y)));
        if (gap > bestGap) {
          bestGap = gap;
          best = { x, y };
        }
      }
      placed.push(best);
      const angle = Math.random() * Math.PI * 2;
      const s = SPEED * (0.5 + Math.random() * 1.1);
      return {
        ...best,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        r: (Math.random() - 0.5) * 24,
        vr: (Math.random() - 0.5) * 0.4,
        s,
      };
    });
    chips.current.forEach((el, i) => {
      if (!el) return;
      el.style.transition = `transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${i * 40}ms`;
      place(i, bodies.current[i]);
    });

    if (prefersReducedMotion()) return;

    let start = 0;
    let last = 0;
    const step = (time: number) => {
      // Time-based, so the drift keeps its speed however busy the page is:
      // `k` is this frame's length in 60 fps frames (capped after a stall).
      const k = last ? Math.min(time - last, 50) / (1000 / 60) : 1;
      last = time;
      // Let the chips land in the pile before the physics takes over.
      if (!start) start = time;
      if (time - start > 1100 && onScreen.current) {
        const damp = Math.pow(0.97, k);
        chips.current.forEach((el) => {
          if (el) el.style.transition = "none";
        });
        const { x: px, y: py } = pointer.current;
        bodies.current.forEach((b, i) => {
          const dx = b.x + CHIP_W / 2 - px;
          const dy = b.y + CHIP_H / 2 - py;
          const dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS && dist > 0) {
            const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
            b.vx += (dx / dist) * force * k;
            b.vy += (dy / dist) * force * k;
            b.vr += (dx > 0 ? 1 : -1) * force * 0.3 * k;
          }
          b.vx *= damp;
          b.vy *= damp;
          b.vr *= damp;
          const speed = Math.hypot(b.vx, b.vy);
          if (speed < b.s) {
            const angle = Math.atan2(b.vy, b.vx) || Math.random() * 6;
            b.vx = Math.cos(angle) * b.s;
            b.vy = Math.sin(angle) * b.s;
          }
          b.x += b.vx * k;
          b.y += b.vy * k;
          b.r = Math.max(-18, Math.min(18, b.r + b.vr * k));
          if (b.x < mess.x + PAD) {
            b.x = mess.x + PAD;
            b.vx = Math.abs(b.vx);
          }
          if (b.x > maxX) {
            b.x = maxX;
            b.vx = -Math.abs(b.vx);
          }
          if (b.y < minY) {
            b.y = minY;
            b.vy = Math.abs(b.vy);
          }
          if (b.y > maxY) {
            b.y = maxY;
            b.vy = -Math.abs(b.vy);
          }
          place(i, b);
        });
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [binned, layout, place]);

  // After: every chip flies across into its slot, one after another.
  useEffect(() => {
    if (!binned) return;
    cancelAnimationFrame(frame.current);
    chips.current.forEach((el, i) => {
      const slot = layout.slots[i];
      if (!el || !slot) return;
      el.style.transition = `transform 0.85s cubic-bezier(0.65, 0, 0.35, 1) ${i * 90}ms`;
      el.style.transform = `translate(${slot.x}px, ${slot.y}px) rotate(0deg)`;
    });
  }, [binned, layout]);

  const { mess, bin } = layout;

  return (
    <section
      id="organize"
      className="relative scroll-mt-24 py-24 sm:py-32"
      style={{ "--accent": "var(--brand-coral)" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeading
          index="00"
          label="problem"
          title={
            <>
              Your knowledge is everywhere. <Accent>Bin it.</Accent>
            </>
          }
          description="Snippets in gists, commands in shell history, prompts in Notion, links in forty tabs. Stir up the mess with your cursor, then flip the switch."
        />

        <div data-reveal className="mt-12 overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-[var(--shadow-lift)]">
          {/* Panel toolbar with the Before / After switch */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3">
            {/* The app's segmented toggle: a sunken track, and a tinted glass pill that slides */}
            <div
              role="radiogroup"
              aria-label="Show"
              className="relative grid grid-cols-2 rounded-lg border border-border bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] p-1 font-mono text-xs shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md transition-[translate,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  binned
                    ? "translate-x-full bg-lime/15 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-lime)_40%,transparent),0_6px_18px_-10px_var(--brand-lime)]"
                    : "translate-x-0 bg-coral/15 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-coral)_40%,transparent),0_6px_18px_-10px_var(--brand-coral)]"
                )}
              />
              {[
                { value: false, label: "Before" },
                { value: true, label: "After" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={binned === opt.value}
                  onClick={() => setBinned(opt.value)}
                  className={cn(
                    "relative z-10 rounded-md px-4 py-1.5 font-semibold transition-colors duration-300",
                    binned === opt.value ? (opt.value ? "text-lime" : "text-coral") : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {binned ? (
                <span className="text-lime">10 items · 5 types · one bin</span>
              ) : (
                <span className="text-coral">10 things · 8 places · good luck</span>
              )}
            </p>
            <p className="ml-auto hidden font-mono text-[11px] text-faint dark:text-muted-foreground/60 md:block">
              {binned ? "press Before to make a mess again" : "move your cursor through the pile"}
            </p>
          </div>

          <div
            ref={boxRef}
            className="relative"
            style={{ height: layout.height }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            }}
            onPointerLeave={() => {
              pointer.current = { x: -9999, y: -9999 };
            }}
          >
            {/* Left: the mess */}
            <div
              className={cn(
                "absolute bg-dots transition-colors duration-700",
                "bg-surface/40",
                layout.stacked ? "border-b border-border" : "border-r border-border"
              )}
              style={{ left: mess.x, top: mess.y, width: mess.w, height: mess.h }}
            >
              <p className="absolute top-3 left-4 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", binned ? "bg-muted-foreground/40" : "bg-coral animate-led text-coral")} />
                ~/everywhere
              </p>
              <p
                className={cn(
                  "absolute inset-0 grid place-items-center font-mono text-sm text-muted-foreground transition-opacity duration-500",
                  binned ? "opacity-100 delay-700" : "opacity-0"
                )}
              >
                <span>
                  <span className="text-lime">✓</span> nothing left behind
                </span>
              </p>
            </div>

            {/* Right: BitBin, waiting with a slot for everything */}
            <div className="absolute" style={{ left: bin.x, top: bin.y, width: bin.w, height: bin.h }}>
              <div className="flex h-11 items-center gap-2.5 border-b border-border px-4">
                <span className="font-display text-sm font-bold">
                  Bit<span className="text-lime">Bin</span>
                </span>
                <MockSearch className="ml-auto w-40 sm:w-56" />
              </div>
            </div>

            {/* A panel per type, its header on top */}
            {layout.panels.map((panel) => {
              const group = GROUPS.find((g) => g.name === panel.name)!;
              const Icon = group.icon;
              const count = ITEMS.filter((item) => item.group === panel.name).length;
              return (
                <div
                  key={panel.name}
                  aria-hidden
                  className="absolute rounded-xl border transition-[border-color,background-color] duration-700"
                  style={{
                    left: panel.x,
                    top: panel.y,
                    width: panel.w,
                    height: panel.h,
                    borderColor: binned ? readableTint(group.color, 20) : "var(--border)",
                    background: binned ? readableTint(group.color, 3) : "transparent",
                  }}
                >
                  <p
                    className="absolute flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em]"
                    style={{ left: PANEL_PAD, top: PANEL_PAD - 2, color: readableColor(group.color) }}
                  >
                    <Icon className="size-3.5" />
                    {panel.name}
                    <span className={cn("tabular-nums transition-colors duration-500", binned ? "text-muted-foreground" : "text-faint dark:text-muted-foreground/40")}>
                      {binned ? count : 0}
                    </span>
                  </p>
                </div>
              );
            })}

            {/* Dashed slots where each tile will land */}
            {layout.slots.map((slot, i) => (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "absolute rounded-lg border border-dashed transition-opacity duration-500",
                  binned ? "border-transparent opacity-0" : "border-border opacity-100"
                )}
                style={{ left: slot.x, top: slot.y, width: CHIP_W, height: CHIP_H, transitionDelay: binned ? `${i * 90 + 500}ms` : "0ms" }}
              />
            ))}

            {/* The tiles: the app's logo, then the title */}
            {ITEMS.map((item, i) => {
              const group = GROUPS.find((g) => g.name === item.group)!;
              const source = SOURCES[item.source];
              return (
                <div
                  key={item.title}
                  ref={(el) => {
                    chips.current[i] = el;
                  }}
                  className="absolute top-0 left-0 will-change-transform"
                  style={{ zIndex: binned ? 1 : 2 }}
                >
                  <div
                    className={cn(
                      "flex flex-col justify-between rounded-lg border p-2 shadow-[var(--shadow-soft)] transition-[background-color,border-color] duration-700",
                      binned ? "bg-surface" : "border-border bg-card hover:border-coral/50"
                    )}
                    style={{
                      width: CHIP_W,
                      height: CHIP_H,
                      borderColor: binned ? readableTint(group.color, 25) : undefined,
                      transitionDelay: binned ? `${i * 90 + 500}ms` : "0ms",
                    }}
                  >
                    <span className="size-4 shrink-0" style={{ color: readableColor(source.color) }} dangerouslySetInnerHTML={{ __html: source.svg }} />
                    <span className="sr-only">From {source.app}:</span>
                    <span className="line-clamp-2 text-[11px] leading-tight font-medium [overflow-wrap:anywhere]">{item.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
