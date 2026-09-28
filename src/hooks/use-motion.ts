"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

// Small motion hooks shared by the homepage, the auth screens and the app.
// Every one of them backs off when the visitor prefers reduced motion.

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function finePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Reveals every `[data-reveal]` element under the returned ref the first time it
 * scrolls into view. The root gets `.reveal-ready` only once JS runs, so content
 * is never hidden for visitors without it. Items may set `--d` to delay.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (typeof IntersectionObserver === "undefined") return;
    root.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return ref;
}

/** True while the element is on screen. */
export function useInView(ref: RefObject<Element | null>, { once = false, threshold = 0.2 } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, once, threshold]);
  return inView;
}

const PAUSE_ATTR = "data-features-open";

function subscribePaused(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [PAUSE_ATTR] });
  return () => observer.disconnect();
}

/**
 * True while the landing navbar's Features panel covers the page. Looping demos
 * hold their clocks then, so the blurred page behind the panel stops repainting.
 */
export function usePagePaused() {
  return useSyncExternalStore(
    subscribePaused,
    () => document.documentElement.hasAttribute(PAUSE_ATTR),
    () => false
  );
}

/** Counts from 0 to `target` with an ease-out once `active` turns true. */
export function useCountUp(target: number, active: boolean, duration = 1300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    if (prefersReducedMotion()) {
      frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);
  return value;
}

/** Whether the page has scrolled past `threshold`. */
export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);
  return scrolled;
}

/** Writes the page's scroll progress (0–1) to `--p` on the returned element. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ref.current?.style.setProperty("--p", (max > 0 ? window.scrollY / max : 0).toFixed(4));
      ref.current?.toggleAttribute("data-scrolled", window.scrollY > 700);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

/** The id of the section crossing the middle of the viewport. */
export function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ids.forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

/**
 * One pointer listener for everything under `ref`: `[data-spotlight]` elements get
 * --mx/--my so a light follows the pointer, and `[data-tilt]` elements get a gentle
 * 3D tilt (mouse only, and only with motion allowed).
 */
export function usePointerEffects(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const tiltAllowed = finePointer() && !prefersReducedMotion();
    let tilt: HTMLElement | null = null;

    const settle = () => {
      tilt?.style.setProperty("--rx", "0deg");
      tilt?.style.setProperty("--ry", "0deg");
    };

    const onMove = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const spot = event.target.closest<HTMLElement>("[data-spotlight]");
      if (spot) {
        const rect = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        spot.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }
      if (!tiltAllowed) return;
      const next = event.target.closest<HTMLElement>("[data-tilt]");
      if (next !== tilt) {
        settle();
        tilt = next;
      }
      if (tilt) {
        const rect = tilt.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        tilt.style.setProperty("--ry", `${x * 4}deg`);
        tilt.style.setProperty("--rx", `${y * -4}deg`);
      }
    };
    const onLeave = () => {
      settle();
      tilt = null;
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [ref]);
}

/**
 * Types each phrase out, holds it, deletes it, then moves on to the next.
 * Returns the visible text and the index of the current phrase.
 */
export function useTypewriter(phrases: readonly string[], { typeMs = 45, deleteMs = 22, holdMs = 1700 } = {}) {
  const [state, setState] = useState({ index: 0, length: 0, deleting: false });
  const paused = usePagePaused();

  useEffect(() => {
    if (paused) return;
    const phrase = phrases[state.index % phrases.length];
    if (prefersReducedMotion()) {
      // No typing: show each phrase whole, then swap it for the next.
      const full = state.length >= phrase.length;
      const id = window.setTimeout(
        () =>
          setState((s) =>
            full
              ? { index: (s.index + 1) % phrases.length, length: 0, deleting: false }
              : { ...s, length: phrase.length }
          ),
        full ? holdMs * 2 : 0
      );
      return () => window.clearTimeout(id);
    }
    let delay: number;
    let next: typeof state;
    if (!state.deleting && state.length < phrase.length) {
      delay = typeMs + Math.random() * 40;
      next = { ...state, length: state.length + 1 };
    } else if (!state.deleting) {
      delay = holdMs;
      next = { ...state, deleting: true };
    } else if (state.length > 0) {
      delay = deleteMs;
      next = { ...state, length: state.length - 1 };
    } else {
      delay = 300;
      next = { index: (state.index + 1) % phrases.length, length: 0, deleting: false };
    }
    const id = window.setTimeout(() => setState(next), delay);
    return () => window.clearTimeout(id);
  }, [state, phrases, typeMs, deleteMs, holdMs, paused]);

  const phrase = phrases[state.index % phrases.length];
  return { text: phrase.slice(0, state.length), index: state.index % phrases.length, typing: !state.deleting };
}
