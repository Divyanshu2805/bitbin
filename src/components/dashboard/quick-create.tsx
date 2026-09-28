"use client";

import { useState } from "react";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import { Button } from "@/components/ui/button";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import { readableColor } from "@/lib/utils/color";
import NewItemDialog, { type ItemTypeName } from "@/components/items/new-item-dialog";

const TYPES: { name: ItemTypeName; icon: string }[] = [
  { name: "snippet", icon: "Code" },
  { name: "prompt", icon: "Sparkles" },
  { name: "command", icon: "Terminal" },
  { name: "note", icon: "StickyNote" },
  { name: "link", icon: "Link" },
];

/**
 * `new › snippet prompt command note link`: one chip per type, each opening the
 * new-item dialog already set to that type.
 */
export default function QuickCreate({ isPro }: { isPro?: boolean }) {
  const [type, setType] = useState<ItemTypeName | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-up" style={{ animationDelay: "140ms" }}>
      <span className="mr-1 font-mono text-xs text-muted-foreground">
        <span className="text-lime">+</span> new
      </span>
      {TYPES.map(({ name, icon }) => {
        const color = readableColor(ITEM_TYPE_COLORS[name]);
        return (
          <Button
            key={name}
            variant="outline"
            size="sm"
            onClick={() => setType(name)}
            className="font-mono text-xs font-normal"
            style={{ "--grid-color": color } as React.CSSProperties}
          >
            <ItemTypeIcon icon={icon} className="h-3.5 w-3.5" style={{ color }} />
            {name}
          </Button>
        );
      })}

      <NewItemDialog
        open={type !== null}
        onOpenChange={(open) => !open && setType(null)}
        defaultType={type ?? undefined}
        isPro={isPro}
      />
    </div>
  );
}
