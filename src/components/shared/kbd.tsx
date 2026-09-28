import { Command } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One key's label. ⌘ is drawn as an icon: the mono font has no ⌘, and the
 * fallback font's glyph sits off-centre in the cap.
 */
export function KeyLabel({ label }: { label: string }) {
  if (!label.includes("⌘")) return <>{label}</>;
  const [before, after] = label.split("⌘");
  return (
    <>
      {before}
      <Command className="size-[0.85em] shrink-0" strokeWidth={2.25} />
      {after}
    </>
  );
}

/** Key caps for a shortcut, e.g. <Kbd keys={["G", "D"]} />. Hidden from screen readers. */
export function Kbd({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key, i) => (
        <span key={i} className="kbd">
          <KeyLabel label={key} />
        </span>
      ))}
    </span>
  );
}
