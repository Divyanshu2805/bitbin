"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-motion";

const LEAD = "Every snippet. ";
const ACCENT = "One bin.";
const TEXT = LEAD + ACCENT;

/**
 * The auth panel's tagline, typed out once with a blinking caret. An invisible
 * copy of the full line sets the box, so the centred block never shifts while
 * the visible copy types left to right on top of it.
 */
export function AuthTagline() {
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (length >= TEXT.length) return;
    // Reduced motion: show the whole line at once
    const reduced = prefersReducedMotion();
    const id = window.setTimeout(
      () => setLength((n) => (reduced ? TEXT.length : n + 1)),
      reduced ? 0 : length === 0 ? 400 : 55 + Math.random() * 45
    );
    return () => window.clearTimeout(id);
  }, [length]);

  const typed = TEXT.slice(0, length);

  return (
    <h2 aria-label={TEXT} className="grid text-3xl font-bold leading-[1.15]">
      <span aria-hidden className="invisible col-start-1 row-start-1 pr-[0.6ch]">
        {TEXT}
      </span>
      <span aria-hidden className="col-start-1 row-start-1 text-left">
        {typed.slice(0, LEAD.length)}
        {length > LEAD.length && (
          <span className="text-brand-gradient">{typed.slice(LEAD.length)}</span>
        )}
        <span className="caret" />
      </span>
    </h2>
  );
}
