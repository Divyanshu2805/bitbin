"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, usePagePaused } from "@/hooks/use-motion";

/** Swaps through `words` every `ms`, each one rising into place. */
export function CycleWord({ words, ms = 1800, className }: { words: readonly string[]; ms?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  const paused = usePagePaused();

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), ms);
    return () => window.clearInterval(id);
  }, [words.length, ms, paused]);

  return (
    <span className={className}>
      <span key={index} className="inline-block animate-[fade-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
        {words[index]}
      </span>
    </span>
  );
}
