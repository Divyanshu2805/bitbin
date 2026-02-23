"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Duration of the count-up in ms */
  duration?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` with an ease-out curve the first time it
 * renders. Respects prefers-reduced-motion by jumping straight to the value.
 */
export function AnimatedNumber({ value, duration = 900, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || value === 0) {
      frame.current = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(frame.current);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
