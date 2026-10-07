"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Folder, FolderOpen, LayoutGrid, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor } from "@/lib/utils/color";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { TYPE_SHORTCUTS, goKeys } from "@/lib/constants/shortcuts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/shared/kbd";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";
import { useCollectionDrop } from "@/components/items/item-drag";

interface SidebarNavProps {
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  onLinkClick?: () => void;
}

const OVERVIEW_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/collections", label: "Collections", icon: FolderOpen },
];

/**
 * Two pills that glide between rows: one follows the pointer, one sits under the
 * current page and slides there when you navigate. Positions are written as CSS
 * variables straight to the DOM (see `.sidebar-pill` in globals.css).
 */
function useSlidingPills(pathname: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const hover = root.querySelector<HTMLElement>('[data-pill="hover"]');
    const active = root.querySelector<HTMLElement>('[data-pill="active"]');
    if (!hover || !active) return;

    const place = (pill: HTMLElement, row: Element) => {
      const box = root.getBoundingClientRect();
      const rect = row.getBoundingClientRect();
      pill.style.setProperty("--y", `${rect.top - box.top}px`);
      pill.style.setProperty("--h", `${rect.height}px`);
    };

    // A row inside a folded block (collapsed collections, the icon rail) is hidden
    const visible = (row: Element) => {
      const fold = row.parentElement?.closest(".sidebar-fold");
      return !fold || fold.getBoundingClientRect().height >= row.getBoundingClientRect().height;
    };

    const placeActive = () => {
      const row = root.querySelector('.sidebar-row[aria-current="page"]');
      if (row && visible(row)) {
        place(active, row);
        active.style.opacity = "1";
      } else {
        active.style.opacity = "0";
      }
    };

    placeActive();
    const frame = requestAnimationFrame(() => {
      active.setAttribute("data-ready", "");
      hover.setAttribute("data-ready", "");
    });
    // Folds opening and closing move rows around; keep the active pill on its row
    const resize = new ResizeObserver(placeActive);
    resize.observe(root);

    const onOver = (event: PointerEvent) => {
      const row = (event.target as Element).closest(".sidebar-row");
      if (!row || !root.contains(row)) return;
      place(hover, row);
      hover.setAttribute("data-on", "");
    };
    const onLeave = () => hover.removeAttribute("data-on");
    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [pathname]);

  return ref;
}

/** `// types`: a code-comment section label. Folds away on the icon rail. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    // Fades on the rail but keeps its height, so the icons below never move up or down
    <h3 className="sidebar-label mb-1 whitespace-nowrap px-2.5 font-mono text-[11.5px] font-normal text-muted-foreground">
      <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>
      {children}
    </h3>
  );
}

interface NavLinkProps {
  href: string;
  isActive: boolean;
  label: string;
  keys?: string[];
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * A sidebar row. The pills behind it do the highlighting; on the icon rail the
 * label fades out and a tooltip carries the name and shortcut instead.
 */
function NavLink({ href, isActive, label, keys, onClick, children }: NavLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          onClick={onClick}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "sidebar-row group relative flex h-8 items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-2.5 text-[13.5px] outline-none transition-colors duration-200",
            "text-foreground/80 hover:text-foreground focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-lime/40",
            isActive && "font-medium text-foreground"
          )}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={12}
        className="flex items-center gap-2.5 [html:not([data-sidebar=collapsed])_&]:hidden"
      >
        {label}
        {keys && <Kbd keys={keys} />}
      </TooltipContent>
    </Tooltip>
  );
}

/** The right end of a row: its count, which gives way to its shortcut on hover. */
function RowEnd({ count, keys, active }: { count?: number; keys?: string[]; active?: boolean }) {
  if (count === undefined && !keys) return null;
  return (
    <span className="sidebar-label relative ml-auto flex items-center pl-2">
      {count !== undefined && (
        <span className={cn("row-count font-mono text-xs tabular-nums text-muted-foreground", active && "text-lime")}>
          {count}
        </span>
      )}
      {keys && <Kbd keys={keys} className={cn("row-kbd", count !== undefined && "absolute right-0")} />}
    </span>
  );
}

/** A sidebar collection that takes a dragged item (see components/items/item-drag.ts). */
function CollectionDrop({ id, name, children }: { id: string; name: string; children: React.ReactNode }) {
  const drop = useCollectionDrop(id, name);
  return (
    <div className="rounded-lg" {...drop}>
      {children}
    </div>
  );
}

