import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { MAX_COLLECTIONS, MAX_ITEMS } from "@/lib/constants/plan";
import type { DashboardStats, ItemTypeWithCount } from "@/lib/db/items";

interface BinOverviewProps {
  stats: DashboardStats;
  itemTypes: ItemTypeWithCount[];
  isPro?: boolean;
}

/**
 * The dashboard's `bin --stats` pane: four counters, then the bin broken down by
 * type as one stacked bar (like a disk-usage view) with a legend that links to
 * each type. Segments grow in from the left, one after another.
 */
export default function BinOverview({ stats, itemTypes, isPro }: BinOverviewProps) {
  const total = itemTypes.reduce((sum, type) => sum + type.count, 0);
  const filled = itemTypes.filter((type) => type.count > 0);
  const isProType = (name: string) => name === "file" || name === "image";

  const counters = [
    { label: "items", value: stats.totalItems, limit: isPro ? undefined : MAX_ITEMS, color: "var(--brand-lime)" },
    {
      label: "collections",
      value: stats.totalCollections,
      limit: isPro ? undefined : MAX_COLLECTIONS,
      color: "var(--brand-cyan)",
    },
    { label: "starred items", value: stats.favoriteItems, color: "light-dark(#a16207, #ffc857)" },
    { label: "starred collections", value: stats.favoriteCollections, color: "var(--brand-coral)" },
  ];

  return (
    <section
      aria-label="Your bin at a glance"
      className="tui bg-card/80 backdrop-blur-sm animate-fade-up [--tui-bg:var(--card)]"
      style={{ animationDelay: "80ms" }}
    >
      <span className="tui-title font-mono">
        <span className="text-lime">$</span> bin --stats
      </span>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {counters.map((counter, i) => {
          const nearlyFull = counter.limit !== undefined && counter.value >= counter.limit * 0.9;
          return (
            <div
              key={counter.label}
              className={cn(
                "group relative px-5 pt-6 pb-5",
                i % 2 === 1 && "border-l border-border",
                i >= 2 && "border-t border-border lg:border-t-0",
                i === 2 && "lg:border-l"
              )}
            >
              <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-[2px]" style={{ backgroundColor: counter.color }} />
                {counter.label}
              </p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <AnimatedNumber
                  value={counter.value}
                  className="font-display text-[2rem] font-bold leading-none tabular-nums tracking-[-0.04em]"
                />
                {counter.limit !== undefined && (
                  <span className={cn("font-mono text-xs text-muted-foreground", nearlyFull && "text-coral")}>
                    /{counter.limit}
                  </span>
                )}
              </p>
              {/* A hairline in the counter's colour that draws in on hover */}
              <span
                aria-hidden
                className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ backgroundColor: counter.color }}
              />
            </div>
          );
        })}
      </div>

      {/* Breakdown by type */}
      <div className="border-t border-border px-5 pt-4 pb-5">
        <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>
            <span className="text-muted-foreground/50">{"// "}</span>by type
          </span>
          <span className="tabular-nums">{total} total</span>
        </div>

        <div
          className="flex h-2.5 gap-[3px] overflow-hidden rounded-[3px] bg-foreground/[0.05]"
          role="img"
          aria-label={filled.map((type) => `${type.count} ${type.name}s`).join(", ") || "No items yet"}
        >
          {filled.map((type, i) => (
            <span
              key={type.name}
              className="h-full origin-left rounded-[2px] animate-[bar-fill_0.9s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{
                width: `${(type.count / total) * 100}%`,
                backgroundColor: type.color,
                animationDelay: `${250 + i * 90}ms`,
              }}
            />
          ))}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {itemTypes
            .filter((type) => type.count > 0 || (!isProType(type.name) || isPro))
            .map((type) => (
              <li key={type.name}>
                <Link
                  href={`/items/${type.name}s`}
                  className={cn(
                    "group inline-flex items-center gap-2 font-mono text-xs transition-colors hover:text-foreground",
                    type.count > 0 ? "text-foreground/80" : "text-muted-foreground"
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-[2px] transition-transform group-hover:scale-125"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.name}s
                  <span className="tabular-nums text-muted-foreground">{type.count}</span>
                  {total > 0 && type.count > 0 && (
                    <span className="hidden tabular-nums text-muted-foreground/50 sm:inline">
                      {Math.round((type.count / total) * 100)}%
                    </span>
                  )}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
