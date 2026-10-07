"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import { AgentSpinner } from "@/components/shared/agent-spinner";
import { readableColor } from "@/lib/utils/color";
import { cn } from "@/lib/utils";
import { useSearch } from "@/components/search/search-provider";
import { useItemDrawer } from "@/components/items/item-drawer-provider";
import { searchLibrary, type SearchData } from "@/actions/search";

// A pause in typing this long sends the search
const DEBOUNCE_MS = 150;

interface SearchResult {
  /** The text these results are for */
  query: string;
  data: SearchData | null;
  error: string | null;
}

export default function CommandPalette() {
  const { isOpen, closeSearch } = useSearch();
  const { openDrawer } = useItemDrawer();
  const router = useRouter();

  const handleItemSelect = useCallback(
    (itemId: string) => {
      closeSearch();
      openDrawer(itemId);
    },
    [closeSearch, openDrawer]
  );

  const handleCollectionSelect = useCallback(
    (collectionId: string) => {
      closeSearch();
      router.push(`/collections/${collectionId}`);
    },
    [closeSearch, router]
  );

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => !open && closeSearch()}
      title="Search"
      description="Search items, tags and collections"
      showCloseButton={false}
      // The server filters and ranks; cmdk only lists what it is given
      shouldFilter={false}
      className="gap-0 border-border bg-popover shadow-[var(--shadow-lift)] sm:max-w-xl [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-normal [&_[cmdk-item][data-selected=true]]:bg-lime/[0.07] [&_[cmdk-item]]:rounded-md"
    >
      {/* Mounted only while the palette is open, so each opening starts with an empty box and fresh results */}
      <PaletteBody onSelectItem={handleItemSelect} onSelectCollection={handleCollectionSelect} />
    </CommandDialog>
  );
}

function PaletteBody({
  onSelectItem,
  onSelectCollection,
}: {
  onSelectItem: (id: string) => void;
  onSelectCollection: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [settled, setSettled] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  // Wait for a pause in typing before asking the server
  useEffect(() => {
    const timer = setTimeout(() => setSettled(query), query ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [query]);

  // Ask for the settled text. A newer search makes an older answer irrelevant, so it is dropped.
  useEffect(() => {
    let current = true;
    searchLibrary(settled)
      .then((response) => {
        if (!current) return;
        setResult({
          query: settled,
          data: response.success && response.data ? response.data : null,
          error: response.success ? null : (response.error ?? "Search failed"),
        });
      })
      .catch(() => {
        if (current) setResult({ query: settled, data: null, error: "Search failed" });
      });
    return () => {
      current = false;
    };
  }, [settled]);

  const data = result?.data ?? null;
  const upToDate = result !== null && result.query === query.trim() && settled === query;
  const typed = query.trim().length > 0;
  const hasResults = !!data && (data.items.length > 0 || data.collections.length > 0);

  return (
    <>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="search items, #tags and collections"
        className="font-mono text-base lg:text-[13px]"
        icon={
          <span aria-hidden className="font-mono text-sm font-semibold text-lime">
            &gt;
          </span>
        }
      />
      <CommandList className="thin-scrollbar max-h-[min(420px,60vh)] py-1">
        {result === null ? (
          <div className="flex justify-center py-8">
            <AgentSpinner verb={["Indexing", "Grepping"]} className="text-xs" />
          </div>
        ) : result.error && !hasResults ? (
          <p className="py-6 text-center font-mono text-xs text-destructive">{result.error}</p>
        ) : (
          <div className={cn("transition-opacity", !upToDate && typed && "opacity-60")}>
            {!hasResults && upToDate && (
              <p className="py-6 text-center font-mono text-xs text-muted-foreground">
                {typed ? (
                  <>
                    no matches <span>· try fewer letters</span>
                  </>
                ) : (
                  "nothing saved yet · press N to add the first item"
                )}
              </p>
            )}

            {data && data.items.length > 0 && (
              <CommandGroup heading={typed ? "// items" : "// recent items"}>
                {data.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`item-${item.id}`}
                    onSelect={() => onSelectItem(item.id)}
                    className="group cursor-pointer gap-3"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `color-mix(in srgb, ${item.typeColor} 14%, transparent)` }}
                    >
                      <ItemTypeIcon icon={item.typeIcon} className="!h-3.5 !w-3.5" style={{ color: readableColor(item.typeColor) }} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{item.title}</span>
                      {item.contentPreview && (
                        <span className="truncate font-mono text-[11px] text-muted-foreground">{item.contentPreview}</span>
                      )}
                      {item.tags.length > 0 && (
                        <span className="truncate font-mono text-[11px] text-cyan">
                          {item.tags.map((tag) => `#${tag}`).join(" ")}
                        </span>
                      )}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[11px]" style={{ color: readableColor(item.typeColor) }}>
                      {item.typeName}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {data && data.collections.length > 0 && (
              <CommandGroup heading={typed ? "// collections" : "// recent collections"}>
                {data.collections.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={`collection-${collection.id}`}
                    onSelect={() => onSelectCollection(collection.id)}
                    className="cursor-pointer gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan/10">
                      <FolderOpen className="!h-3.5 !w-3.5 text-cyan" />
                    </span>
                    <span className="truncate text-sm">{collection.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                      {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </div>
        )}
      </CommandList>

      {/* Key hints, like a TUI's footer */}
      <div className="flex items-center gap-4 border-t border-border bg-surface/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="kbd">↑</span>
          <span className="kbd">↓</span> move
        </span>
        <span className="flex items-center gap-1">
          <span className="kbd">⏎</span> open
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="kbd">esc</span> close
        </span>
      </div>
    </>
  );
}
