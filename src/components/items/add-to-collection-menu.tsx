"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderPlus, Loader2 } from "lucide-react";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { getItemCollections, setItemCollection } from "@/actions/items";
import type { ItemCollectionOption } from "@/lib/db/items";
import { cn } from "@/lib/utils";

/**
 * "Add to ›" in an item's ⋯ menu: the user's collections with a
 * check on the ones the item is in. Clicking one adds or removes the item,
 * and the menu stays open so several can be ticked in a row. The list loads
 * when the submenu opens.
 */
export function AddToCollectionMenu({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [options, setOptions] = useState<ItemCollectionOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setFailed(false);
    const result = await getItemCollections(itemId);
    if (result.success && result.data) setOptions(result.data);
    else setFailed(true);
  };

  const toggle = async (option: ItemCollectionOption) => {
    if (busy) return;
    setBusy(option.id);
    const add = !option.inCollection;
    const result = await setItemCollection(itemId, option.id, add);
    setBusy(null);
    if (result.success && result.data) {
      setOptions((current) =>
        current?.map((o) => (o.id === option.id ? { ...o, inCollection: add } : o)) ?? current
      );
      toast.success(add ? `Added to ${option.name}` : `Removed from ${option.name}`);
      router.refresh();
    } else {
      toast.error(result.error || "Couldn't update the collection");
    }
  };

  return (
    <DropdownMenuSub onOpenChange={(open) => open && load()}>
      <DropdownMenuSubTrigger>
        <FolderPlus />
        Add to
      </DropdownMenuSubTrigger>
      {/* As wide as the ⋯ menu, with its first row level with the trigger */}
      <DropdownMenuSubContent sideOffset={6} alignOffset={-5} className="thin-scrollbar max-h-72 w-48 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between px-2 pt-1 pb-1.5 font-mono text-[11px] font-normal text-muted-foreground">
          <span>
            <span className="text-muted-foreground/50">{"//"}</span> collections
          </span>
          {options && options.length > 0 && (
            <span className="tabular-nums text-muted-foreground/70">
              {options.filter((o) => o.inCollection).length}/{options.length}
            </span>
          )}
        </DropdownMenuLabel>
        {options === null && !failed && (
          <p className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </p>
        )}
        {failed && <p className="px-2 py-1.5 text-sm text-muted-foreground">Couldn&apos;t load collections</p>}
        {options?.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No collections yet. Press <span className="kbd">C</span> to make one.
          </p>
        )}
        {options?.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={option.inCollection}
            disabled={busy === option.id}
            // Keep the menu open so several can be ticked
            onSelect={(event) => {
              event.preventDefault();
              toggle(option);
            }}
            // A box on every row, ticked in lime for the collections the item is in
            className="[&>span:first-child_svg]:size-3! [&>span:first-child_svg]:text-lime"
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-2 size-3.5 rounded-[3px] border transition-colors",
                option.inCollection ? "border-lime/60" : "border-muted-foreground/40"
              )}
            />
            <span className={cn("min-w-0 flex-1 truncate", !option.inCollection && "text-foreground/80")}>{option.name}</span>
            {busy === option.id && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
