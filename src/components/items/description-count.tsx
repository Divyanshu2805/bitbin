import { MAX_DESCRIPTION_LENGTH } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * "812 / 1000" under a description field: shown once it's getting long, red
 * past the cap (AI-written text can overshoot the field's maxLength).
 */
export function DescriptionCount({ length }: { length: number }) {
  if (length < MAX_DESCRIPTION_LENGTH * 0.8) return null;
  const over = length > MAX_DESCRIPTION_LENGTH;
  return (
    <p className={cn("text-right font-mono text-[11px] tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
      {length} / {MAX_DESCRIPTION_LENGTH}
      {over ? " · too long" : ""}
    </p>
  );
}
