"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import NewItemDialog, { type ItemTypeName } from "./new-item-dialog";

const TYPE_ICON_NAMES: Record<string, string> = {
  snippet: "Code",
  prompt: "Sparkles",
  command: "Terminal",
  note: "StickyNote",
  file: "File",
  image: "Image",
  link: "Link",
};

interface ItemsPageHeaderProps {
  typeName: string;
  displayName: string;
  itemCount: number;
  isPro?: boolean;
}

export default function ItemsPageHeader({
  typeName,
  displayName,
  itemCount,
  isPro,
}: ItemsPageHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const color = ITEM_TYPE_COLORS[typeName as keyof typeof ITEM_TYPE_COLORS] ?? "#6b7280";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              color,
              backgroundColor: `${color}1a`,
              borderColor: `${color}40`,
            }}
          >
            <ItemTypeIcon icon={TYPE_ICON_NAMES[typeName] ?? "Code"} className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="font-mono text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="font-semibold">
          <Plus className="h-4 w-4" />
          New {typeName.charAt(0).toUpperCase() + typeName.slice(1)}
        </Button>
      </div>

      <NewItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={typeName as ItemTypeName}
        isPro={isPro}
      />
    </>
  );
}
