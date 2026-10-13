"use client";

import { useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_COMPARISON } from "@/lib/constants/pricing";

/**
 * Free and Pro compared row by row, folded away behind a toggle. Shown under
 * the plan cards on the homepage's pricing section and on the upgrade page.
 */
export default function PlanCompare({ className }: { className?: string }) {
  const [comparing, setComparing] = useState(false);

  return (
    <div className={className}>
      <div className="flex justify-center">
        <button
          type="button"
          aria-expanded={comparing}
          aria-controls="compare-plans"
          onClick={() => setComparing((v) => !v)}
          className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-4 py-2 font-mono text-[13px] text-muted-foreground transition-colors hover:border-lime/40 hover:text-foreground"
        >
          {comparing ? "Hide comparison" : "Compare plans"}
          <ChevronDown className={cn("size-4 transition-transform duration-300", comparing && "rotate-180")} />
        </button>
      </div>
      <div
        id="compare-plans"
        // Folded, the rows are out of reach of the keyboard and screen readers too
        inert={!comparing}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          comparing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card text-left">
            <div className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center border-b border-border bg-surface px-5 py-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase sm:grid-cols-[minmax(0,1fr)_140px_140px]">
              <span>Compare plans</span>
              <span className="text-center">Free</span>
              <span className="text-center text-lime">Pro</span>
            </div>
            {PLAN_COMPARISON.map(([feature, free, pro]) => (
              <div
                key={feature}
                className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center border-b border-border/60 px-5 py-2.5 text-[14px] last:border-b-0 hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_140px_140px]"
              >
                <span className="text-foreground/85">{feature}</span>
                <Cell value={free} />
                <Cell value={pro} pro />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ value, pro = false }: { value: boolean | string; pro?: boolean }) {
  if (typeof value === "string") {
    return <span className={cn("text-center font-mono text-[13px]", pro ? "text-lime" : "text-muted-foreground")}>{value}</span>;
  }
  return (
    <span className="grid place-items-center">
      {value ? (
        <Check className={cn("size-4", pro ? "text-lime" : "text-foreground/70")} strokeWidth={2.5} aria-label="Included" />
      ) : (
        <Minus className="size-4 text-faint dark:text-muted-foreground/40" aria-label="Not included" />
      )}
    </span>
  );
}
