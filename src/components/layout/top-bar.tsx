"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, Plus, FolderPlus, FilePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NewItemDialog, { type ItemTypeName } from "@/components/items/new-item-dialog";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import NewCollectionDialog from "@/components/collections/new-collection-dialog";
import { useSearch } from "@/components/search/search-provider";
import { Logo } from "@/components/shared/logo";
import { KeyLabel } from "@/components/shared/kbd";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useHotkey } from "@/hooks/use-hotkey";
import { useTypewriter } from "@/hooks/use-typewriter";

// Typed out one after another in the search prompt (see useTypewriter)
const SEARCH_EXAMPLES = [
  "search your bin",
  "useDebounce hook",
  "docker cleanup",
  "#react",
  "git undo last commit",
  "code review prompt",
];

/** The item type whose page is open (`/items/snippets` → "snippet"), if any */
function pageItemType(pathname: string): ItemTypeName | undefined {
  const match = /^\/items\/([a-z]+)s$/.exec(pathname);
  const name = match?.[1];
  return name && name in ITEM_TYPE_COLORS ? (name as ItemTypeName) : undefined;
}

interface TopBarProps {
  onMenuClick?: () => void;
  isPro?: boolean;
}

/**
 * The app's title bar, over the content (the sidebar runs the full height beside
 * it on desktop and carries the logo). It has no background or border of its
 * own, so the page backdrop runs straight through it: a `>` command prompt that opens ⌘K
 * search, and the create buttons. N, C and / are live shortcuts (see
 * useHotkey). From sm up it's a three-column grid: the search sits in the true
 * centre whenever both sides fit, and only drifts when the buttons need the
 * room. Phones get the menu button and the logo on the left.
 */
export default function TopBar({ onMenuClick, isPro }: TopBarProps) {
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const { openSearch } = useSearch();
  // On a type's page, New item (and N) opens the dialog already set to that type
  const pageType = pageItemType(usePathname());
  const typed = useTypewriter(SEARCH_EXAMPLES, { hold: 2000 });

  useHotkey("n", () => setNewItemOpen(true));
  useHotkey("c", () => setNewCollectionOpen(true));
  useHotkey("/", openSearch);

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 px-3 sm:grid sm:grid-cols-[minmax(max-content,1fr)_minmax(0,28rem)_minmax(max-content,1fr)] sm:gap-4 sm:px-4">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/dashboard" className="shrink-0 lg:hidden" aria-label="BitBin dashboard">
          <Logo collapseOnMobile />
        </Link>
      </div>

      {/* Search: drawn as a command prompt. Full bar on sm+, an icon on phones */}
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search your bin"
        className="search-prompt group relative hidden h-9 w-full min-w-0 items-center gap-2.5 rounded-md bg-card/70 px-3 font-mono text-[13px] text-muted-foreground sm:flex"
      >
        <span aria-hidden className="font-semibold text-lime">
          &gt;
        </span>
        {/* Example searches type themselves out, with a caret that always blinks */}
        <span aria-hidden className="min-w-0 flex-1 truncate text-left">
          {typed.text}
          <span className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[0.2em] animate-blink rounded-full bg-lime/80" />
        </span>
        <span className="flex items-center gap-1">
          <span className="kbd">/</span>
          <span className="kbd">
            <KeyLabel label="⌘K" />
          </span>
        </span>
      </button>

      <div className="flex-1 sm:hidden" />
      <Button variant="ghost" size="icon" className="shrink-0 sm:hidden" onClick={openSearch} aria-label="Search">
        <Search className="h-5 w-5" />
      </Button>

      {/* Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:justify-self-end sm:gap-2">
        <ThemeToggle />
        {!isPro && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden font-mono text-xs md:inline-flex"
            style={
              {
                "--grid-color": "var(--brand-coral)",
                color: "var(--brand-coral)",
                borderColor: "color-mix(in srgb, var(--brand-coral) 40%, var(--border))",
              } as React.CSSProperties
            }
          >
            <Link href="/upgrade">
              <Sparkles className="h-3.5 w-3.5" />
              upgrade
            </Link>
          </Button>
        )}

        {/* Phones: one + menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="sm:hidden" aria-label="Create">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setNewItemOpen(true)}>
              <FilePlus className="h-4 w-4" />
              New item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNewCollectionOpen(true)}>
              <FolderPlus className="h-4 w-4" />
              New collection
            </DropdownMenuItem>
            {!isPro && (
              <DropdownMenuItem asChild>
                <Link href="/upgrade">
                  <Sparkles className="h-4 w-4" />
                  Upgrade
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* sm and up: GitHub-style buttons with their shortcut on the key */}
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewCollectionOpen(true)}
            aria-label="New collection"
            // BitBin's coral for collections, its lime for items (below)
            style={{ "--grid-color": "var(--brand-coral)", "--btn-accent": "var(--brand-coral)" } as React.CSSProperties}
          >
            <FolderPlus className="h-4 w-4 text-coral" />
            <span className="hidden items-center gap-2 lg:inline-flex">
              New collection
              <span aria-hidden className="btn-kbd">
                C
              </span>
            </span>
          </Button>
          <Button
            size="sm"
            onClick={() => setNewItemOpen(true)}
            style={{ "--grid-color": "var(--brand-lime)", "--btn-accent": "var(--brand-lime)" } as React.CSSProperties}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New item
            <span aria-hidden className="btn-kbd">
              N
            </span>
          </Button>
        </div>
      </div>

      <NewItemDialog
        open={newItemOpen}
        onOpenChange={setNewItemOpen}
        defaultType={pageType ?? "snippet"}
        isPro={isPro}
      />
      <NewCollectionDialog open={newCollectionOpen} onOpenChange={setNewCollectionOpen} />
    </header>
  );
}
