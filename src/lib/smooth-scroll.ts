"use client";

import Lenis from "lenis";

// Momentum scrolling for the homepage (Lenis): the wheel glides to a stop
// instead of jumping in steps, and in-page links (#faq, …) glide there too,
// honouring each section's scroll-margin. Only the homepage runs it; everywhere
// else scrolls natively. Skipped under reduced motion.
// While the page is moving, <html> carries `data-scrolling`, and the looping
// demos hold still (usePagePaused), so nothing competes with the scroll for a frame.
// Styles: globals.css (html.lenis).

const SCROLLING_ATTR = "data-scrolling";
// How long after the last scroll event the page counts as still
const SETTLE_MS = 140;

let lenis: Lenis | null = null;

/** Starts smooth scrolling; returns the cleanup. */
export function startSmoothScroll() {
  if (lenis || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};
  const instance = new Lenis({
    autoRaf: true,
    lerp: 0.1,
    wheelMultiplier: 1,
    anchors: true,
    // No `allowNestedScroll`: it walks the DOM on every wheel event, and it hands
    // the wheel back to the browser over anything scrollable (a code block, a row
    // of tabs), so the page moved in native steps there and glided everywhere
    // else. A scroller that needs its own wheel opts out with `data-lenis-prevent`.
  });
  lenis = instance;

  const root = document.documentElement;
  let settle = 0;
  const onScroll = () => {
    if (!settle) root.setAttribute(SCROLLING_ATTR, "");
    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      settle = 0;
      root.removeAttribute(SCROLLING_ATTR);
    }, SETTLE_MS);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.clearTimeout(settle);
    root.removeAttribute(SCROLLING_ATTR);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

/**
 * A refresh of the homepage starts at the hero, not where the browser left it (or at the
 * #section in the address); returns the cleanup, which hands restoration back for other pages.
 */
export function startAtTopOnReload() {
  const previous = history.scrollRestoration;
  history.scrollRestoration = "manual";
  const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === "reload") {
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    window.scrollTo(0, 0);
  }
  return () => {
    history.scrollRestoration = previous;
  };
}

/** Scrolls the page to `top`, gliding when smooth scrolling is on. */
export function scrollToY(top: number) {
  if (lenis) lenis.scrollTo(top);
  else {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }
}

/** Scrolls to the top, gliding when smooth scrolling is on. */
export function scrollToTop() {
  scrollToY(0);
}
