"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SortOption {
  value: string;
  label: string;
}

interface SortableSectionProps {
  title: string;
  count: number;
  sort: string;
  onSortChange: (value: string) => void;
  options: SortOption[];
  children: React.ReactNode;
  /** Children bring their own frame (a grid of cards, a framed list) */
  bare?: boolean;
}

/** A `// title [n] ───── sort ▾` rule over a hairline-divided list. */
export default function SortableSection({
  title,
  count,
  sort,
  onSortChange,
  options,
  children,
  bare = false,
}: SortableSectionProps) {
  return (
    <section className="animate-fade-up">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="shrink-0 font-mono text-sm text-foreground">
          <span className="text-muted-foreground">{"// "}</span>
          {title.toLowerCase()}
          <span className="ml-2 text-xs tabular-nums text-muted-foreground">[{count}]</span>
        </h2>
        <span aria-hidden className="h-px flex-1 bg-[linear-gradient(90deg,var(--border),transparent)]" />
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger size="sm" className="h-7 gap-1.5 border-border bg-card/70 font-mono text-xs" aria-label={`Sort ${title.toLowerCase()}`}>
            <span className="text-muted-foreground">sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {bare ? (
        children
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/80">
          {children}
        </div>
      )}
    </section>
  );
}
