"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
 * Explanation): a sunken track with a raised pill that slides to the chosen
 * tab, and the tab's icon in lime. The other tabs light up softly on hover.
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
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));

  // Measure the chosen tab so the pill can slide to it
  useLayoutEffect(() => {
    const el = refs.current[index];
    if (!el) return;
    const measure = () => setPill({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, tabs.length]);

  const move = (step: number) => {
    const next = (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      className={cn(
        "relative inline-flex items-center rounded-lg border border-border bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] p-0.5 shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]",
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
      {/* The sliding pill */}
      {pill && (
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 rounded-md border border-border bg-[var(--editor-bg)] shadow-[0_1px_3px_rgb(0_0_0/0.18)] transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
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
              "group/tab relative z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/60",
              selected
                ? "text-foreground"
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
