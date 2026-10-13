import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's "go" arrow: a small round badge with a soft arrow in it, in place of
 * a text `→`. Put it inside an element with the `group` class and it nudges
 * forward and fills with the accent when that element is hovered.
 */
export default function RoundArrow({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full bg-foreground/[0.08] text-current transition-[background-color,color,translate] duration-200 group-hover:translate-x-0.5 group-hover:bg-lime group-hover:text-primary-foreground",
        className
      )}
    >
      <ArrowRight className="size-3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </span>
  );
}
