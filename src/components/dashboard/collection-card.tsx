"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Pin, Folder, FolderOpen } from "lucide-react";
import { toggleCollectionFavorite, toggleCollectionPin } from "@/actions/collections";
import { formatRelativeDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { CollectionActionsMenu } from "@/components/collections/collection-actions-menu";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import type { CollectionItemType } from "@/lib/db/collections";
import { useCollectionDrop } from "@/components/items/item-drag";
import { readableColor } from "@/lib/utils/color";

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    isFavorite: boolean;
    isPinned: boolean;
    itemCount: number;
    itemTypes: CollectionItemType[];
    dominantColor: string | null;
    updatedAt: Date;
  };
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const router = useRouter();
  const drop = useCollectionDrop(collection.id, collection.name);
  const typeTotal = collection.itemTypes.reduce((sum, t) => sum + t.count, 0);

  const [isFavorite, setIsFavorite] = useState(collection.isFavorite);

  const handleCardClick = () => {
    router.push(`/collections/${collection.id}`);
  };

  // The toolbar's star: flips at once, then settles on what the server says
  const toggleFavorite = async () => {
    setIsFavorite((v) => !v);
    const result = await toggleCollectionFavorite(collection.id);
    if (result.success && result.data) {
      setIsFavorite(result.data.isFavorite);
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    } else {
      setIsFavorite(collection.isFavorite);
      toast.error(result.error || "Failed to update favorite");
    }
  };

  // The toolbar's pin, the same way; the refresh moves the card to (or from) the top
  const [isPinned, setIsPinned] = useState(collection.isPinned);
  const togglePin = async () => {
    setIsPinned((v) => !v);
    const result = await toggleCollectionPin(collection.id);
    if (result.success && result.data) {
      setIsPinned(result.data.isPinned);
      toast.success(result.data.isPinned ? "Collection pinned" : "Collection unpinned");
      router.refresh();
    } else {
      setIsPinned(collection.isPinned);
      toast.error(result.error || "Failed to update pin");
    }
  };

  return (
    <>
      <div
        // Mouse users click anywhere on the card; keyboard and screen-reader users get the name button below
        className="card-lift card-glow icon-anim-off group relative flex min-h-60 cursor-pointer flex-col overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--brand-lime)_22%,var(--border))] bg-card p-5 shadow-[var(--shadow-soft)] outline-none has-[[data-card-open]:focus-visible]:ring-2 has-[[data-card-open]:focus-visible]:ring-ring/60"
        style={{ "--accent-color": "var(--brand-lime)" } as React.CSSProperties}
        // Drop an item here to add it to this collection
        {...drop}
        onClick={handleCardClick}
      >
        {/* Lime, like an item card: a rule along the top edge and a soft wash behind the header */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "linear-gradient(90deg, var(--brand-lime), transparent 85%)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--brand-lime) 10%, transparent), transparent 70%)" }}
        />

        <div className="relative flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* The folder opens on hover */}
            <span
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: "color-mix(in srgb, var(--brand-lime) 13%, transparent)", color: "var(--brand-lime)" }}
            >
              <Folder className="h-4 w-4 transition-opacity duration-200 group-hover:opacity-0" />
              <FolderOpen className="absolute h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </span>
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 font-sans text-[15px] font-semibold tracking-normal text-foreground">
                <button
                  type="button"
                  data-card-open
                  className="min-w-0 cursor-pointer truncate text-left outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}
                >
                  {collection.name}
                </button>
                {isPinned && <Pin className="h-3 w-3 shrink-0 fill-destructive/30 text-destructive" aria-label="Pinned" />}
                {isFavorite && (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500 dark:text-amber-400" aria-label="Favorite" />
                )}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          {/* Last edited, or on hover a toolbar: favorite and the ⋯ menu (as on item cards) */}
          <div className="relative flex shrink-0 items-center">
            <span className="font-mono text-[11px] text-muted-foreground group-focus-within:invisible group-hover:invisible max-md:hidden">
              {formatRelativeDate(collection.updatedAt)}
            </span>
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn(
                "absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm transition-all duration-200",
                "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
                "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                "max-md:pointer-events-auto max-md:static max-md:translate-y-0 max-md:border-transparent max-md:bg-transparent max-md:opacity-100 max-md:shadow-none"
              )}
            >
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                // Lights up amber on hover
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors hover:bg-amber-500/15 hover:text-amber-600 focus-visible:ring-2 focus-visible:ring-ring/60 dark:hover:bg-amber-400/15 dark:hover:text-amber-400",
                  isFavorite ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"
                )}
              >
                <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
              </button>
              <button
                type="button"
                onClick={togglePin}
                aria-pressed={isPinned}
                aria-label={isPinned ? "Unpin" : "Pin to top"}
                title={isPinned ? "Unpin" : "Pin to top"}
                // Lights up red on hover
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors hover:bg-destructive/12 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/60",
                  isPinned ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current")} />
              </button>
              <CollectionActionsMenu collection={{ ...collection, isFavorite, isPinned }} className="opacity-100" />
            </div>
          </div>
        </div>

        {collection.description ? (
          <p className="text-desc relative mt-3 line-clamp-2 text-sm leading-snug [overflow-wrap:anywhere]">
            {collection.description}
          </p>
        ) : (
          <p className="mt-3 font-mono text-xs text-muted-foreground/50">{"// no description"}</p>
        )}

        {/* What's inside, by type: a thin stacked bar and the type icons */}
        <div className="mt-auto pt-4">
          <div
            className="flex h-1 gap-[2px] overflow-hidden rounded-full bg-foreground/[0.06]"
            role="img"
            aria-label={
              collection.itemTypes.map((t) => `${t.count} ${t.name}${t.count === 1 ? "" : "s"}`).join(", ") ||
              "Empty"
            }
          >
            {typeTotal > 0 &&
              collection.itemTypes.map((itemType) => (
                <span
                  key={itemType.name}
                  className="h-full"
                  style={{ width: `${(itemType.count / typeTotal) * 100}%`, backgroundColor: itemType.color }}
                />
              ))}
          </div>
          {collection.itemTypes.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
              {collection.itemTypes.map((itemType) => (
                <span key={itemType.name} className="flex items-center gap-1" title={`${itemType.count} ${itemType.name}s`}>
                  <ItemTypeIcon icon={itemType.icon} className="h-3 w-3" style={{ color: readableColor(itemType.color) }} />
                  <span className="tabular-nums">{itemType.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

    </>
  );
}
