"use client";

import ItemCard from "@/components/dashboard/item-card";
import CollectionCard from "@/components/dashboard/collection-card";
import ImageThumbnailCard from "@/components/items/image-thumbnail-card";
import ItemRow from "@/components/items/item-row";
import FavoriteCollectionRow from "@/components/favorites/favorite-collection-row";
import { useViewMode } from "@/lib/view-mode";
import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";
import type { CollectionWithTypes } from "@/lib/db/collections";

// The grid and list layouts for items and collections, switched by the shared
// view mode (lib/view-mode). `data-view-content` lets globals.css hide the
// layout that doesn't match the saved choice until React renders it.

const LIST_FRAME = "divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/80";

/** Items as cards (images as thumbnails) or as rows: name, tags, last edited. */
export function ItemsView({ items, className }: { items: ItemWithType[]; className?: string }) {
  const mode = useViewMode();

  if (mode === "list") {
    return (
      <div data-view-content="list" className={cn(LIST_FRAME, "animate-fade-up", className)}>
        {/* Name, tags and last edited */}
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div data-view-content="grid" className={cn("grid gap-4 stagger md:grid-cols-2 xl:grid-cols-3", className)}>
      {items.map((item) =>
        item.itemType.name === "image" ? (
          <ImageThumbnailCard key={item.id} item={item} />
        ) : (
          <ItemCard key={item.id} item={item} />
        )
      )}
    </div>
  );
}

/** Collections as cards or as rows. */
export function CollectionsView({
  collections,
  className,
}: {
  collections: CollectionWithTypes[];
  className?: string;
}) {
  const mode = useViewMode();

  if (mode === "list") {
    return (
      <div data-view-content="list" className={cn(LIST_FRAME, "animate-fade-up", className)}>
        {collections.map((collection) => (
          <FavoriteCollectionRow key={collection.id} collection={collection} simple />
        ))}
      </div>
    );
  }

  return (
    <div data-view-content="grid" className={cn("grid gap-4 stagger md:grid-cols-2 lg:grid-cols-3", className)}>
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
