"use client";

import { useState } from "react";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import { readableColor, typeChipBackground } from "@/lib/utils/color";
import NewItemDialog, { type ItemTypeName } from "@/components/items/new-item-dialog";

const TYPES: { name: ItemTypeName; icon: string }[] = [
  { name: "snippet", icon: "Code" },
  { name: "prompt", icon: "Sparkles" },
  { name: "command", icon: "Terminal" },
  { name: "note", icon: "StickyNote" },
  { name: "link", icon: "Link" },
];

/**
 * One chip per type (snippet, prompt, command, note, link), each opening the
 * new-item dialog already set to that type.
 */
export default function QuickCreate({ isPro }: { isPro?: boolean }) {
  const [type, setType] = useState<ItemTypeName | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-up" style={{ animationDelay: "140ms" }}>
      {TYPES.map(({ name, icon }) => {
        const color = readableColor(ITEM_TYPE_COLORS[name]);
        return (
          <button
            key={name}
            type="button"
            onClick={() => setType(name)}
            className="term-btn term-chip inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] capitalize"
            style={
              {
                "--chip-bg": typeChipBackground(ITEM_TYPE_COLORS[name]),
                "--chip-bg-hover": typeChipBackground(ITEM_TYPE_COLORS[name], 26),
              } as React.CSSProperties
            }
          >
            <ItemTypeIcon icon={icon} className="h-3.5 w-3.5" style={{ color }} />
            {name}
          </button>
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
