"use client";

import { Pin, Star } from "lucide-react";
import { readableColor } from "@/lib/utils/color";
import { itemDragProps } from "./item-drag";
import { ItemActionsMenu } from "./item-actions-menu";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import { formatRelativeDate } from "@/lib/utils/date";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import type { ItemWithType } from "@/lib/db/items";

/**
 * One item as a row in the list view: type icon, title (with pin and star),
 * tags, when it last changed and a ⋯ menu. No description or content. A bar in
 * the type's colour slides in on hover. Opens the drawer. Sits inside a
 * `divide-y` list (see ItemsView in shared/list-views).
 */
export default function ItemRow({ item }: { item: ItemWithType }) {
  const { openDrawer } = useItemDrawer();
  const color = readableColor(item.itemType.color);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title}`}
      {...itemDragProps(item.id, item.title, item.itemType.name, color)}
      onClick={() => openDrawer(item.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDrawer(item.id);
        }
      }}
      className="icon-anim-off group relative flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-lime/[0.05] focus-visible:bg-muted/50"
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-[2px] origin-center scale-y-0 rounded-r-full bg-lime transition-transform duration-300 group-hover:scale-y-100 group-focus-visible:scale-y-100"
      />
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform duration-300 group-hover:-rotate-6"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`, color }}
      >
        <ItemTypeIcon icon={item.itemType.icon} className="h-3.5 w-3.5" />
      </span>

      <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
        {item.isPinned && <Pin className="h-3 w-3 shrink-0 self-center text-destructive" aria-label="Pinned" />}
        {item.isFavorite && (
          <Star className="h-3 w-3 shrink-0 self-center fill-amber-400 text-amber-500 dark:text-amber-400" aria-label="Favorite" />
        )}
      </span>

      {item.tags.length > 0 && (
        <span className="hidden shrink-0 gap-2 font-mono text-[11px] text-muted-foreground md:flex">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag}>
              <span className="text-muted-foreground/50">#</span>
              {tag}
            </span>
          ))}
        </span>
      )}
      <span className="w-[4.5rem] shrink-0 text-right font-mono text-[11px] text-muted-foreground" title="Last edited">
        {formatRelativeDate(item.updatedAt)}
      </span>
      <ItemActionsMenu item={item} />
    </div>
  );
}
