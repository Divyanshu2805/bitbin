"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import { AgentSpinner } from "@/components/shared/agent-spinner";
import { readableColor } from "@/lib/utils/color";
import { useSearch } from "@/components/search/search-provider";
import { useItemDrawer } from "@/components/items/item-drawer-provider";

/**
 * Stricter search filter - requires search term to appear as contiguous substring
 * Returns 1 for match, 0 for no match (cmdk expects this format)
 */
function strictFilter(value: string, search: string): number {
  if (!search) return 1;
  return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
}

export default function CommandPalette() {
  const { isOpen, closeSearch, searchData, isLoading } = useSearch();
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
      filter={strictFilter}
      className="gap-0 border-border bg-popover shadow-[var(--shadow-lift)] sm:max-w-xl [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-normal [&_[cmdk-item][data-selected=true]]:bg-lime/[0.07] [&_[cmdk-item]]:rounded-md"
    >
      <CommandInput
        placeholder="search items, #tags and collections"
        className="font-mono text-base lg:text-[13px]"
        icon={
          <span aria-hidden className="font-mono text-sm font-semibold text-lime">
            &gt;
          </span>
        }
      />
      <CommandList className="thin-scrollbar max-h-[min(420px,60vh)] py-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <AgentSpinner verb={["Indexing", "Grepping"]} className="text-xs" />
          </div>
        ) : (
          <>
            <CommandEmpty>
              <span className="font-mono text-xs text-muted-foreground">
                no matches <span className="text-muted-foreground">· try fewer letters</span>
              </span>
            </CommandEmpty>

            {searchData && searchData.items.length > 0 && (
              <CommandGroup heading="// items">
                {searchData.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`item-${item.title}-${item.contentPreview || ""} ${item.tags.map((tag) => `#${tag}`).join(" ")}`}
                    onSelect={() => handleItemSelect(item.id)}
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

            {searchData && searchData.collections.length > 0 && (
              <CommandGroup heading="// collections">
                {searchData.collections.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={`collection-${collection.name}`}
                    onSelect={() => handleCollectionSelect(collection.id)}
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
          </>
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
    </CommandDialog>
  );
}
