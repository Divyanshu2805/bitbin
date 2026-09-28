"use client";

import { useRef } from "react";
import { useInView } from "@/hooks/use-motion";

// The footer's huge outlined "bitbin". When you reach the bottom of the page it
// lights up letter by letter, left to right: the outline turns lime, the letters
// fill faintly and glow. Scrolling back up dims it again.

const WORD = "bitbin";

export default function FooterWordmark() {
  const ref = useRef<HTMLParagraphElement>(null);
  const lit = useInView(ref, { threshold: 0.6 });

  return (
    <p
      ref={ref}
      aria-hidden
      className="mx-auto max-w-[1200px] select-none overflow-hidden px-5 text-center font-display text-[clamp(4rem,19vw,15rem)] font-extrabold leading-[0.8] tracking-[-0.06em] sm:px-8"
    >
      {WORD.split("").map((letter, i) => (
        <span
          key={i}
          style={{
            WebkitTextStrokeWidth: "1px",
            WebkitTextStrokeColor: lit ? "var(--brand-lime)" : "var(--border)",
            color: lit ? "color-mix(in srgb, var(--brand-lime) 10%, transparent)" : "transparent",
            filter: lit ? "drop-shadow(0 0 18px color-mix(in srgb, var(--brand-lime) 35%, transparent))" : "none",
            transition: "color 0.6s ease, -webkit-text-stroke-color 0.6s ease, filter 0.8s ease",
            transitionDelay: lit ? `${i * 110}ms` : `${(WORD.length - 1 - i) * 50}ms`,
          }}
        >
          {letter}
        </span>
      ))}
    </p>
  );
}
