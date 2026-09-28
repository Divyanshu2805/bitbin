"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";

// The page-wide background behind every landing section: two slow
// brand-coloured glows, a rain of "bits" (code glyphs) drifting down the page
// into the bin, and a soft lime light that follows the pointer anywhere on the
// page, brightening the bits it passes. Fixed to the viewport, so it costs
// nothing to scroll; the rain pauses while the tab is hidden or the navbar's
// Features panel is open, and is drawn once,
// still, for reduced motion. `contained` fills the nearest positioned ancestor
// instead of the viewport (the auth pages' brand panel).

const GLYPHS = ["0", "1", "0", "1", "{", "}", "<", "/>", "$", "#", ";", "=>"];
// Read from the theme each frame, so the rain follows light, dark and a live toggle
const COLOR_VARS = ["--brand-lime", "--brand-cyan", "--foreground"];
const DENSITY = 1 / 6500; // bits per px² of viewport
const MAX_BITS = 240;
const GLOW_RADIUS = 160;

type Bit = { x: number; y: number; vy: number; glyph: string; color: number; alpha: number; size: number };

function spawn(width: number, height: number, anywhere: boolean): Bit {
  const depth = Math.random(); // far bits are smaller, fainter and slower
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -20,
    vy: 0.12 + depth * 0.35, // px per 60 fps frame; scaled by real frame time in tick
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    color: Math.random() < 0.55 ? 0 : Math.random() < 0.6 ? 1 : 2,
    alpha: 0.09 + depth * 0.14,
    size: 10 + Math.round(depth * 4),
  };
}

export default function LandingBackdrop({
  contained = false,
  lightStrength = 13,
  darkLightStrength = 5.5,
  glow = 0.75,
  darkGlow = glow,
}: {
  contained?: boolean;
  /** How strong the pointer light is, as a % of lime */
  lightStrength?: number;
  /** The pointer light in the dark theme; the auth brand panel passes AUTH_LIGHT_STRENGTH */
  darkLightStrength?: number;
  /** Opacity of the lime wash and corner glows (the auth brand panel uses 1) */
  glow?: number;
  /** The wash and glows in the dark theme; defaults to glow */
  darkGlow?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let bits: Bit[] = [];
    let frame = 0;
    const pointer = { x: -9999, y: -9999 };
    const font = getComputedStyle(document.body).getPropertyValue("--font-jetbrains-mono") || "monospace";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = root.clientWidth;
      height = root.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_BITS, Math.round(width * height * DENSITY));
      bits = Array.from({ length: count }, () => spawn(width, height, true));
    };

    const draw = () => {
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, width, height);
      const styles = getComputedStyle(root);
      const colors = COLOR_VARS.map((name) => styles.getPropertyValue(name).trim());
      const strength = parseFloat(styles.getPropertyValue("--rain-strength")) || 1;
      for (const bit of bits) {
        const dist = Math.hypot(bit.x - pointer.x, bit.y - pointer.y);
        const boost = dist < GLOW_RADIUS ? (1 - dist / GLOW_RADIUS) * 0.45 : 0;
        ctx.font = `${bit.size}px ${font}`;
        ctx.fillStyle = colors[bit.color];
        ctx.globalAlpha = Math.min(1, bit.alpha * strength + boost);
        ctx.fillText(bit.glyph, bit.x, bit.y);
      }
    };

    // Time-based, so the rain falls at the same speed on a light page and a heavy
    // one, and on 60 Hz and 120 Hz screens alike
    let last = 0;
    const tick = (now: number) => {
      const step = last ? Math.min(now - last, 50) / (1000 / 60) : 1;
      last = now;
      for (let i = 0; i < bits.length; i++) {
        const bit = bits[i];
        bit.y += bit.vy * step;
        if (bit.y > height + 20) bits[i] = spawn(width, height, false);
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    const light = lightRef.current;
    const onPointer = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      if (light) {
        light.style.setProperty("--mx", `${pointer.x}px`);
        light.style.setProperty("--my", `${pointer.y}px`);
        light.style.opacity = "1";
      }
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
      if (light) light.style.opacity = "0";
    };
    // Runs while the tab is visible and the navbar's Features panel is closed
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      last = 0;
      const paused = document.hidden || document.documentElement.hasAttribute("data-features-open");
      if (!paused && !prefersReducedMotion()) frame = requestAnimationFrame(tick);
    };

    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(root);
    // Recolour at once when the theme flips (the still rain under reduced motion never redraws otherwise)
    const themeObserver = new MutationObserver(() => draw());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const menuObserver = new MutationObserver(onVisibility);
    if (!prefersReducedMotion()) {
      menuObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-features-open"] });
    }
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    if (!prefersReducedMotion()) {
      document.addEventListener("visibilitychange", onVisibility);
      frame = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
      menuObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn("pointer-events-none inset-0 -z-10 overflow-hidden", contained ? "absolute" : "fixed")}
    >
      {/* A faint lime wash over the whole surface, then brighter glows at the corners */}
      <div
        className="absolute inset-0 opacity-(--glow-l) dark:opacity-(--glow-d)"
        style={{ "--glow-l": glow, "--glow-d": darkGlow } as React.CSSProperties}
      >
        <div className="absolute inset-0 bg-lime/[0.04]" />
        <div className="absolute -top-40 left-[8%] size-[620px] rounded-full bg-lime/[0.11] blur-[140px]" />
        <div className="absolute top-[35%] right-[-8%] size-[520px] rounded-full bg-lime/[0.07] blur-[150px]" />
        <div className="absolute right-[4%] bottom-[-10%] size-[520px] rounded-full bg-[var(--brand-cyan)]/[0.07] blur-[140px]" />
      </div>
      <div
        ref={lightRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-500 [--light:var(--light-l)] dark:[--light:var(--light-d)]"
        style={
          {
            "--light-l": `${lightStrength}%`,
            "--light-d": `${darkLightStrength}%`,
            background:
              "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--brand-lime) var(--light), transparent), transparent 65%)",
          } as React.CSSProperties
        }
      />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}
