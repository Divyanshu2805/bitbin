"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, MoreHorizontal, Pencil, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditCollectionDialog from "@/components/collections/edit-collection-dialog";
import DeleteCollectionDialog from "@/components/collections/delete-collection-dialog";
import { deleteCollection, toggleCollectionFavorite } from "@/actions/collections";
import { toast } from "sonner";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import type { CollectionItemType } from "@/lib/db/collections";

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
    itemCount: number;
    itemTypes: CollectionItemType[];
    dominantColor: string | null;
  };
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const accent = collection.dominantColor || "#6b7280";

  const handleCardClick = () => {
    router.push(`/collections/${collection.id}`);
  };

  const handleToggleFavorite = async () => {
    const result = await toggleCollectionFavorite(collection.id);

    if (result.success && result.data) {
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update favorite");
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
    <>
      <div
        role="link"
        tabIndex={0}
        className="card-lift group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        style={{ "--accent-color": accent } as React.CSSProperties}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && e.key === "Enter") handleCardClick();
        }}
      >
        {/* folder tab */}
        <span
          className="absolute left-4 top-0 h-1 w-10 rounded-b-md transition-all duration-300 group-hover:w-16"
          style={{ backgroundColor: accent }}
        />

        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
            >
              <Folder className="h-4 w-4" />
            </div>
            <h3 className="truncate font-sans text-[15px] font-semibold tracking-normal text-foreground">
              {collection.name}
            </h3>
            {collection.isFavorite && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 -mt-1 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
                aria-label="Collection actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleFavorite}>
                <Star className="h-4 w-4" />
                {collection.isFavorite ? "Unfavorite" : "Favorite"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {collection.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-snug text-muted-foreground">
            {collection.description}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-muted-foreground/50">No description</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
          </span>
          {collection.itemTypes.length > 0 && (
            <div className="flex items-center -space-x-1">
              {collection.itemTypes.map((itemType) => {
                const IconComponent = getItemTypeIcon(itemType.icon);
                return (
                  <span
                    key={itemType.name}
                    title={itemType.name}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted"
                  >
                    <IconComponent
                      className="h-3 w-3"
                      style={{ color: itemType.color }}
                    />
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <EditCollectionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        collection={collection}
      />

      <DeleteCollectionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        collectionName={collection.name}
        onConfirm={handleDelete}
      />
    </>
  );
}
