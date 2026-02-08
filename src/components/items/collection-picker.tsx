"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, FolderOpen } from "lucide-react";
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

export interface CollectionOption {
  id: string;
  name: string;
}

interface CollectionPickerProps {
  collections: CollectionOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export default function CollectionPicker({
  collections,
  selectedIds,
  onChange,
  disabled = false,
}: CollectionPickerProps) {
  const [open, setOpen] = useState(false);

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
    <Popover open={open} onOpenChange={setOpen}>
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
          <CommandInput placeholder="Search collections..." />
          <CommandList>
            <CommandEmpty>No collections found.</CommandEmpty>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
