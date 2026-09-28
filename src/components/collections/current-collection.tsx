"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderMinus } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { setItemCollection } from "@/actions/items";

interface CurrentCollection {
  id: string;
  name: string;
}

const CurrentCollectionContext = createContext<CurrentCollection | null>(null);

/**
 * Marks the items inside it as shown on a collection's page, so their ⋯ menus
 * can offer "Remove". Set by the collection detail page.
 */
export function CurrentCollectionProvider({
  collection,
  children,
}: {
  collection: CurrentCollection;
  children: React.ReactNode;
}) {
  return <CurrentCollectionContext.Provider value={collection}>{children}</CurrentCollectionContext.Provider>;
}

/**
 * "Remove" in an item's ⋯ menu: takes it out of the collection whose page it's
 * on. Only renders there; the item itself stays in the bin and in its other
 * collections.
 */
export function RemoveFromCollectionItem({ itemId }: { itemId: string }) {
  const collection = useContext(CurrentCollectionContext);
  const router = useRouter();
  if (!collection) return null;

  const remove = async () => {
    const result = await setItemCollection(itemId, collection.id, false);
    if (result.success) {
      toast.success(`Removed from ${collection.name}`);
      router.refresh();
    } else {
      toast.error(result.error || "Couldn't update the collection");
    }
  };

  return (
    <DropdownMenuItem onSelect={remove}>
      <FolderMinus />
      Remove
    </DropdownMenuItem>
  );
}