export default function SidebarNav({ itemTypes, sidebarCollections, onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const ref = useSlidingPills(pathname);
  const hasCollections = sidebarCollections.favorites.length + sidebarCollections.recents.length > 0;

  return (
    <div ref={ref} className="relative space-y-5">
      <span aria-hidden data-pill="hover" className="sidebar-pill" />
      <span aria-hidden data-pill="active" className="sidebar-pill" />

      {/* Overview */}
      <div className="space-y-0.5">
        <SectionLabel>overview</SectionLabel>
        {OVERVIEW_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          const keys = goKeys(href);
          return (
            <NavLink key={href} href={href} isActive={isActive} label={label} keys={keys} onClick={onLinkClick}>
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-lime")} />
              <span className="sidebar-label min-w-0 truncate">{label}</span>
              <RowEnd keys={keys} />
            </NavLink>
          );
        })}
      </div>

      {/* Types */}
      <div className="space-y-0.5">
        <SectionLabel>types</SectionLabel>
        {itemTypes.map((type) => {
          const Icon = getItemTypeIcon(type.icon);
          const href = `/items/${type.name}s`;
          const isActive = pathname === href;
          const isProType = type.name === "file" || type.name === "image";
          const digit = TYPE_SHORTCUTS[type.name];
          const keys = digit ? [digit] : undefined;
          const label = `${type.name.charAt(0).toUpperCase()}${type.name.slice(1)}s`;

          return (
            <NavLink key={type.name} href={href} isActive={isActive} label={label} keys={keys} onClick={onLinkClick}>
              <Icon className="h-4 w-4 shrink-0" style={{ color: readableColor(type.color) }} />
              <span className="sidebar-label min-w-0 truncate">{label}</span>
              {isProType && (
                <span className="sidebar-label rounded-sm border border-coral/35 px-1 font-mono text-[9px] uppercase tracking-wide text-coral">
                  pro
                </span>
              )}
              <RowEnd count={type.count} keys={keys} active={isActive} />
            </NavLink>
          );
        })}
      </div>

      {/* Collections: the whole block folds away on the rail; its list folds on its own */}
      <div className="sidebar-fold">
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setCollectionsExpanded((v) => !v)}
            className="mb-1 flex w-full items-center gap-1 rounded px-2.5 font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={collectionsExpanded}
          >
            <span className="text-faint dark:text-muted-foreground/50">{"//"}</span> collections
            <ChevronRight
              className={cn(
                "ml-auto h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                collectionsExpanded && "rotate-90"
              )}
            />
          </button>

          <div className="sidebar-fold" data-open={collectionsExpanded}>
            <div className="space-y-0.5">
              {sidebarCollections.favorites.map((collection) => {
                const href = `/collections/${collection.id}`;
                const isActive = pathname === href;
                return (
                  <CollectionDrop key={collection.id} id={collection.id} name={collection.name}>
                  <NavLink href={href} isActive={isActive} label={collection.name} onClick={onLinkClick}>
                    {/* A folder like the rest, with a small star after the name to mark it a favorite */}
                    {isActive ? (
                      <FolderOpen className="h-4 w-4 shrink-0" style={{ color: readableColor(collection.dominantColor || "#6b7280") }} />
                    ) : (
                      <Folder className="h-4 w-4 shrink-0" style={{ color: readableColor(collection.dominantColor || "#6b7280") }} />
                    )}
                    <span className="sidebar-label flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate">{collection.name}</span>
                      <Star aria-label="Favorite" className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500 dark:text-amber-400" />
                    </span>
                    <RowEnd count={collection.itemCount} active={isActive} />
                  </NavLink>
                  </CollectionDrop>
                );
              })}

              {sidebarCollections.recents.map((collection) => {
                const href = `/collections/${collection.id}`;
                const isActive = pathname === href;
                return (
                  <CollectionDrop key={collection.id} id={collection.id} name={collection.name}>
                  <NavLink href={href} isActive={isActive} label={collection.name} onClick={onLinkClick}>
                    {/* A folder in the collection's colour, open while you're in it */}
                    {isActive ? (
                      <FolderOpen className="h-4 w-4 shrink-0" style={{ color: readableColor(collection.dominantColor || "#6b7280") }} />
                    ) : (
                      <Folder className="h-4 w-4 shrink-0" style={{ color: readableColor(collection.dominantColor || "#6b7280") }} />
                    )}
                    <span className="sidebar-label min-w-0 flex-1 truncate">{collection.name}</span>
                    <RowEnd count={collection.itemCount} active={isActive} />
                  </NavLink>
                  </CollectionDrop>
                );
              })}

              {!hasCollections && (
                <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">
                  No collections yet. Press <span className="kbd">C</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
