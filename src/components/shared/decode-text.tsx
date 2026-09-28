"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/hooks/use-motion";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789{}[]<>/=+*#$%&";

interface DecodeTextProps {
  text: string;
  className?: string;
  /** ms before the decode starts */
  delay?: number;
  /** total ms for the whole string to settle */
  duration?: number;
  /** start only when scrolled into view */
  onView?: boolean;
}

/**
 * Text that arrives like it's being decoded: each character cycles through
 * random glyphs before locking into place, left to right. The server renders the
 * final text, and the effect writes straight to the DOM, so nothing re-renders
 * and screen readers only ever get the real string (via aria-label).
 */
export function DecodeText({ text, className, delay = 0, duration = 900, onView = false }: DecodeTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    let frame = 0;
    let timer = 0;
    let observer: IntersectionObserver | null = null;

    const run = () => {
      const start = performance.now() + delay;
      const tick = (now: number) => {
        const elapsed = now - start;
        if (elapsed < 0) {
          node.textContent = scramble(text, 0);
          frame = requestAnimationFrame(tick);
          return;
        }
        const settled = Math.floor((elapsed / duration) * text.length);
        node.textContent = scramble(text, settled);
        if (settled < text.length) frame = requestAnimationFrame(tick);
        else node.textContent = text;
      };
      frame = requestAnimationFrame(tick);
    };

    if (onView && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer?.disconnect();
          run();
        },
        { threshold: 0.4 }
      );
      observer.observe(node);
    } else {
      timer = window.setTimeout(run, 0);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer?.disconnect();
      node.textContent = text;
    };
  }, [text, delay, duration, onView]);

  return (
    <span aria-label={text} className={cn("inline-block", className)}>
      <span ref={ref} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}

export function scramble(text: string, settled: number) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (i < settled || char === " ") out += char;
    else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  return out;
}
