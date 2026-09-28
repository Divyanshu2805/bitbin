"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// A lime dot grid that only shows in a circle around the pointer, so dots light
// up as you move over the parent. Fills its nearest positioned ancestor and
// sits behind its content. Pointer tracking writes CSS variables, so nothing
// re-renders.

const DOTS = "radial-gradient(circle, currentColor 1px, transparent 1.5px)";

export function DotSpotlight({
  radius = 180,
  className,
  children,
}: {
  /** Radius of the lit circle, in px */
  radius?: number;
  className?: string;
  /** Extra layers drawn under the dots (a tint, say) */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    const host = node?.parentElement;
    if (!node || !host) return;

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      node.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      node.style.setProperty("--my", `${e.clientY - rect.top}px`);
      node.style.setProperty("--spot", "1");
    };
    const onLeave = () => node.style.setProperty("--spot", "0");

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      {children}
      <div
        className="absolute inset-0 text-lime/55 transition-opacity duration-500"
        style={{
          backgroundImage: DOTS,
          backgroundSize: "22px 22px",
          opacity: "var(--spot, 0)",
          maskImage: `radial-gradient(${radius}px circle at var(--mx, 50%) var(--my, 50%), #000, transparent 70%)`,
        }}
      />
    </div>
  );
}
