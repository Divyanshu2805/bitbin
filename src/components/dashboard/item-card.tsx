"use client";

import { Button } from '@/components/ui/button';
import { Star, Pin, Copy, Check } from 'lucide-react';
import { ItemTypeIcon } from '@/components/shared/item-type-icon';
import { formatRelativeDate } from '@/lib/utils/date';
import { useItemDrawer } from '@/components/items/item-drawer-provider';
import { useState } from 'react';
import type { ItemWithType } from '@/lib/db/items';

interface ItemCardProps {
  item: ItemWithType;
}

export default function ItemCard({ item }: ItemCardProps) {
  const { openDrawer } = useItemDrawer();
  const [copied, setCopied] = useState(false);
  const iconColor = item.itemType.color;

  // Determine if item has copyable content
  const copyableContent = item.content || item.url;
  const canCopy = !!copyableContent;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!copyableContent) return;

    try {
      await navigator.clipboard.writeText(copyableContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="card-lift group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      style={{ '--accent-color': iconColor } as React.CSSProperties}
      onClick={() => openDrawer(item.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrawer(item.id);
        }
      }}
    >
      {/* type accent strip */}
      <span
        className="absolute inset-x-0 top-0 h-[2px] opacity-70 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${iconColor}, transparent 80%)` }}
      />

      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:-rotate-6"
          style={{ backgroundColor: `${iconColor}1f`, color: iconColor }}
        >
          <ItemTypeIcon icon={item.itemType.icon} className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-sans text-[15px] font-semibold tracking-normal text-foreground">
              {item.title}
            </h3>
            {item.isFavorite && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
            {item.isPinned && (
              <Pin className="h-3.5 w-3.5 shrink-0 text-lime" />
            )}
          </div>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
              {item.description}
            </p>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground/50">No description</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex min-h-7 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="px-1 py-0.5 font-mono text-[11px] text-muted-foreground/60">
              +{item.tags.length - 3}
            </span>
          )}
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
          {formatRelativeDate(item.updatedAt)}
        </span>
        {canCopy && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
            onClick={handleCopy}
            aria-label="Copy content"
          >
            {copied ? (
              <Check className="h-4 w-4 text-lime" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
