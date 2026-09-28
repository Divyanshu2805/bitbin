import Link from "next/link";
import { cn } from "@/lib/utils";
import { MAX_ITEMS } from "@/lib/constants/plan";

/**
 * The Free plan's item allowance as a commit-style grid: one cell per item slot,
 * filled lime as the bin fills (coral when it's nearly full). Cells light up one
 * after another on load. Folds away on the icon rail. Display only; the limit is
 * enforced on the server.
 */
export default function SidebarUsage({ itemCount }: { itemCount: number }) {
  const used = Math.min(itemCount, MAX_ITEMS);
  const nearlyFull = used >= MAX_ITEMS * 0.9;

  return (
    <div className="sidebar-fold">
      <div>
        <div className="mx-3 mb-3 rounded-md border border-border bg-background/50 p-3">
          <div className="mb-2 flex items-baseline justify-between font-mono text-xs">
            <span className="text-muted-foreground">
              <span className="text-muted-foreground/50">{"// "}</span>free plan
            </span>
            <span className={cn("tabular-nums", nearlyFull ? "text-coral" : "text-foreground")}>
              {used}/{MAX_ITEMS}
            </span>
          </div>
          <div
            className="grid grid-cols-[repeat(25,1fr)] gap-[2px]"
            role="img"
            aria-label={`${used} of ${MAX_ITEMS} items used`}
          >
            {Array.from({ length: MAX_ITEMS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "usage-cell aspect-square rounded-[1.5px]",
                  i < used ? (nearlyFull ? "bg-coral/80" : "bg-lime/75") : "bg-foreground/[0.07]"
                )}
                style={{ "--i": i } as React.CSSProperties}
              />
            ))}
          </div>
          <Link
            href="/upgrade"
            className="group mt-2.5 flex items-center justify-between font-mono text-xs text-muted-foreground transition-colors hover:text-lime"
          >
            unlimited with pro
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
