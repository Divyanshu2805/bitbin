"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink, MoreHorizontal, PanelRightOpen, Pin, Star, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import DeleteItemDialog from "@/components/items/delete-item-dialog";
import { AddToCollectionMenu } from "@/components/items/add-to-collection-menu";
import { RemoveFromCollectionItem } from "@/components/collections/current-collection";
import { useClipboard } from "@/hooks/use-clipboard";
import { deleteItem, toggleItemFavorite, toggleItemPin } from "@/actions/items";
import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";

/**
 * An item's ⋯ menu on its own, for list rows: open, visit, copy, favorite,
 * pin, add to (or, on a collection's page, remove from) a collection and delete. (Cards build theirs into the hover
 * toolbar, sharing its optimistic favorite / pin state.) Clicks and keys stop
 * here, so they never also open the row.
 */
export function ItemActionsMenu({ item, className }: { item: ItemWithType; className?: string }) {
  const router = useRouter();
  const { openDrawer } = useItemDrawer();
  const { copy } = useClipboard();
  const [open, setOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const copyable = item.content || item.url;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const toggleFavorite = async () => {
    const result = await toggleItemFavorite(item.id);
    if (result.success && result.data) {
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update favorite");
    }
  };

  const togglePin = async () => {
    const result = await toggleItemPin(item.id);
    if (result.success && result.data) {
      toast.success(result.data.isPinned ? "Item pinned" : "Item unpinned");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update pin");
    }
  };

  const handleDelete = async () => {
    const result = await deleteItem(item.id);
    if (result.success) {
      toast.success("Item deleted");
      setShowDelete(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete item");
    }
  };

  return (
    <span onClick={stop} onKeyDown={stop} className="contents">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            title="More actions"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-[opacity,color,background-color]",
              "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
              "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100",
              open && "opacity-100",
              className
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        {/* The menu is portalled, but React events still bubble to the row */}
        <DropdownMenuContent align="end" className="w-48" onClick={stop}>
          <DropdownMenuItem onSelect={() => openDrawer(item.id)}>
            <PanelRightOpen />
            Open
            <DropdownMenuShortcut>↵</DropdownMenuShortcut>
          </DropdownMenuItem>
          {item.url && (
            <DropdownMenuItem asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Visit link
              </a>
            </DropdownMenuItem>
          )}
          {copyable && (
            <DropdownMenuItem onSelect={() => copy(copyable)}>
              <Copy />
              Copy {item.url && !item.content ? "URL" : "content"}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={toggleFavorite}>
            <Star />
            {item.isFavorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={togglePin}>
            <Pin />
            {item.isPinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <AddToCollectionMenu itemId={item.id} />
          <RemoveFromCollectionItem itemId={item.id} />
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setShowDelete(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteItemDialog open={showDelete} onOpenChange={setShowDelete} itemTitle={item.title} onConfirm={handleDelete} />
    </span>
  );
}
