"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Check, Code, CornerDownLeft, Folder, Link as LinkIcon, Sparkles, StickyNote, Terminal, type LucideIcon } from "lucide-react";
import { readableColor } from "@/lib/utils/color";
import { prefersReducedMotion } from "@/hooks/use-motion";
import { Accent } from "./ui";

// "How it works", the sheet after the hero: three cards that stick under the navbar and stack (landing.css).
// Each plays its idea as it is scrolled into place, and back again on the way up: items of
// every type landing in the bin, collections filling up and tags picking out their collection,
// and a search that finds the item, opens it and copies it. The line along the bottom of each
// visual shows how far it has played. Rows wear their item type's colour, as they do in the app.
// Every visual keeps its full height from the start, so nothing moves as it plays.

/** The clock moves in steps, so a visual re-renders only when something in it can change */
const TICK = 50;

const TYPES = {
  snippet: { icon: Code, color: "#60a5fa" },
  prompt: { icon: Sparkles, color: "#a78bfa" },
  command: { icon: Terminal, color: "#fb923c" },
  note: { icon: StickyNote, color: "#fde047" },
  link: { icon: LinkIcon, color: "#34d399" },
} satisfies Record<string, { icon: LucideIcon; color: string }>;
type TypeName = keyof typeof TYPES;

const tone = (color: string) => ({ "--c": readableColor(color) }) as React.CSSProperties;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * A clock (ms) driven by the scroll: 0 as the visual rises into view, `length` just before
 * its card reaches the place it sticks, so it finishes in full view. Reduced motion gets the finished frame.
 */
function useScrollClock(ref: RefObject<HTMLElement | null>, length: number) {
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const node = ref.current;
    const card = node?.closest<HTMLElement>(".flow-card");
    if (!node || !card) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (prefersReducedMotion()) return setClock(length);
      const rect = node.getBoundingClientRect();
      const end = parseFloat(getComputedStyle(card).top) + rect.top - card.getBoundingClientRect().top + 120;
      const start = Math.max(window.innerHeight - rect.height / 2, end + 200);
      setClock(Math.round((clamp01((start - rect.top) / (start - end)) * length) / TICK) * TICK);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, length]);

  return clock;
}

const played = (t: number, length: number) => ({ "--p": t / length }) as React.CSSProperties;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="flow-label">
      <span>{children}</span>
    </p>
  );
}

// Card one: an item of each type lands in the bin
const CAPTURE_END = 2600;
const DROP_AT = 300;
const DROP_EVERY = 550;
const CAPTURED: { type: TypeName; title: string; from: string }[] = [
  { type: "snippet", title: "useDebounce hook", from: "app" },
  { type: "prompt", title: "Review this for clarity", from: "clipboard" },
  { type: "command", title: "docker system prune -af", from: "clipboard" },
  { type: "link", title: "Postgres locking, explained", from: "browser" },
];

function CaptureVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useScrollClock(ref, CAPTURE_END);
  const saved = CAPTURED.filter((_, i) => t >= DROP_AT + i * DROP_EVERY).length;
  const done = saved === CAPTURED.length;
  const source = saved ? CAPTURED[saved - 1].from : null;

  return (
    <div ref={ref} aria-hidden className="flow-visual" style={played(t, CAPTURE_END)}>
      <Label>Recent [<b key={saved} className="flow-count">{saved}</b>]</Label>
      {CAPTURED.map(({ type, title, from }, i) => {
        const { icon: Icon, color } = TYPES[type];
        const at = DROP_AT + i * DROP_EVERY;
        return (
          <div key={title} className="flow-row" data-shown={i < saved || undefined} data-fresh={(i < saved && t < at + 500) || undefined} style={tone(color)}>
            <span className="flow-row-icon"><Icon className="size-3.5" /></span>
            <span className="flow-row-title">{title}</span>
            <span className="flow-row-type">{type}</span>
            <span className="flow-row-ext">{from}</span>
          </div>
        );
      })}
      <p key={String(done)} className={done ? "flow-foot animate-pop" : "flow-foot"} data-done={done || undefined}>
        {done ? <><Check className="size-3.5" strokeWidth={3} /> {saved} saved, all in one place</> : (
          <span>
            from the <b data-on={source === "app" || undefined}>app</b>, the <b data-on={source === "browser" || undefined}>browser</b>, the <b data-on={source === "clipboard" || undefined}>clipboard</b>
          </span>
        )}
      </p>
    </div>
  );
}

