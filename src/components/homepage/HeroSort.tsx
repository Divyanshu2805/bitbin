"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Code, Image as ImageIcon, Link as LinkIcon, Search, Sparkles, StickyNote, Terminal, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { readableColor } from "@/lib/utils/color";
import { scrollToY } from "@/lib/smooth-scroll";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { SOURCES, type Source } from "./sources";

// The hero's scene: your knowledge without BitBin, then with it, told by the scroll.
// The hero is pinned for a stretch of the page (landing.css), and how far through it you are
// (`p`, 0 to 1) is the story's clock:
// Without (the top of the page): twelve things you saved ride a ring around the headline, each
//   a card led by the logo of the app it is stuck in. The ring is wider than the screen, so cards
//   come and go at its edges. It turns by itself, quicker under the pointer; the scroll carries it
//   along, and a wheel-up at the very top spins it backwards. One card at a time fades to a "?".
//   The bin waits at the foot of the screen.
// Scrolling: the words lift away, the bin rises to the middle of the ring, and the cards spiral
//   in one after another, each into the panel for its type. A card spins a full turn on the way,
//   shrinking to its slot, and changes as it goes: the scrap from another app melts into a BitBin
//   item card, with its type.
// With (the end of the pin): everything is in the bin, a search is typed and the match is
//   lifted out of its row. Scrolling back up plays it all in reverse.
// The switch in the bin's footer says which state is showing, and works: a click scrolls to the other.
// Every frame goes straight to the DOM, and only to what moved: translate / rotate / scale on a card and
// the opacity of its two faces, translate on the bin, opacity and translate on the words. No custom
// properties (one on the section would restyle the whole hero), so React only re-renders when a card lands or leaves.
// Reduced motion: nothing is pinned; the words, then the bin with everything in it.

const TICK = 100;
const TYPE_MS = 110;
const QUERY = "debounce";
// After the last card lands: when the search starts, and when its match is lifted
const SEARCH_AT = 900;
const FOUND_AT = SEARCH_AT + QUERY.length * TYPE_MS + 200;
// Ticks each muttered thought (and each forgotten tile) lasts
const THOUGHT_TICKS = 17;

// The page's navbar, which the hero is pinned under
const NAV = 84;
// The story, in fractions of the pinned scroll: the bin has risen by RISE_END, the cards fly in
// between FLY_START and FLY_END (each a little after the one before), and the rest is held.
const RISE_END = 0.3;
const FLY_START = 0.2;
const FLY_END = 0.9;
const FLY_STAGGER = 0.045;
const LAP_S = 70; // seconds a lap of the ring takes, left alone
const HOVER_RATE = 3.5; // how many times quicker under the pointer
const SCROLL_PULL = 0.55; // pixels along the ring per pixel the page scrolls
const WHEEL_KICK = 0.0016; // laps per second from each wheel pixel at the top of the page
const SPIN_MAX = 0.6;
// Each tile's place on the ring (i * 5 mod 12), so neighbours in the bin are not neighbours on it
const PLACE = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

const GROUPS: { name: string; type: string; icon: LucideIcon; color: string }[] = [
  { name: "Snippets", type: "snippet", icon: Code, color: "#60a5fa" },
  { name: "Commands", type: "command", icon: Terminal, color: "#fb923c" },
  { name: "Prompts", type: "prompt", icon: Sparkles, color: "#a78bfa" },
  { name: "Notes", type: "note", icon: StickyNote, color: "#fde047" },
  { name: "Images", type: "image", icon: ImageIcon, color: "#f472b6" },
  { name: "Links", type: "link", icon: LinkIcon, color: "#34d399" },
];

/** `tilt` is how a card hangs on the ring (degrees); two of each type, in the order they sit in their panel. */
const ITEMS: { title: string; group: string; source: Source; tilt: number }[] = [
  { title: "useDebounce.ts", group: "Snippets", source: "vscode", tilt: -6 },
  { title: "zod helpers", group: "Snippets", source: "github", tilt: 4 },
  { title: "docker prune", group: "Commands", source: "terminal", tilt: -5 },
  { title: "git rebase", group: "Commands", source: "slack", tilt: 6 },
  { title: "Code review", group: "Prompts", source: "notion", tilt: 5 },
  { title: "Commit message", group: "Prompts", source: "chat", tilt: -4 },
  { title: "Standup notes", group: "Notes", source: "sticky", tilt: 6 },
  { title: "Deploy checklist", group: "Notes", source: "textfile", tilt: -5 },
  { title: "Arch diagram", group: "Images", source: "screenshots", tilt: 4 },
  { title: "Login mock", group: "Images", source: "downloads", tilt: -6 },
  { title: "React reference", group: "Links", source: "browser", tilt: -4 },
  { title: "Tailwind docs", group: "Links", source: "bookmark", tilt: 6 },
];
const ALL = (1 << ITEMS.length) - 1;

