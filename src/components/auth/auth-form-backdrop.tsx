"use client";

import { useEffect, useRef } from "react";
import AppBackdrop from "@/components/layout/app-backdrop";

/** The pointer light's strength on both auth panels, as a % of lime: dark theme, and the stronger light theme */
export const AUTH_LIGHT_STRENGTH = 8;
export const AUTH_LIGHT_STRENGTH_LIGHT = 10;

// Matches LandingBackdrop's light (a 420px circle fading out by 65%)
const RADIUS = 420;
const SIZE = RADIUS * 2;

// Behind the auth form: the dashboard's backdrop (drifting glows, a beam, a
// vignette), plus a soft lime light under the pointer. It's the brand panel's
// light, tracked across the whole window, so near the divider the two halves
// meet as one circle. The light is a fixed-size layer moved with a transform, at
// most once a frame, so following the pointer never repaints the panel.
export function AuthFormBackdrop() {
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const light = lightRef.current;
    const host = light?.parentElement;
    if (!light || !host) return;

    let x = 0;
    let y = 0;
    let frame = 0;

    const place = () => {
      frame = 0;
      light.style.transform = `translate3d(${x - RADIUS}px, ${y - RADIUS}px, 0)`;
    };

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (light.style.opacity !== "1") {
        place();
        light.style.opacity = "1";
      } else if (!frame) {
        frame = requestAnimationFrame(place);
      }
    };
    const onLeave = () => {
      light.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <AppBackdrop />
      {/* Dims the backdrop a little on the auth pages, where it fills a whole panel behind a small form */}
      <div className="absolute inset-0 bg-background/35" />
      <div
        ref={lightRef}
        className="absolute left-0 top-0 opacity-0 transition-opacity duration-500 will-change-transform"
        style={{
          width: SIZE,
          height: SIZE,
          background: `radial-gradient(closest-side, light-dark(color-mix(in srgb, var(--brand-lime) ${AUTH_LIGHT_STRENGTH_LIGHT}%, transparent), color-mix(in srgb, var(--brand-lime) ${AUTH_LIGHT_STRENGTH}%, transparent)), transparent 65%)`,
        }}
      />
    </div>
  );
}
