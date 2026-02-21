import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  /** Animate the falling "bit" into the bin */
  animated?: boolean;
}

/**
 * BitBin logo mark — a lime bin with a coral "bit" dropping into it.
 * Pure SVG so it scales cleanly and inherits no external assets.
 */
export function LogoMark({ className, animated = false }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-7 w-7 shrink-0", className)}
    >
      {/* falling bit */}
      <rect
        x="13.5"
        y="1.5"
        width="5"
        height="5"
        rx="1.2"
        className={cn(animated && "animate-bit-drop")}
        style={{ fill: "var(--brand-coral)", transformBox: "fill-box" }}
      />
      {/* rim */}
      <rect x="3.5" y="9" width="25" height="3.4" rx="1.7" style={{ fill: "var(--brand-lime)" }} />
      {/* body */}
      <path
        d="M6 14h20l-1.7 13.1a2.4 2.4 0 0 1-2.38 2.1H10.08a2.4 2.4 0 0 1-2.38-2.1L6 14Z"
        style={{ fill: "var(--brand-lime)" }}
      />
      {/* bits inside the bin */}
      <rect x="10.2" y="17" width="3.6" height="3.6" rx="0.8" style={{ fill: "var(--background)" }} />
      <rect x="18.2" y="17" width="3.6" height="3.6" rx="0.8" style={{ fill: "var(--background)" }} />
      <rect x="14.2" y="22.2" width="3.6" height="3.6" rx="0.8" style={{ fill: "var(--background)" }} />
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
          "font-display text-lg font-bold tracking-tight",
          collapseOnMobile && "hidden sm:inline",
          wordmarkClassName
        )}
      >
        Bit<span className="text-lime">Bin</span>
      </span>
    </span>
  );
}
