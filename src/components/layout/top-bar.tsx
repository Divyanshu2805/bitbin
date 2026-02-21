"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, Star, Plus, FolderPlus, FilePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NewItemDialog from "@/components/items/new-item-dialog";
import NewCollectionDialog from "@/components/collections/new-collection-dialog";
import { useSearch } from "@/components/search/search-provider";
import { Logo } from "@/components/shared/logo";

interface TopBarProps {
  onMenuClick?: () => void;
  isPro?: boolean;
}

export default function TopBar({ onMenuClick, isPro }: TopBarProps) {
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const { openSearch } = useSearch();

  return (
    <header className="relative z-20 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-4 sm:px-5">
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

      {/* Logo */}
      <Link href="/dashboard" className="shrink-0" aria-label="BitBin dashboard">
        <Logo collapseOnMobile />
      </Link>

      {/* Search trigger - full bar on sm+, icon-only on mobile */}
      <button
        type="button"
        onClick={openSearch}
        className="group relative mx-auto hidden h-9 max-w-md flex-1 items-center rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-all hover:border-lime/40 hover:text-foreground hover:shadow-[0_0_0_3px_rgba(194,242,75,0.08)] sm:flex"
      >
        <Search className="mr-2 h-4 w-4 transition-colors group-hover:text-lime" />
        <span className="flex-1 text-left">Search your bin…</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium sm:flex">
          ⌘K
        </kbd>
      </button>

      {/* Mobile search icon */}
      <div className="flex-1 sm:hidden" />
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 sm:hidden"
        onClick={openSearch}
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {!isPro && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden text-coral hover:bg-coral/10 hover:text-coral md:inline-flex"
          >
            <Link href="/upgrade">
              <Sparkles className="h-4 w-4" />
              Upgrade
            </Link>
          </Button>
        )}

        <Button variant="ghost" size="icon" asChild>
          <Link href="/favorites" title="Favorites" aria-label="Favorites">
            <Star className="h-5 w-5" />
          </Link>
        </Button>

        {/* Mobile: + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="sm:hidden" aria-label="Create">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setNewItemOpen(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              New Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNewCollectionOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Collection
            </DropdownMenuItem>
            {!isPro && (
              <DropdownMenuItem asChild>
                <Link href="/upgrade">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop: full buttons */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => setNewCollectionOpen(true)}
        >
          <FolderPlus className="h-4 w-4" />
          Collection
        </Button>
        <Button
          size="sm"
          className="hidden font-semibold sm:inline-flex"
          onClick={() => setNewItemOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Item
        </Button>
      </div>

      <NewItemDialog open={newItemOpen} onOpenChange={setNewItemOpen} isPro={isPro} />
      <NewCollectionDialog open={newCollectionOpen} onOpenChange={setNewCollectionOpen} />
    </header>
  );
}
