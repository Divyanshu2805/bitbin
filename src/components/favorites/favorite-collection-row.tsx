"use client";

import Link from "next/link";
import { Folder, FolderOpen, Pin } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils/date";
import { useCollectionDrop } from "@/components/items/item-drag";
import type { CollectionWithTypes } from "@/lib/db/collections";
import { CollectionActionsMenu } from "@/components/collections/collection-actions-menu";

interface FavoriteCollectionRowProps {
  collection: CollectionWithTypes;
  /** The list view: name and last edited, no item count */
  simple?: boolean;
}

export default function FavoriteCollectionRow({
  collection,
  simple = false,
}: FavoriteCollectionRowProps) {
  // Rows take a dragged item too, like collection cards
  const drop = useCollectionDrop(collection.id, collection.name);
  return (
    <div {...drop} className="group relative flex items-center pr-3 transition-colors hover:bg-lime/[0.05]">
    <Link
      href={`/collections/${collection.id}`}
      className="relative flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-2 pl-4 outline-none focus-visible:bg-muted/50"
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-[2px] scale-y-0 rounded-r-full bg-lime transition-transform duration-300 group-hover:scale-y-100"
      />
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lime/10 text-lime">
        <Folder className="h-3.5 w-3.5 transition-opacity group-hover:opacity-0" />
        <FolderOpen className="absolute h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="truncate">{collection.name}</span>
        {collection.isPinned && <Pin className="h-3 w-3 shrink-0 fill-destructive/30 text-destructive" aria-label="Pinned" />}
      </span>
      {!simple && (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
        </span>
      )}
      <span className="w-[4.5rem] shrink-0 text-right font-mono text-[11px] text-muted-foreground" title="Last edited">
        {formatRelativeDate(collection.updatedAt)}
      </span>
    </Link>
      {simple && <CollectionActionsMenu collection={collection} />}
    </div>
  );
}
