"use client";

import { LayoutGrid, List } from "lucide-react";
import { SegmentedTabs } from "@/components/shared/segmented-tabs";
import { setViewMode, useViewMode, type ViewMode } from "@/lib/view-mode";

/** Grid | List, for every page that lists items or collections (one shared choice). */
export function ViewToggle({ className }: { className?: string }) {
  const mode = useViewMode();
  return (
    <SegmentedTabs
      className={className}
      tabs={[
        { id: "grid", label: "Grid", icon: LayoutGrid },
        { id: "list", label: "List", icon: List },
      ]}
      active={mode}
      onChange={(id) => setViewMode(id as ViewMode)}
    />
  );
}
