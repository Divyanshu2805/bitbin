"use client";

import { cn } from "@/lib/utils";
import { TransitionLink } from "@/components/shared/transition-link";
import { LogoMark } from "@/components/shared/logo";
import LandingBackdrop from "./LandingBackdrop";
import { BRAND_SURFACE } from "./brand-surface";
import { useEffect, useRef } from "react";
import { prefersReducedMotion, usePointerEffects, useReveal } from "@/hooks/use-motion";
import { startSmoothScroll } from "@/lib/smooth-scroll";

// Building blocks shared by the homepage sections.

/**
 * Root of the homepage: the page-wide backdrop, plus scroll reveals and pointer
 * effects for everything inside. Follows the app theme, and so do the app-window
 * mockups inside, drawn from the shared pieces in mock-app.tsx.
 */
export function LandingRoot({ children }: { children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>();
  usePointerEffects(ref);
  useEffect(() => startSmoothScroll(), []);
  return (
    <div ref={ref} className={cn("landing relative isolate min-h-dvh overflow-x-clip bg-background text-foreground", BRAND_SURFACE)}>
      <LandingBackdrop />
      {children}
    </div>
  );
}

/**
 * A homepage section: a numbered mono label, a big heading, a sentence of
 * explanation, then the visual. `accent` tints the label and anything inside that
 * uses `var(--accent)`, so every section has its own colour.
 */
export function Section({
  id,
  index,
  label,
  title,
  description,
  accent = "var(--brand-lime)",
  align = "left",
  children,
  className,
}: {
  id: string;
  index: string;
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  accent?: string;
  align?: "left" | "center";
  children?: React.ReactNode;
  className?: string;
}) {
  const centered = align === "center";
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-24 py-24 sm:py-32", className)}
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeading index={index} label={label} title={title} description={description} centered={centered} />
        {children ? <div className="mt-14 sm:mt-16">{children}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeading({
  index,
  label,
  title,
  description,
  centered = false,
}: {
  index: string;
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
      <p
        data-reveal
        className={cn(
          "inline-flex items-center gap-2.5 rounded-full border px-3 py-1 font-mono text-xs",
          "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[var(--accent)]"
        )}
      >
        <span className="dark:opacity-60">{index}</span>
        <span className="h-3 w-px bg-current opacity-30" />
        {label}
      </p>
      <h2
        data-reveal
        style={{ "--d": "80ms" } as React.CSSProperties}
        className="mt-6 text-balance font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.08] tracking-[-0.04em]"
      >
        {title}
      </h2>
      {description ? (
        <p
          data-reveal
          style={{ "--d": "160ms" } as React.CSSProperties}
          className={cn(
            "text-desc mt-5 text-pretty text-base leading-relaxed sm:text-lg",
            centered && "mx-auto"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Highlighted words inside a heading, in the section's accent colour. */
export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--accent,var(--brand-lime))]">{children}</span>;
}

/**
 * The homepage button, built on `.btn` (globals.css): a lit top edge, a lift and
 * glow on hover, a sheen that crosses it, and a real press when clicked.
 * `terminal` is the dark, developer-flavoured one: a mono label that decodes on
 * hover, and an optional `$` prompt and blinking caret. It slides to the next page.
 */
export function CtaLink({
  href,
  children,
  variant = "primary",
  size = "lg",
  kbd,
  prompt = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "terminal";
  size?: "lg" | "sm";
  /** A key hint shown after the label */
  kbd?: string;
  /** Terminal only: the BitBin logo as the prompt, the label typing itself in, and a caret after it */
  prompt?: boolean;
  className?: string;
}) {
  const terminal = variant === "terminal";
  return (
    <TransitionLink
      href={href}
      className={cn(
        "btn",
        terminal ? "btn-terminal font-mono" : variant === "primary" ? "btn-primary" : "btn-secondary",
        size === "lg" ? "h-11 rounded-[10px] px-5 text-[15px]" : "h-9 rounded-lg px-3.5 text-sm",
        className
      )}
    >
      {terminal && prompt ? (
        <span aria-hidden className="btn-prompt">
          <LogoMark className="size-[1.2em]" />
        </span>
      ) : null}
      {terminal && typeof children === "string" ? (
        prompt ? (
          // Keeps typing itself, the caret riding its edge, inside a slot as wide
          // as the full label so the button never changes size (`.btn-type`).
          // Plain text: no hover scramble on top of the typing.
          <span className="btn-type-slot" style={{ "--chars": children.length } as React.CSSProperties}>
            <span className="btn-type">{children}</span>
            <span aria-hidden className="btn-caret" />
          </span>
        ) : (
          <ScrambleLabel text={children} />
        )
      ) : (
        children
      )}
      {terminal && prompt && typeof children !== "string" ? <span aria-hidden className="btn-caret" /> : null}
      {kbd ? (
        <span aria-hidden className="btn-kbd">
          {kbd}
        </span>
      ) : terminal ? null : (
        <span aria-hidden className="btn-arrow">
          →
        </span>
      )}
    </TransitionLink>
  );
}

const SCRAMBLE_GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789{}[]<>/=+*#$%&";

/** `text` with every character past the first `settled` swapped for a random glyph. */
function scramble(text: string, settled: number) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (i < settled || char === " ") out += char;
    else out += SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
  }
  return out;
}

/**
 * A label that re-decodes (random glyphs settling left to right) each time its
 * link or button is hovered or focused. Writes to the DOM directly; screen readers get the
 * real text.
 */
export function ScrambleLabel({ text, duration = 420 }: { text: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    const trigger = node?.closest("a, button");
    if (!node || !trigger) return;
    let frame = 0;

    const run = () => {
      if (prefersReducedMotion()) return;
      cancelAnimationFrame(frame);
      const start = performance.now();
      const tick = (now: number) => {
        const settled = Math.floor(((now - start) / duration) * text.length);
        if (settled >= text.length) {
          node.textContent = text;
          return;
        }
        node.textContent = scramble(text, settled);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    trigger.addEventListener("pointerenter", run);
    trigger.addEventListener("focus", run);
    return () => {
      cancelAnimationFrame(frame);
      trigger.removeEventListener("pointerenter", run);
      trigger.removeEventListener("focus", run);
      node.textContent = text;
    };
  }, [text, duration]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">
        {text}
      </span>
    </>
  );
}

/** App-window chrome (traffic lights and a title) around a mock UI. */
export function Window({
  title,
  children,
  className,
  right,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-lift)]",
        className
      )}
    >
      <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-4">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 min-w-0 truncate font-mono text-xs text-muted-foreground">{title}</span>
        {right ? <span className="ml-auto shrink-0">{right}</span> : null}
      </div>
      {children}
    </div>
  );
}
