"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Pin, Star, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditCollectionDialog from "@/components/collections/edit-collection-dialog";
import DeleteCollectionDialog from "@/components/collections/delete-collection-dialog";
import { deleteCollection, toggleCollectionFavorite, toggleCollectionPin } from "@/actions/collections";
import { cn } from "@/lib/utils";

interface CollectionActionsMenuProps {
  collection: { id: string; name: string; description: string | null; isFavorite: boolean; isPinned: boolean };
  className?: string;
}

/**
 * A collection's ⋯ menu (edit, favorite, pin, delete) with its dialogs, shared by
 * collection cards and list rows. Shown on hover (always on phones). Clicks
 * and keys stop here, so they never also open the collection.
 */
export function CollectionActionsMenu({ collection, className }: CollectionActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const toggleFavorite = async () => {
    const result = await toggleCollectionFavorite(collection.id);
    if (result.success && result.data) {
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update favorite");
    }
  };

  const togglePin = async () => {
    const result = await toggleCollectionPin(collection.id);
    if (result.success && result.data) {
      toast.success(result.data.isPinned ? "Collection pinned" : "Collection unpinned");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update pin");
    }
  };

  const handleDelete = async () => {
    const result = await deleteCollection({ id: collection.id });
    if (result.success) {
      toast.success("Collection deleted successfully");
      setDeleteOpen(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete collection");
    }
  };

  return (
    <span onClick={stop} onKeyDown={stop} className="contents">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Collection actions"
            title="Collection actions"
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
        {/* The menu is portalled, but React events still bubble to the card or row */}
        <DropdownMenuContent align="end" onClick={stop}>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleFavorite}>
            <Star className="h-4 w-4" />
            {collection.isFavorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={togglePin}>
            <Pin className="h-4 w-4" />
            {collection.isPinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionDialog open={editOpen} onOpenChange={setEditOpen} collection={collection} />
      <DeleteCollectionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        collectionName={collection.name}
        onConfirm={handleDelete}
      />
    </span>
  );
}
