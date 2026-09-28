"use client";

import { useEffect, useState } from "react";
import { usePagePaused } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";

// The "agent at work" spinner used across BitBin, in the style of a CLI coding
// agent: a star glyph that breathes through a few shapes, a verb with a light
// sweeping across it, and elapsed seconds.
//
//   ✻ Binning… (3s · esc to cancel)

const GLYPHS = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];

export const AGENT_VERBS = ["Binning", "Indexing", "Tagging", "Filing", "Sorting", "Compiling", "Grepping", "Stashing"];

interface AgentSpinnerProps {
  /** One verb, or several to rotate through */
  verb?: string | readonly string[];
  /** Show elapsed seconds */
  timer?: boolean;
  /** Trailing hint, e.g. "esc to cancel" */
  hint?: string;
  className?: string;
}

export function AgentSpinner({ verb = AGENT_VERBS, timer = false, hint, className }: AgentSpinnerProps) {
  const verbs = typeof verb === "string" ? [verb] : verb;
  const [tick, setTick] = useState(0);
  const paused = usePagePaused();

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 120);
    return () => window.clearInterval(id);
  }, [paused]);

  const glyph = GLYPHS[tick % GLYPHS.length];
  const word = verbs[Math.floor(tick / 22) % verbs.length];
  const seconds = Math.floor((tick * 120) / 1000);

  return (
    <span role="status" className={cn("inline-flex items-center gap-2 font-mono text-sm", className)}>
      <span aria-hidden className="w-3 text-center text-coral">
        {glyph}
      </span>
      <span key={word} className="shimmer-text animate-fade-in">
        {word}…
      </span>
      {timer || hint ? (
        <span className="text-muted-foreground">
          ({[timer ? `${seconds}s` : null, hint].filter(Boolean).join(" · ")})
        </span>
      ) : null}
    </span>
  );
}

/** `⏺ Action(args)`: one step an agent took. `state` colours the bullet. */
export function ToolLine({
  name,
  args,
  state = "done",
  className,
}: {
  name: string;
  args?: string;
  state?: "running" | "done" | "error";
  className?: string;
}) {
  return (
    <p className={cn("flex items-baseline gap-2 font-mono text-[13px]", className)}>
      <span
        aria-hidden
        className={cn(
          "shrink-0",
          state === "done" && "text-lime",
          state === "running" && "animate-pulse text-foreground",
          state === "error" && "text-destructive"
        )}
      >
        ⏺
      </span>
      <span className="min-w-0">
        <span className="font-semibold text-foreground">{name}</span>
        {args !== undefined ? <span className="text-muted-foreground">({args})</span> : null}
      </span>
    </p>
  );
}

/** `⎿ result`: what the step produced, indented under its ToolLine. */
export function ResultLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex gap-2 pl-1 font-mono text-[13px] text-muted-foreground", className)}>
      <span aria-hidden className="shrink-0 text-muted-foreground">
        ⎿
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
