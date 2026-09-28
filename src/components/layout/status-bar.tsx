"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MAX_ITEMS } from "@/lib/constants/plan";
import { useSearch } from "@/components/search/search-provider";
import { SHORTCUTS_EVENT } from "@/components/layout/app-shortcuts";
import type { ItemTypeWithCount } from "@/lib/db/items";

interface StatusBarProps {
  itemTypes: ItemTypeWithCount[];
  isPro?: boolean;
}

/**
 * The strip along the bottom of the app window, like an editor's status bar:
 * where you are, what's in the bin, the plan, and the keys worth knowing.
 * Desktop only; phones have no room for it and no keyboard to hint at.
 */
export default function StatusBar({ itemTypes, isPro }: StatusBarProps) {
  const pathname = usePathname();
  const { openSearch } = useSearch();
  const itemCount = itemTypes.reduce((sum, type) => sum + type.count, 0);
  const nearlyFull = !isPro && itemCount >= MAX_ITEMS * 0.9;
  const path = pathname.replace(/^\/+/, "").replace(/\/[a-z0-9]{20,}$/i, "/…") || "dashboard";

  return (
    <footer className="hidden h-7 shrink-0 items-center gap-4 border-t border-border bg-sidebar/60 backdrop-blur-sm px-3 dark:bg-sidebar/25 font-mono text-[11px] text-muted-foreground md:flex">
      <span className="flex items-center gap-2 text-foreground/80">
        <span aria-hidden className="size-1.5 rounded-full bg-lime text-lime animate-led" />
        ~/bin/{path}
      </span>

      {/* Types, as a tiny legend */}
      <span className="hidden items-center gap-3 lg:flex" aria-label="Items by type">
        {itemTypes
          .filter((type) => type.count > 0)
          .map((type) => (
            <span key={type.name} className="flex items-center gap-1" title={`${type.count} ${type.name}s`}>
              <span aria-hidden className="size-1.5 rounded-[2px]" style={{ backgroundColor: type.color }} />
              <span className="tabular-nums">{type.count}</span>
            </span>
          ))}
      </span>

      <span className="ml-auto flex items-center gap-4">
        <button type="button" onClick={openSearch} className="transition-colors hover:text-foreground">
          <span className="text-foreground/70">⌘K</span> search
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(SHORTCUTS_EVENT))}
          className="transition-colors hover:text-foreground"
        >
          <span className="text-foreground/70">?</span> shortcuts
        </button>
        <span className="hidden xl:inline">
          <span className="text-foreground/70">N</span> new item
        </span>
        <span className="hidden xl:inline">
          <span className="text-foreground/70">C</span> new collection
        </span>
        {isPro ? (
          <span className="text-lime">● pro</span>
        ) : (
          <Link href="/upgrade" className={cn("transition-colors hover:text-lime", nearlyFull && "text-coral")}>
            free · <span className="tabular-nums">{Math.min(itemCount, MAX_ITEMS)}/{MAX_ITEMS}</span>
          </Link>
        )}
      </span>
    </footer>
  );
}
