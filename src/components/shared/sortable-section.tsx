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
}

export default function SortableSection({
  title,
  count,
  sort,
  onSortChange,
  options,
  children,
}: SortableSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title} ({count})
        </h2>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger size="sm" className="h-7 text-xs font-mono gap-1.5 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="border border-border rounded-md divide-y divide-border bg-card">
        {children}
      </div>
    </section>
  );
}
