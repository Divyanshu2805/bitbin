import Link from "next/link";
import { cn } from "@/lib/utils";
import { MAX_ITEMS } from "@/lib/constants/plan";
import RoundArrow from "@/components/shared/round-arrow";

/**
 * The Free plan's item allowance: a rounded bar that fills lime as the bin fills
 * (coral when it's nearly full), over a link to upgrade. Folds away on the icon
 * rail. Display only; the limit is enforced on the server.
 */
export default function SidebarUsage({ itemCount }: { itemCount: number }) {
  const used = Math.min(itemCount, MAX_ITEMS);
  const nearlyFull = used >= MAX_ITEMS * 0.9;

  return (
    <div className="sidebar-fold">
      <div>
        <div className="mx-3 mb-3 rounded-2xl bg-card p-3.5">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-foreground">Free plan</span>
            <span className={cn("font-mono text-xs tabular-nums", nearlyFull ? "text-coral" : "text-muted-foreground")}>
              {used} / {MAX_ITEMS}
            </span>
          </div>
          <span
            className="mt-3 block h-2 overflow-hidden rounded-full bg-foreground/[0.08]"
            role="meter"
            aria-label="Items used"
            aria-valuemin={0}
            aria-valuemax={MAX_ITEMS}
            aria-valuenow={used}
          >
            <span
              className={cn(
                "block h-full origin-left rounded-full animate-[bar-fill_1.2s_cubic-bezier(0.22,1,0.36,1)_both]",
                nearlyFull ? "bg-coral" : "bg-lime"
              )}
              style={{ width: `${(used / MAX_ITEMS) * 100}%` }}
            />
          </span>
          <Link
            href="/upgrade"
            className="group mt-3 flex items-center justify-between rounded-lg text-[13px] font-medium text-foreground/80 transition-colors hover:text-lime"
          >
            Unlimited with Pro
            <RoundArrow />
          </Link>
        </div>
      </div>
    </div>
  );
}
