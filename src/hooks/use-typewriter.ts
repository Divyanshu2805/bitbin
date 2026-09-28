"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * Types each phrase out, holds it, deletes it and moves to the next (the top
 * bar's search prompt). Returns the visible text and the full phrase. With
 * reduced motion it just shows the first phrase.
 */
export function useTypewriter(phrases: readonly string[], { enabled = true, hold = 1800 } = {}) {
  const [state, setState] = useState({ index: 0, length: 0, deleting: false });
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  );
  const active = enabled && phrases.length > 0 && !reducedMotion;
  const index = phrases.length ? state.index % phrases.length : 0;

  useEffect(() => {
    if (!active) return;
    const full = phrases[index];
    let delay = state.deleting ? 22 : 48;
    if (!state.deleting && state.length >= full.length) delay = hold;
    if (state.deleting && state.length === 0) delay = 350;
    const id = window.setTimeout(() => {
      setState((current) => {
        const text = phrases[current.index % phrases.length];
        if (!current.deleting && current.length < text.length) return { ...current, length: current.length + 1 };
        if (!current.deleting) return { ...current, deleting: true };
        if (current.length > 0) return { ...current, length: current.length - 1 };
        return { index: (current.index + 1) % phrases.length, length: 0, deleting: false };
      });
    }, delay);
    return () => window.clearTimeout(id);
  }, [active, phrases, index, state, hold]);

  if (!phrases.length) return { text: "", full: "" };
  if (!active) return { text: phrases[0], full: phrases[0] };
  return { text: phrases[index].slice(0, state.length), full: phrases[index] };
}