// Card two: collections fill up, each bar split by item type, then the tags arrive
const FILL_AT = 250;
const FILL_EVERY = 300;
const FILL_MS = 550;
const TAG_AT = 1500;
const TAG_EVERY = 150;
/** Once the tags are in, the first three are picked in turn and each lights the collection that carries it */
const PICK_AT = 2500;
const PICK_EVERY = 600;
const STRUCTURE_END = PICK_AT + 3 * PICK_EVERY;
const SHELVES: { name: string; color: string; holds: [TypeName, number][] }[] = [
  { name: "React utils", color: "#60a5fa", holds: [["snippet", 8], ["note", 3], ["link", 3]] },
  { name: "Infra", color: "#fb923c", holds: [["command", 7], ["note", 2], ["link", 2]] },
  { name: "Prompt kit", color: "#a78bfa", holds: [["prompt", 5], ["note", 2]] },
];
const FULLEST = 14;
const TAGS = ["hooks", "docker", "code-review", "sql", "launch"];

function StructureVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useScrollClock(ref, STRUCTURE_END);
  const picked = t >= PICK_AT ? Math.min(SHELVES.length - 1, Math.floor((t - PICK_AT) / PICK_EVERY)) : -1;

  return (
    <div ref={ref} aria-hidden className="flow-visual" style={played(t, STRUCTURE_END)}>
      <Label>Collections [{SHELVES.length}]</Label>
      {SHELVES.map(({ name, color, holds }, i) => {
        const total = holds.reduce((sum, [, n]) => sum + n, 0);
        const progress = clamp01((t - FILL_AT - i * FILL_EVERY) / FILL_MS);
        return (
          <div key={name} className="flow-shelf" data-full={progress === 1 || undefined} data-active={i === picked || undefined} style={tone(color)}>
            <span className="flow-row-icon"><Folder className="size-3.5" /></span>
            <span className="flow-row-title">{name}</span>
            <span className="flow-row-meta tabular-nums">{Math.round(total * progress)} items</span>
            <span className="flow-shelf-bar">
              <span data-filling={(progress > 0 && progress < 1) || undefined} style={{ width: progress > 0 ? `${(total / FULLEST) * 100}%` : 0 }}>
                {holds.map(([type, n]) => (
                  <i key={type} style={{ flexGrow: n, background: readableColor(TYPES[type].color) }} />
                ))}
              </span>
            </span>
          </div>
        );
      })}
      <p className="flow-tags">
        {TAGS.map((tag, i) => (
          <span key={tag} data-shown={t >= TAG_AT + i * TAG_EVERY || undefined} data-picked={i === picked || undefined}>
            <i>#</i>
            {tag}
          </span>
        ))}
      </p>
    </div>
  );
}

// Card three: the query is typed, the results narrow, the first is opened to show what it holds, then copied
const FIND_END = 2800;
const QUERY = "debounce";
const TYPE_AT = 300;
const TYPE_MS = 70;
const RESULTS_AT = TYPE_AT + 2 * TYPE_MS;
const OPEN_AT = 1500;
const COPY_AT = 2200;
const FOUND: { type: TypeName; title: string }[] = [
  { type: "snippet", title: "useDebounce hook" },
  { type: "note", title: "Debounce vs throttle" },
];
const PEEK = ["const [debounced, setDebounced] = useState(value);", "useEffect(() => {", "  const id = setTimeout(() => setDebounced(value), ms);"];

/** `title` with the part that matches what has been typed marked. */
function Matched({ title, typed }: { title: string; typed: string }) {
  const start = typed ? title.toLowerCase().indexOf(typed.toLowerCase()) : -1;
  if (start < 0) return title;
  const end = start + typed.length;
  return (
    <>
      {title.slice(0, start)}
      <mark className="flow-mark">{title.slice(start, end)}</mark>
      {title.slice(end)}
    </>
  );
}

function FindVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const t = useScrollClock(ref, FIND_END);
  const typed = QUERY.slice(0, Math.max(0, Math.floor((t - TYPE_AT) / TYPE_MS)));
  const found = FOUND.filter((_, i) => t >= RESULTS_AT + i * 100).length;
  const picked = t >= OPEN_AT;
  const pressed = t >= 100 && t < TYPE_AT;
  const copied = t >= COPY_AT;

  return (
    <div ref={ref} aria-hidden className="flow-visual" style={played(t, FIND_END)}>
      <div className="flow-search" data-active={typed ? true : undefined}>
        <b>&gt;</b>
        <span>
          {typed || <em>search your bin</em>}
          {picked ? null : <span className="caret" />}
        </span>
        <kbd data-pressed={pressed || undefined}>⌘ K</kbd>
      </div>
      {FOUND.map(({ type, title }, i) => {
        const { icon: Icon, color } = TYPES[type];
        const active = picked && i === 0;
        return (
          <div key={title} className="flow-row" data-shown={i < found || undefined} data-active={active || undefined} data-dim={(picked && i > 0) || undefined} data-copied={(active && copied) || undefined} style={tone(color)}>
            <span className="flow-row-icon"><Icon className="size-3.5" /></span>
            <span className="flow-row-title"><Matched title={title} typed={typed} /></span>
            <span className="flow-row-type">{type}</span>
            {active ? (
              <span key={String(copied)} className="flow-row-key animate-pop">
                {copied ? <Check className="size-3.5" strokeWidth={3} /> : <CornerDownLeft className="size-3.5" />}
              </span>
            ) : null}
          </div>
        );
      })}
      <pre className="flow-peek" data-shown={picked || undefined} data-copied={copied || undefined} style={tone(TYPES.snippet.color)}>
        {PEEK.map((line, i) => (
          <span key={line} style={{ "--n": i } as React.CSSProperties}>{line}</span>
        ))}
      </pre>
      <p key={String(copied)} className={copied ? "flow-foot animate-pop" : "flow-foot"} data-done={copied || undefined}>
        {copied ? <><Check className="size-3.5" strokeWidth={3} /> copied to clipboard</> : found ? `${found} of 181 items match` : "type to search your bin"}
      </p>
    </div>
  );
}

const WORKFLOW = [
  { tone: "var(--brand-lime)", title: "Capture the useful", text: "Code, prompts, commands, notes, links. Save the things worth keeping the moment you meet them, from the app, the browser or your clipboard.", Visual: CaptureVisual },
  { tone: "var(--brand-cyan)", title: "Give it a little structure", text: "Collections and tags turn scattered bits into a library of your own. An item can sit in as many collections as it belongs to.", Visual: StructureVisual },
  { tone: "var(--brand-violet)", title: "Find your next starting point", text: "One search across everything you saved. The right answer, and you are back to what you were building.", Visual: FindVisual },
];

export default function HowItWorks() {
  return (
    <section id="how" className="flow landing-section relative scroll-mt-24 py-24 sm:py-28" style={{ "--accent": "var(--brand-lime)" } as React.CSSProperties}>
      <div className="mx-auto max-w-(--landing-max) px-5 sm:px-8">
        {/* The section heading (SectionHeading in ui.tsx), drawn without the scroll reveal so it can never stay hidden */}
        <div className="landing-section-heading max-w-2xl">
          <p className="inline-flex items-center gap-2.5 font-mono text-xs text-[var(--accent)]">
            <span className="dark:opacity-60">00</span>
            <span className="h-3 w-px bg-current opacity-30" />
            how it works
          </p>
          <h2 className="mt-6 text-balance">
            <span className="ink">
              Save it once. <Accent>Find it for good.</Accent>
            </span>
          </h2>
          <p className="text-desc mt-5 text-pretty">Capture what is worth keeping, give it a little structure, and one search brings it back.</p>
        </div>
        {/* Three cards that stick and stack, each playing as it arrives and shrinking back as the next covers it */}
        <ol className="flow-stack">
          {WORKFLOW.map(({ tone, title, text, Visual }, i) => (
            <li key={title} className="flow-card" style={{ "--i": i, "--tone": tone } as React.CSSProperties}>
              <div className="flow-card-body">
                <div>
                  <span aria-hidden className="flow-number">0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <Visual />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
