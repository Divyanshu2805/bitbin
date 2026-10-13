"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, FolderOpen, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createCollection } from "@/actions/collections";

export interface CollectionOption {
  id: string;
  name: string;
}

/** Creates a collection and reports it with a toast; null when it could not be made. */
export async function createCollectionOption(name: string): Promise<CollectionOption | null> {
  const result = await createCollection({ name, description: null });
  if (!result.success || !result.data) {
    const fieldError = result.fieldErrors && Object.values(result.fieldErrors)[0]?.[0];
    toast.error(fieldError || result.error || "Failed to create collection");
    return null;
  }
  toast.success(`Collection "${result.data.name}" created`);
  return { id: result.data.id, name: result.data.name };
}

/** `collections` with `created` added, kept sorted by name like the server's list. */
export function withCollection(collections: CollectionOption[], created: CollectionOption): CollectionOption[] {
  return [...collections, created].sort((a, b) => a.name.localeCompare(b.name));
}

interface CollectionPickerProps {
  collections: CollectionOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /**
   * Makes a collection from the name typed in the search box. Resolves to it once it exists
   * (the parent adds it to `collections`), or null when it could not be made.
   */
  onCreate?: (name: string) => Promise<CollectionOption | null>;
}

export default function CollectionPicker({
  collections,
  selectedIds,
  onChange,
  disabled = false,
  onCreate,
}: CollectionPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const draft = search.trim();
  const canCreate =
    Boolean(onCreate) &&
    draft.length > 0 &&
    !collections.some((c) => c.name.toLowerCase() === draft.toLowerCase());

  const createFromSearch = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(draft);
      if (created) {
        onChange([...selectedIds, created.id]);
        setSearch("");
      }
    } finally {
      setCreating(false);
    }
  };

  const selectedCollections = collections.filter((c) =>
    selectedIds.includes(c.id)
  );

  const toggleCollection = (collectionId: string) => {
    if (selectedIds.includes(collectionId)) {
      onChange(selectedIds.filter((id) => id !== collectionId));
    } else {
      onChange([...selectedIds, collectionId]);
    }
  };

  return (
    // modal: the picker opens inside dialogs and the drawer, whose scroll lock
    // would otherwise cancel wheel scrolling in the portaled list
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10"
          disabled={disabled}
        >
          {selectedCollections.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedCollections.map((collection) => (
                <Badge
                  key={collection.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {collection.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Select collections...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={onCreate ? "Search or create a collection..." : "Search collections..."}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!canCreate && <CommandEmpty>No collections found.</CommandEmpty>}
            <CommandGroup>
              {collections.map((collection) => (
                <CommandItem
                  key={collection.id}
                  value={collection.name}
                  onSelect={() => toggleCollection(collection.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.includes(collection.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {collection.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate && (
              <CommandGroup forceMount>
                <CommandItem
                  // forceMount (here and on the group): the typed name matches nothing, so cmdk would hide this row
                  forceMount
                  value={`create-${draft}`}
                  disabled={creating}
                  onSelect={createFromSearch}
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create &ldquo;{draft}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
