"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Pin, Copy, Check, MoreHorizontal, PanelRightOpen, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor } from "@/lib/utils/color";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import { formatRelativeDate } from "@/lib/utils/date";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import DeleteItemDialog from "@/components/items/delete-item-dialog";
import { useClipboard } from "@/hooks/use-clipboard";
import { deleteItem, toggleItemFavorite, toggleItemPin } from "@/actions/items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemWithType } from "@/lib/db/items";
import { AddToCollectionMenu } from "@/components/items/add-to-collection-menu";
import { RemoveFromCollectionItem } from "@/components/collections/current-collection";
import { itemDragProps } from "@/components/items/item-drag";

interface ItemCardProps {
  item: ItemWithType;
}

const PREVIEW_LINES = 4;

/** The first few non-blank lines of an item's content, with their real line numbers, and how many are left. */
function previewLines(content: string) {
  const lines = content
    .replace(/\t/g, "  ")
    .split("\n")
    .map((text, i) => ({ text, number: i + 1 }))
    .filter((line) => line.text.trim() !== "");
  return { shown: lines.slice(0, PREVIEW_LINES), hidden: Math.max(0, lines.length - PREVIEW_LINES) };
}

/**
 * The code-ish preview under the title: snippets get a line-number gutter,
 * commands a `$` prompt, links their URL. Prompts and notes show a four-line
 * excerpt of their text.
 */
