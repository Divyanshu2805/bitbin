import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  className?: string;
}

/**
 * `items   18/50` over a bar that fills lime→coral, drawing in from the left.
 * Turns coral at 90%. Display only; limits are enforced on the server.
 */
export default function UsageMeter({ label, used, limit, className }: UsageMeterProps) {
  const ratio = Math.min(1, limit > 0 ? used / limit : 0);
  const nearlyFull = ratio >= 0.9;

  return (
    <div className={cn("rounded-md border border-border bg-background/60 px-3 py-2.5", className)}>
      <p className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        {label}
        <span className="tabular-nums">
          <span className={nearlyFull ? "text-coral" : "text-foreground"}>{used}</span> / {limit}
        </span>
      </p>
      <span
        className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${label}: ${used} of ${limit}`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
      >
        <span
          className={cn(
            "block h-full origin-left rounded-full animate-[bar-fill_1.2s_cubic-bezier(0.22,1,0.36,1)_both]",
            nearlyFull ? "bg-coral" : "bg-gradient-to-r from-lime to-lime/60"
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </div>
  );
}
