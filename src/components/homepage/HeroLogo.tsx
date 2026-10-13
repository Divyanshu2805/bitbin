"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/shared/logo";
import { prefersReducedMotion } from "@/hooks/use-motion";

// How far the eyes can move inside the bin, in the mark's own units (it is 32 wide)
const REACH_X = 1.1;
const REACH_Y = 0.8;
// How far from the mark the pointer has to be for the eyes to reach all the way
const FULL_AT = 360;

// The hero's logo, quietly alive: its eyes follow the pointer and it blinks now and then
// (landing.css). The pointer is read with a fine pointer only, and nothing moves for reduced motion.
export default function HeroLogo() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const reach = Math.min(1, Math.hypot(dx, dy) / FULL_AT);
        const angle = Math.atan2(dy, dx);
        el.style.setProperty("--lx", (Math.cos(angle) * reach * REACH_X).toFixed(2));
        el.style.setProperty("--ly", (Math.sin(angle) * reach * REACH_Y).toFixed(2));
      });
    };
    const onLeave = () => {
      el.style.setProperty("--lx", "0");
      el.style.setProperty("--ly", "0");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <span ref={ref} className="landing-hero-mark animate-fade-up">
      <LogoMark animated className="landing-hero-logo" />
    </span>
  );
}
