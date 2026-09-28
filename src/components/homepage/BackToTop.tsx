"use client";

import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "@/lib/smooth-scroll";

// A round button in the bottom-right corner that takes you back to the top. It
// appears once you're past the hero, and a ring around it fills as you scroll
// down the page. Written to the DOM on scroll, so nothing re-renders.

const SHOW_AFTER = 600; // px scrolled
const R = 20;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function BackToTop() {
  const button = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      ring.current?.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE * (1 - progress)));
      const shown = window.scrollY > SHOW_AFTER;
      if (button.current) {
        button.current.dataset.shown = String(shown);
        button.current.tabIndex = shown ? 0 : -1;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <button
      ref={button}
      type="button"
      data-shown="false"
      tabIndex={-1}
      aria-label="Back to top"
      onClick={scrollToTop}
      className="group fixed right-5 bottom-5 z-40 grid size-12 place-items-center rounded-full border border-border bg-card/80 text-muted-foreground shadow-[var(--shadow-lift)] backdrop-blur-md transition-[opacity,translate,scale,color,border-color] duration-300 hover:-translate-y-0.5 hover:border-lime/40 hover:text-lime data-[shown=false]:pointer-events-none data-[shown=false]:translate-y-3 data-[shown=false]:scale-90 data-[shown=false]:opacity-0 sm:right-8 sm:bottom-8"
    >
      {/* Scroll progress: the ring fills as you go down */}
      <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" stroke="var(--border)" strokeWidth="2" />
        <circle
          ref={ring}
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="var(--brand-lime)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <ArrowUp className="relative size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
    </button>
  );
}