function ContentPreview({ item }: { item: ItemWithType }) {
  const type = item.itemType.name;

  if (type === "link" && item.url) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px] text-tok-path">
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
        <span className="truncate">{item.url.replace(/^https?:\/\//, "")}</span>
      </p>
    );
  }

  if ((type === "snippet" || type === "command") && item.content) {
    const { shown, hidden } = previewLines(item.content);
    if (shown.length === 0) return null;
    return (
      <div className="relative overflow-hidden rounded-lg border border-border bg-background font-mono text-[12.5px] leading-[1.7] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)]">
        {/* A thin gutter rule in the type's colour, like an active editor pane */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[2px] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
          style={{ backgroundColor: "var(--accent-color)" }}
        />
        <div className="py-2">
          {shown.map((line) => (
            <div key={line.number} className="flex whitespace-pre pr-3">
              <span className="w-9 shrink-0 select-none pr-3 text-right tabular-nums text-faint dark:text-muted-foreground/60">
                {type === "command" ? <span className="text-lime">$</span> : line.number}
              </span>
              <span className="min-w-0 truncate text-foreground">{line.text}</span>
            </div>
          ))}
        </div>
        {hidden > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-9 items-end justify-end bg-gradient-to-t from-background via-background/80 to-transparent px-2 pb-1.5">
            <span className="rounded border border-border bg-card px-1.5 text-[10px] leading-4 text-muted-foreground">
              +{hidden} {hidden === 1 ? "line" : "lines"}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Prose: an excerpt in a quiet block, like a quote from the item
  if ((type === "prompt" || type === "note") && item.content) {
    return (
      <div
        className="rounded-lg border border-border bg-background px-3 py-2.5"
        style={{ boxShadow: "inset 2px 0 0 0 var(--accent-color)" }}
      >
        {/* Clamped inside the padding, so no half line peeks out under the "…" */}
        <p className="line-clamp-4 text-[13px] leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
          {item.content}
        </p>
      </div>
    );
  }

  return null;
}

/** A small square icon button for the card's hover toolbar. */
function ToolbarButton({
  label,
  active,
  tone,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  label: string;
  active?: boolean;
  /** The colour it lights up in on hover (copy lime, star amber, pin red); neutral without one */
  tone?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50",
        tone
          ? "hover:bg-[color-mix(in_srgb,var(--tone)_14%,transparent)] hover:text-(--tone)"
          : "hover:bg-muted hover:text-foreground",
        className
      )}
      style={tone ? ({ "--tone": tone, ...style } as React.CSSProperties) : style}
      {...props}
    >
      {children}
    </button>
  );
}

export default function ItemCard({ item }: ItemCardProps) {
  const router = useRouter();
  const { openDrawer } = useItemDrawer();
  const { copied, copy } = useClipboard();
  const [, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [state, setOptimistic] = useOptimistic(
    { isFavorite: item.isFavorite, isPinned: item.isPinned },
    (current, patch: Partial<{ isFavorite: boolean; isPinned: boolean }>) => ({ ...current, ...patch })
  );

  const color = readableColor(item.itemType.color);
  const copyable = item.content || item.url;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const handleCopy = () => {
    if (copyable) copy(copyable);
  };

  const handleToggleFavorite = () => {
    startTransition(async () => {
      setOptimistic({ isFavorite: !state.isFavorite });
      const result = await toggleItemFavorite(item.id);
      if (result.success && result.data) {
        toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update favorite");
      }
    });
  };

  const handleTogglePin = () => {
    startTransition(async () => {
      setOptimistic({ isPinned: !state.isPinned });
      const result = await toggleItemPin(item.id);
      if (result.success && result.data) {
        toast.success(result.data.isPinned ? "Item pinned" : "Item unpinned");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update pin");
      }
    });
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
    <>
      <div
        // Mouse users click anywhere on the card; keyboard and screen-reader users get the title button below
        className={cn(
          "card-lift card-glow icon-anim-off group relative flex min-h-60 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-soft)] outline-none has-[[data-card-open]:focus-visible]:ring-2 has-[[data-card-open]:focus-visible]:ring-ring/60",
          "border-[color-mix(in_srgb,var(--accent-color)_22%,var(--border))]",
          menuOpen && "card-glow-active"
        )}
        // The app's lime for the card itself; only the type chip wears the type's colour
        style={{ "--accent-color": "var(--brand-lime)" } as React.CSSProperties}
        // Drag onto a collection (sidebar or collection card) to add it there
        {...itemDragProps(item.id, item.title, item.itemType.name, color)}
        onClick={() => openDrawer(item.id)}
      >
        {/* Lime: a rule along the top edge and a soft wash behind the header */}
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

        {/* Header: type chip on the left; date, or the toolbar on hover, on the right */}
        <div className="relative flex h-11 items-center gap-2 px-4 pt-1">
          <span
            className="flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 28%, transparent)`,
              color,
            }}
          >
            <ItemTypeIcon
              icon={item.itemType.icon}
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
            />
            {item.itemType.name}
          </span>
          {state.isPinned && <Pin className="h-3 w-3 fill-destructive/30 text-destructive" aria-label="Pinned" />}
          {state.isFavorite && (
            <Star className="h-3 w-3 fill-amber-400 text-amber-500 dark:text-amber-400" aria-label="Favorite" />
          )}

          <div className="relative ml-auto flex items-center">
            <span
              className={cn(
                // Hidden at once on hover, so it never shows through the toolbar fading in
                "font-mono text-[11px] text-muted-foreground",
                "group-hover:invisible group-focus-within:invisible max-md:hidden",
                menuOpen && "invisible"
              )}
            >
              {formatRelativeDate(item.updatedAt)}
            </span>

            <div
              onClick={stop}
              onKeyDown={stop}
              className={cn(
                "absolute right-0 flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm transition-all duration-200",
                "pointer-events-none translate-y-1 opacity-0",
                "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100",
                "group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100",
                "max-md:pointer-events-auto max-md:static max-md:translate-y-0 max-md:border-transparent max-md:bg-transparent max-md:opacity-100 max-md:shadow-none",
                menuOpen && "pointer-events-auto translate-y-0 opacity-100"
              )}
            >
              {copyable && (
                <ToolbarButton label={copied ? "Copied" : "Copy content"} tone="var(--brand-lime)" onClick={handleCopy} className={cn(copied && "text-lime")}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </ToolbarButton>
              )}
              <ToolbarButton
                label={state.isFavorite ? "Remove from favorites" : "Add to favorites"}
                active={state.isFavorite}
                tone="light-dark(#d97706, #fbbf24)"
                onClick={handleToggleFavorite}
                className={cn(state.isFavorite && "text-amber-500 dark:text-amber-400")}
              >
                <Star className={cn("h-3.5 w-3.5", state.isFavorite && "fill-current")} />
              </ToolbarButton>
              <ToolbarButton
                label={state.isPinned ? "Unpin" : "Pin"}
                active={state.isPinned}
                tone="var(--destructive)"
                onClick={handleTogglePin}
                className={cn(state.isPinned && "text-destructive")}
              >
                <Pin className={cn("h-3.5 w-3.5", state.isPinned && "fill-current")} />
              </ToolbarButton>

              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <ToolbarButton label="More actions">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </ToolbarButton>
                </DropdownMenuTrigger>
                {/* The menu is portalled, but React events still bubble to the card */}
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
                    <DropdownMenuItem onSelect={handleCopy}>
                      <Copy />
                      Copy {item.url && !item.content ? "URL" : "content"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleToggleFavorite}>
                    <Star />
                    {state.isFavorite ? "Unfavorite" : "Favorite"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleTogglePin}>
                    <Pin />
                    {state.isPinned ? "Unpin" : "Pin to top"}
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
            </div>
          </div>
        </div>

        <div className="relative px-4 pt-1">
          <h3 className="font-sans text-base font-semibold tracking-tight text-foreground">
            <button
              type="button"
              data-card-open
              className="block w-full cursor-pointer truncate text-left outline-none"
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(item.id);
              }}
            >
              {item.title}
            </button>
          </h3>
          {item.description && (
            <p className="text-desc mt-1 line-clamp-2 text-sm leading-snug [overflow-wrap:anywhere]">{item.description}</p>
          )}
        </div>

        <div className="relative px-4 pt-3 empty:hidden">
          <ContentPreview item={item} />
        </div>

        {/* Footer: tags as chips, the date on phones (where the header shows the toolbar) */}
        <div
          className={cn(
            "relative mt-auto flex items-center gap-2 px-4 pt-3 pb-3.5",
            item.tags.length > 0 ? "min-h-12" : "md:pt-0 md:pb-4"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 font-mono text-[11px] text-muted-foreground">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-foreground/80 transition-colors group-hover:border-[color-mix(in_srgb,var(--accent-color)_35%,var(--border))]"
              >
                <span className="text-faint dark:text-muted-foreground/50">#</span>
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="px-1 py-0.5 text-faint dark:text-muted-foreground/50">+{item.tags.length - 3}</span>
            )}
          </div>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground md:hidden">
            {formatRelativeDate(item.updatedAt)}
          </span>
        </div>
      </div>

      <DeleteItemDialog open={showDelete} onOpenChange={setShowDelete} itemTitle={item.title} onConfirm={handleDelete} />
    </>
  );
}
