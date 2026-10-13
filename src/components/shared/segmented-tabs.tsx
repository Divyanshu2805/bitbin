"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentedTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** A short tag after the label, e.g. "-25%" */
  badge?: string;
}

/**
 * A two-or-more way toggle (Write | Preview, Original | Optimized, Code |
 * Explanation): a sunken track with the chosen tab raised on a card, and its
 * icon in lime. The other tabs light up softly on hover.
 * Arrow keys move between tabs.
 */
export function SegmentedTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: SegmentedTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));

  const move = (step: number) => {
    const next = (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      className={cn(
        "relative inline-flex items-center rounded-full border border-border bg-muted p-0.5",
        className
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {tabs.map((tab, i) => {
        const selected = i === index;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "group/tab relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium outline-none",
              // A neutral focus ring: inside a dialog `--ring` is the accent, which made the chosen tab look like another control
              "focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--foreground)_35%,var(--border))]",
              selected
                ? "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] hover:text-foreground"
            )}
          >
            {Icon && (
              <Icon className={cn("h-3.5 w-3.5 transition-colors", selected ? "text-lime" : "group-hover/tab:text-lime")} />
            )}
            {tab.label}
            {tab.badge && <span className="rounded bg-lime/15 px-1.5 text-[10.5px] font-bold text-lime">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