// The bin's world, in cqw of the stage (100 wide, `h` tall). Panels sit three to a row on a wide
// screen and two on a narrow one, each holding its two tiles side by side. `k` scales the title bar
// and footer, so they keep their size when the bin is wider.
type Layout = { k: number; h: number; tw: number; th: number; pw: number; ph: number; panels: [number, number][]; slots: [number, number][] };
function layout(cols: number): Layout {
  const k = cols === 3 ? 0.7 : 1;
  const gap = 3 * k;
  const pad = 1.5 * k;
  const head = 6.3 * k;
  const bar = 8 * k;
  const foot = 9.5 * k;
  const pw = (100 - gap * (cols + 1)) / cols;
  const tw = (pw - pad * 3) / 2;
  const th = tw / 1.3;
  const ph = head + th + pad;
  const rows = Math.ceil(GROUPS.length / cols);
  const panels = GROUPS.map((_, g): [number, number] => [gap + (g % cols) * (pw + gap), bar + gap + Math.floor(g / cols) * (ph + gap)]);
  const slots = ITEMS.map((item, i): [number, number] => {
    const [x, y] = panels[GROUPS.findIndex((g) => g.name === item.group)];
    const n = ITEMS.slice(0, i).filter((other) => other.group === item.group).length;
    return [x + pad + n * (tw + pad), y + head];
  });
  return { k, h: bar + gap + rows * ph + (rows - 1) * gap + gap * 1.6 + foot, tw, th, pw, ph, panels, slots };
}
const WIDE = layout(3);
const NARROW = layout(2);
const WIDE_QUERY = "(min-width: 768px)";
const subscribeWide = (change: () => void) => {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

// Without BitBin: what you'd be thinking while you look for one of them
const THOUGHTS = ["which tab was that in?", "did I even save it?", "Slack… or was it Notion?", "I wrote this before. somewhere.", "it was right here last week"];
const WITH = ["12 items · 6 types · one bin", "one search · the one you meant"];

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

export default function HeroSort() {
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  // Where the pinned stretch starts and how long it is, for the switch
  const geo = useRef({ start: 0, span: 0 });
  // What the frame loop needs to know about this render
  const live = useRef({ running: false });
  const inView = useInView(ref, { threshold: 0 });
  const paused = usePagePaused();
  // Which tiles are in the bin, one bit each
  const [kept, setKept] = useState(0);
  const [clock, setClock] = useState(0);
  const [beat, setBeat] = useState(0);
  const [still, setStill] = useState(false);
  // Until someone has used the switch, it pulses to say it can be
  const [tried, setTried] = useState(false);
  // Three panels to a row on a wide screen, two on a narrow one
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => true);
  const L = wide ? WIDE : NARROW;

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const sorted = kept === ALL;

  // The search waits for the last card; it starts over whenever one leaves the bin
  useEffect(() => {
    if (!inView || still || paused) return;
    const id = window.setInterval(() => {
      setBeat((v) => v + 1);
      setClock((v) => (sorted ? Math.min(v + TICK, FOUND_AT) : 0));
    }, TICK);
    return () => window.clearInterval(id);
  }, [inView, still, paused, sorted]);

  const typed = sorted ? QUERY.slice(0, Math.max(0, Math.floor((clock - SEARCH_AT) / TYPE_MS))) : "";
  const found = sorted && clock >= FOUND_AT;
  const thought = Math.floor(beat / THOUGHT_TICKS);
  // The tile that has slipped your mind just now
  const forgotten = kept || still ? -1 : thought % ITEMS.length;
  const caption = sorted ? WITH[found ? 1 : 0] : THOUGHTS[thought % THOUGHTS.length];

  useEffect(() => {
    live.current = { running: inView };
  }, [inView]);

  // One loop places everything from the scroll position and the ring's turn.
  useEffect(() => {
    const L = wide ? WIDE : NARROW;
    const scene = ref.current;
    const stage = stageRef.current;
    const section = scene?.closest<HTMLElement>("section");
    if (!scene || !stage || !section) return;
    const root = document.documentElement;
    const reduced = prefersReducedMotion();
    const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

    let unit = 1;
    let stageW = 0;
    let stageH = 0;
    let radius = 0;
    let ringScale = 1;
    let rest = 0; // how far below the middle of the screen the bin waits
    // Read on a resize, not every frame: none of it changes as the page scrolls
    const measure = () => {
      const width = scene.clientWidth;
      const height = scene.clientHeight;
      stageW = stage.offsetWidth;
      if (!stageW || !height) return;
      stageH = stageW * (L.h / 100);
      unit = stageW / 100;
      // Wider than the screen is tall, so the ring's top and bottom are off it; on a phone, its sides
      radius = Math.min(Math.max(width * 0.37, height * 0.46), 660);      // A card on the ring is bigger than one in the bin: its logo is the picture
      ringScale = Math.max(112, Math.min(212, L.tw * unit * 1.4)) / (L.tw * unit);
      rest = height / 2 + stageH / 2 - Math.min(NAV, height * 0.1);
      const start = section.getBoundingClientRect().top + window.scrollY - NAV;
      geo.current = { start, span: Math.max(1, section.offsetHeight - height) };
    };

    const copy = section.querySelector<HTMLElement>(".landing-hero-copy");
    const backdrop = section.querySelector<HTMLElement>(".hero-backdrop");
    const faces = chips.current.map((el) => ({
      loose: el?.querySelector<HTMLElement>(".sort-face-loose"),
      kept: el?.querySelector<HTMLElement>(".sort-face-kept"),
    }));

    let turn = 0;
    let rate = 1;
    let spin = 0;
    let hover = false;
    let mask = -1;
    let deep = false;
    // What was last written, so a frame that changes nothing restyles nothing. Each value goes on the
    // one element it moves: a custom property on the section or the bin would restyle everything inside it
    let shownLift = NaN;
    let shownP = "";
    const shown = ITEMS.map(() => ({ at: "", rotate: "", scale: "", t: "", kept: false }));

    /** Places the bin and every card for `p`, how far through the pinned stretch the page is. */
    const place = (p: number) => {
      const lift = reduced ? 0 : rest * (1 - smooth(clamp(p / RISE_END)));
      if (!reduced) {
        const px = Math.round(lift * 10) / 10;
        if (px !== shownLift) {
          shownLift = px;
          stage.style.translate = `-50% calc(-50% + ${px}px)`;
          // Its own layer only while it rises, so the dots and the glow behind it aren't repainted on the way
          stage.style.willChange = px > 0 && px < Math.round(rest * 10) / 10 ? "translate" : "";
        }
        // The words and the warm light are gone a fifth of the way in
        const fixed = Math.min(p, 0.21).toFixed(4);
        if (fixed !== shownP) {
          shownP = fixed;
          const q = Number(fixed);
          if (copy) {
            copy.style.opacity = Math.max(0, 1 - q * 6.5).toFixed(3);
            copy.style.translate = `0 ${(q * -40).toFixed(2)}svh`;
          }
          if (backdrop) backdrop.style.opacity = Math.max(0, 1 - q * 5).toFixed(3);
        }
      }
      if (deep !== (!reduced && p > 0.2)) {
        deep = !deep;
        section.toggleAttribute("data-deep", deep);
      }
      const flight = clamp((p - FLY_START) / (FLY_END - FLY_START)) * (1 + (ITEMS.length - 1) * FLY_STAGGER);
      let next = 0;
      ITEMS.forEach((item, i) => {
        const el = chips.current[i];
        if (!el) return;
        const e = smooth(clamp(flight - PLACE[i] * FLY_STAGGER));
        // From the middle of the screen: where the card is on the ring, and where its slot is in the bin
        const angle = (turn + PLACE[i] / ITEMS.length) * Math.PI * 2;
        const ringX = Math.cos(angle) * radius;
        const ringY = Math.sin(angle) * radius;
        const slot = L.slots[i];
        const slotX = (slot[0] + L.tw / 2 - 50) * unit;
        const slotY = (slot[1] + L.th / 2 - L.h / 2) * unit + lift;
        const x = ringX + (slotX - ringX) * e;
        const y = ringY + (slotY - ringY) * e;
        // It spins a full turn on the way (alternate cards each way), shrinking to its slot, and
        // its app's face melts into the item card through the middle of the flight
        const turned = clamp((e - 0.3) / 0.4);
        const size = ringScale + (1 - ringScale) * e;
        const spinFrom = (i % 2 ? 360 : -360) + item.tilt;
        const was = shown[i];
        const kept = turned > 0.5;
        if (kept) next |= 1 << i;
        if (kept !== was.kept) {
          was.kept = kept;
          el.toggleAttribute("data-kept", kept);
        }
        const t = turned.toFixed(3);
        if (t !== was.t) {
          was.t = t;
          const { loose, kept: card } = faces[i];
          if (loose) loose.style.opacity = (1 - turned).toFixed(3);
          if (card) card.style.opacity = t;
        }
        // Whole pixels once it rests in the bin, so its small type is sharp; fractions while it moves, so a slow ring doesn't step
        const left = x + stageW / 2 - (L.tw * unit) / 2;
        const top = y - lift + stageH / 2 - (L.th * unit) / 2;
        const at = e < 1 ? `${left.toFixed(2)}px ${top.toFixed(2)}px` : `${Math.round(left)}px ${Math.round(top)}px`;
        if (at !== was.at) el.style.translate = was.at = at;
        const rotate = e < 1 ? `${(spinFrom * (1 - e)).toFixed(2)}deg` : "";
        if (rotate !== was.rotate) el.style.rotate = was.rotate = rotate;
        const scale = e < 1 ? size.toFixed(3) : "";
        if (scale !== was.scale) el.style.scale = was.scale = scale;
      });
      if (next !== mask) {
        mask = next;
        setKept(next);
      }
    };

    const progress = () => clamp((window.scrollY - geo.current.start) / geo.current.span);

    measure();
    place(reduced ? 1 : progress());
    stage.setAttribute("data-ready", "");
    const settled = window.setTimeout(measure, 1200);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            measure();
            if (reduced) place(1);
          });
    observer?.observe(scene);
    observer?.observe(section);
    // Reduced motion: everything is in the bin, and nothing follows the scroll
    if (reduced) {
      return () => {
        window.clearTimeout(settled);
        observer?.disconnect();
      };
    }

    let frame = 0;
    let last = 0;
    let lastScroll = window.scrollY;
    const step = (time: number) => {
      frame = requestAnimationFrame(step);
      const dt = last ? Math.min(time - last, 50) / 1000 : 0;
      last = time;
      const scrolled = window.scrollY - lastScroll;
      lastScroll += scrolled;
      if (!live.current.running) return;
      const p = progress();
      // The navbar's pause control stops the ring turning; the scroll still places everything
      if (!root.hasAttribute("data-motion-paused")) {
        rate += ((hover && p < FLY_START ? HOVER_RATE : 1) - rate) * Math.min(1, dt * 4);
        spin *= Math.exp(-3.5 * dt);
        turn += (rate / LAP_S + spin) * dt;
      }
      turn += (scrolled * SCROLL_PULL) / (2 * Math.PI * radius);
      place(p);
    };
    frame = requestAnimationFrame(step);

    const onMove = (event: PointerEvent) => {
      const rect = scene.getBoundingClientRect();
      hover = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    };
    const onLeave = () => {
      hover = false;
    };
    // The page can't scroll above its top, so a wheel-up there turns the ring back instead
    const onWheel = (event: WheelEvent) => {
      if (window.scrollY > 0 || event.deltaY >= 0 || !live.current.running) return;
      const pixels = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
      spin = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, spin + pixels * WHEEL_KICK));
    };
    if (fine) {
      window.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave);
    }
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settled);
      observer?.disconnect();
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", measure);
    };
  }, [wide]);

  // The switch scrolls to the other end of the story
  const choose = () => {
    setTried(true);
    if (still) return;
    const { start, span } = geo.current;
    scrollToY(sorted ? start : start + span * 0.94);
  };
  const landed = (i: number) => Boolean(kept & (1 << i));

  return (
    <div ref={ref} className="hero-scene" style={{ "--ar": L.h / 100, "--k": L.k, "--tw": L.tw, "--th": L.th } as React.CSSProperties}>
      <div ref={stageRef} className={cn("sort-stage", sorted && "is-sorted")}>
        <p className="sr-only">
          Without BitBin, twelve things saved across VS Code, GitHub, Slack, Notion, an AI chat, a terminal, sticky notes, text files, screenshots, downloads, a browser tab and your bookmarks drift apart
          and are forgotten. With BitBin, they are sorted by type in one place, and one is found with a search.
        </p>
        {/* The bin: a title bar with the search, and a panel per type */}
        <div className="sort-bin">
          <div aria-hidden className="sort-bar">
            <span className="sort-brand">
              <LogoMark />
              <span className="font-display font-bold">
                Bit<span className="logo-word">Bin</span>
              </span>
            </span>
            <span className={cn("sort-search", typed && "is-active")}>
              <Search />
              <span>
                {typed || (sorted ? "" : "search your bin")}
                {sorted && clock >= SEARCH_AT - 400 && !found ? <span className="caret" /> : null}
              </span>
              {found ? <em>1 result</em> : <kbd>⌘K</kbd>}
            </span>
          </div>
          {/* The footer: the switch between the two states, and a line on how each one feels */}
          <div className="sort-foot">
            {/* BitBin, off and on: one switch, its knob carrying the logo */}
            <button type="button" role="switch" aria-checked={sorted} aria-label="BitBin" onClick={choose} className={cn("sort-switch", !tried && "is-new")}>
              <span aria-hidden className="sort-track">
                <span className="sort-knob">
                  <LogoMark animated={false} />
                </span>
              </span>
              <span aria-hidden key={String(sorted)} className="sort-state">
                {sorted ? "With BitBin" : "Without BitBin"}
              </span>
            </button>
            {tried ? null : (
              <span aria-hidden className="sort-hint">
                flip the switch
              </span>
            )}
            <p key={caption} aria-hidden className={cn("sort-caption", sorted && "is-in")}>
              {caption}
            </p>
          </div>
        </div>
        {GROUPS.map((group, g) => {
          const Icon = group.icon;
          const count = ITEMS.filter((item, i) => item.group === group.name && landed(i)).length;
          return (
            <div
              key={group.name}
              aria-hidden
              className={cn("sort-panel", count > 0 && "is-filled")}
              style={{ left: `${L.panels[g][0]}cqw`, top: `${L.panels[g][1]}cqw`, width: `${L.pw}cqw`, height: `${L.ph}cqw`, "--tile": readableColor(group.color) } as React.CSSProperties}
            >
              <p style={{ color: readableColor(group.color) }}>
                <Icon />
                {group.name}
                <span key={count} className={cn(count > 0 && "animate-pop")}>
                  {count}
                </span>
              </p>
            </div>
          );
        })}
        {ITEMS.map((item, i) => (
          <span key={item.title} aria-hidden className={cn("sort-slot", landed(i) && "is-filled")} style={{ left: `${L.slots[i][0]}cqw`, top: `${L.slots[i][1]}cqw` }} />
        ))}

        {ITEMS.map((item, i) => {
          const group = GROUPS.find((g) => g.name === item.group)!;
          const TypeIcon = group.icon;
          const source = SOURCES[item.source];
          const match = found && i === 0;
          return (
            // Placed by the frame loop; until it runs, a card sits in its slot, unseen
            <div
              key={item.title}
              ref={(el) => {
                chips.current[i] = el;
              }}
              aria-hidden
              className={cn("sort-chip", match && "is-match")}
              style={{ "--x": L.slots[i][0], "--y": L.slots[i][1] } as React.CSSProperties}
            >
              <div
                className={cn("sort-tile", forgotten === i && "is-forgotten", match && "is-match", found && !match && "is-dim")}
                style={{ "--tile": readableColor(group.color), "--src": readableColor(source.color), borderColor: match ? readableColor(group.color) : undefined } as React.CSSProperties}
              >
                {/* On the ring: the app it is stuck in, its logo as the picture, and a name */}
                <span className="sort-face sort-face-loose">
                  <span className="sort-mark" dangerouslySetInnerHTML={{ __html: source.svg }} />
                  <span className="sort-art" dangerouslySetInnerHTML={{ __html: source.svg }} />
                  <span className="sort-title">{item.title}</span>
                </span>
                {/* In the bin: an item card, with its type */}
                <span className="sort-face sort-face-kept">
                  <span className="sort-from">
                    <span className="sort-type-icon"><TypeIcon /></span>
                    <span className="sort-type">{group.type}</span>
                  </span>
                  <span className="sort-title">{item.title}</span>
                </span>
                <span className="sort-q">?</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
