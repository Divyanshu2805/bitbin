"use client";

import Lenis from "lenis";

// Momentum scrolling for the homepage (Lenis): the wheel glides to a stop
// instead of jumping in steps, and in-page links (#faq, …) glide there too,
// honouring each section's scroll-margin. Only the homepage runs it; everywhere
// else scrolls natively. Skipped under reduced motion.
// Styles: globals.css (html.lenis).

let lenis: Lenis | null = null;

/** Starts smooth scrolling; returns the cleanup. */
export function startSmoothScroll() {
  if (lenis || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};
  const instance = new Lenis({
    autoRaf: true,
    lerp: 0.09,
    wheelMultiplier: 0.9,
    anchors: true,
    // Inner scrollers (menus, code blocks) keep their own native scroll
    allowNestedScroll: true,
  });
  lenis = instance;
  return () => {
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

/** Scrolls to the top, gliding when smooth scrolling is on. */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0);
  else {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }
}
