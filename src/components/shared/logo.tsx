import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  /** Loop the bin opening, the bit dropping in and the lid closing (on by default) */
  animated?: boolean;
}

/**
 * BitBin logo mark — a clay bin, lit from above, with a "bit" dropping into it.
 * Pure SVG so it scales cleanly and inherits no external assets. Animated, the
 * lid swings open on its left hinge, the bit tumbles in behind the body, the bin
 * takes it with a squash and a squint, and the lid snaps shut (`.logo-mark` in
 * globals.css; still under reduced motion). Pass `animated={false}` to a mark too
 * small to read: a running mark repaints every frame.
 */
export function LogoMark({ className, animated = true }: LogoMarkProps) {
  // Each mark gets its own gradient: a shared id would break wherever the first copy on the page is hidden
  const gradient = useId();

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-animated={animated || undefined}
      className={cn("logo-mark h-7 w-7 shrink-0 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gradient} x1="16" y1="9" x2="16" y2="29.2" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--logo-light)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-deep)" }} />
        </linearGradient>
      </defs>
      {/* rim: the lid, hinged at its left end; it swings up behind the bit */}
      <rect x="3.5" y="9" width="25" height="3.4" rx="1.7" className="logo-lid" fill={`url(#${gradient})`} />
      {/* falling bit (drawn before the bin, so the body hides it as it drops in) */}
      <rect x="13.5" y="1.5" width="5" height="5" rx="1.2" className="logo-bit" />
      {/* the bin: body and face squash together when a bit lands */}
      <g className="logo-bin">
        <path
          d="M6 14h20l-1.7 13.1a2.4 2.4 0 0 1-2.38 2.1H10.08a2.4 2.4 0 0 1-2.38-2.1L6 14Z"
          fill={`url(#${gradient})`}
        />
        {/* bits inside the bin, which read as a face: the hero's mark (HeroLogo) moves the eyes */}
        <g className="logo-eyes">
          <rect x="10.2" y="17" width="3.6" height="3.6" rx="0.8" style={{ fill: "var(--background)" }} />
          <rect x="18.2" y="17" width="3.6" height="3.6" rx="0.8" style={{ fill: "var(--background)" }} />
        </g>
        <rect x="14.2" y="22.2" width="3.6" height="3.6" rx="0.8" className="logo-mouth" style={{ fill: "var(--background)" }} />
      </g>
    </svg>
  );
}

interface LogoProps extends LogoMarkProps {
  /** Hide the wordmark on small screens */
  collapseOnMobile?: boolean;
  wordmarkClassName?: string;
}

/** Mark + "BitBin" wordmark */
export function Logo({
  className,
  animated,
  collapseOnMobile = false,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn("group/logo inline-flex items-center gap-2.5", className)}>
      <LogoMark
        animated={animated}
        className="transition-transform duration-300 group-hover/logo:-rotate-6 group-hover/logo:scale-105"
      />
      <span
        className={cn(
          "font-sans text-lg font-bold tracking-tight",
          collapseOnMobile && "hidden sm:inline",
          wordmarkClassName
        )}
      >
        Bit<span className="logo-word">Bin</span>
      </span>
    </span>
  );
}
