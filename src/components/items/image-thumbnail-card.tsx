"use client";

import Image from 'next/image';
import { fileViewPath } from '@/lib/file-url';
import { Star, Pin, ImageOff } from 'lucide-react';
import { useItemDrawer } from '@/components/items/item-drawer-provider';
import { formatRelativeDate } from '@/lib/utils/date';
import type { ItemWithType } from '@/lib/db/items';
import { itemDragProps } from './item-drag';
import { ItemActionsMenu } from './item-actions-menu';
import { readableColor } from '@/lib/utils/color';

interface ImageThumbnailCardProps {
  item: ItemWithType;
}

/** An image item: the picture, zooming slightly on hover, over a one-line caption. */
export default function ImageThumbnailCard({ item }: ImageThumbnailCardProps) {
  const { openDrawer } = useItemDrawer();

  return (
    // A div, not a button: the ⋯ menu inside it is a button, and buttons can't nest
    <div
      role="button"
      tabIndex={0}
      {...itemDragProps(item.id, item.title, item.itemType.name, readableColor(item.itemType.color))}
      onClick={() => openDrawer(item.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrawer(item.id);
        }
      }}
      aria-label={`Open ${item.title}`}
      // The same card as every other item, in the image type's colour
      className="card-ink group relative flex cursor-pointer flex-col overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      style={{ '--tone': readableColor(item.itemType.color) } as React.CSSProperties}
    >
      <div className="relative aspect-video overflow-hidden bg-[repeating-conic-gradient(var(--muted)_0_25%,var(--card)_0_50%)] bg-[length:16px_16px]">
        {fileViewPath(item.fileUrl) ? (
          <Image
            src={fileViewPath(item.fileUrl)!}
            alt={item.title}
            unoptimized
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
        {/* Open, copy, favorite, pin, add to a collection, delete: the same menu as every other item */}
        <div className="absolute right-2 top-2 z-10">
          <ItemActionsMenu item={item} className="bg-background" />
        </div>
        {item.fileName && (
          <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {item.fileName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 px-3.5 py-3">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.title}</h3>
        {item.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-destructive" aria-label="Pinned" />}
        {item.isFavorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500 dark:text-amber-400" aria-label="Favorite" />}
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatRelativeDate(item.updatedAt)}</span>
      </div>
    </div>
  );
}
