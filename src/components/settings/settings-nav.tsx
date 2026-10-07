"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "editor", label: "editor" },
  { id: "billing", label: "billing" },
  { id: "extension", label: "extension" },
  { id: "desktop", label: "desktop" },
  { id: "tags", label: "tags" },
  { id: "data", label: "data" },
  { id: "account", label: "account" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** The nearest ancestor that scrolls (the app's <main>), or the window's scroller. */
function scrollParent(node: HTMLElement | null): HTMLElement {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return document.scrollingElement as HTMLElement;
}

/**
 * Which section is being read: the last one whose top has passed a reading line.
 * The line sits a third of the way down the scroller, then over the last
 * screenful of scrolling slides down to the bottom edge, so short sections at
 * the end (data, account) each get their turn instead of being skipped.
 */
function useActiveSection(navRef: React.RefObject<HTMLElement | null>) {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);
  // After a click, hold that section's highlight (even if the page can't scroll
  // it to the top) until the reader scrolls on their own
  const locked = useRef(false);

  useEffect(() => {
    const scroller = scrollParent(navRef.current);
    const target = scroller === document.scrollingElement ? window : scroller;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (locked.current) return;
      const top = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
      const height = scroller.clientHeight;
      const remaining = scroller.scrollHeight - scroller.scrollTop - height;
      // 0 until the last screenful, then 1 at the very bottom
      const end = Math.min(1, Math.max(0, 1 - remaining / height));
      const line = top + height / 3 + ((height * 2) / 3 - 8) * end;
      let next: SectionId = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) next = id;
      }
      setActive(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Scrolling by hand (not the smooth scroll a click started) releases a clicked highlight
    const release = () => {
      locked.current = false;
    };
    const releaseOnKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) release();
    };

    update();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    // Dragging the scrollbar; a click on a section re-locks it, since its click follows this
    window.addEventListener("pointerdown", release);
    window.addEventListener("keydown", releaseOnKey);
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", releaseOnKey);
      cancelAnimationFrame(frame);
    };
  }, [navRef]);

  const jumpTo = (id: SectionId) => {
    locked.current = true;
    setActive(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return { active, jumpTo };
}

/**
 * The settings index: a sticky list of sections. A lime bar and a soft highlight
 * glide to the one on screen; clicking one scrolls smoothly to it.
 */
export default function SettingsNav() {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Partial<Record<SectionId, HTMLAnchorElement | null>>>({});
  const { active, jumpTo } = useActiveSection(navRef);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  // Measure the active link so the bar and highlight can slide to it
  useLayoutEffect(() => {
    const el = itemRefs.current[active];
    if (el) setMarker({ top: el.offsetTop, height: el.offsetHeight });
  }, [active]);

  return (
    <nav ref={navRef} aria-label="Settings sections" className="hidden self-start lg:sticky lg:top-2 lg:block">
      <p className="mb-2 px-3 font-mono text-[11px] text-muted-foreground">
        <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>sections
      </p>
      <ul className="relative space-y-0.5 border-l border-border">
        {marker && (
          <>
            {/* The highlight behind the active link */}
            <span
              aria-hidden
              className="absolute right-0 left-0 rounded-r-md bg-lime/10 transition-[top,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ top: marker.top, height: marker.height }}
            />
            {/* The bar riding the rail */}
            <span
              aria-hidden
              className="absolute -left-px w-0.5 rounded-full bg-lime shadow-[0_0_10px_color-mix(in_srgb,var(--brand-lime)_60%,transparent)] transition-[top,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ top: marker.top, height: marker.height }}
            />
          </>
        )}
        {SECTIONS.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <a
                ref={(el) => {
                  itemRefs.current[id] = el;
                }}
                href={`#${id}`}
                onClick={(event) => {
                  event.preventDefault();
                  jumpTo(id);
                }}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative flex items-center rounded-r-md py-1.5 pr-3 pl-3 font-mono text-[13px] outline-none transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-lime/50",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {/* The caret slides in on the active link, and peeks in on hover */}
                <span
                  aria-hidden
                  className={cn(
                    "overflow-hidden text-lime transition-[width,opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isActive
                      ? "w-3 translate-x-0 opacity-100"
                      : "w-0 -translate-x-1 opacity-0 group-hover:w-3 group-hover:translate-x-0 group-hover:opacity-50"
                  )}
                >
                  ›
                </span>
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
