"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadFrom } from "@/components/shared/download-file";
import EditCollectionDialog from "./edit-collection-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/shared/kbd";
import { useHotkey } from "@/hooks/use-hotkey";

interface CollectionActionsProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function CollectionActions({ collection }: CollectionActionsProps) {
  const [editOpen, setEditOpen] = useState(false);

  useHotkey("e", () => setEditOpen(true));

  async function exportCollection(format: "json" | "zip") {
    const result = await downloadFrom(
      `/api/export?collection=${encodeURIComponent(collection.id)}&format=${format}`,
      `bitbin-collection.${format}`
    );
    if (result.ok) toast.success(`Exported ${result.filename}`);
    else toast.error(result.error);
  }

  return (
    <>
      {/* Edit (E) and export here; favorite, pin and delete are in the collection's ⋯ menu */}
      <div className="flex items-center gap-1">
        <ActionButton label="Edit collection" keys={["E"]} onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
        </ActionButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Export collection" title="Export collection" className="term-bare">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => exportCollection("json")}>Export as JSON</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportCollection("zip")}>Export as ZIP (Pro)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditCollectionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        collection={collection}
      />
    </>
  );
}

/** An icon button whose tooltip names the action and its key. */
function ActionButton({
  label,
  keys,
  onClick,
  children,
}: {
  label: string;
  keys?: string[];
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className="term-bare"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className="flex items-center gap-2">
        {label}
        {keys && <Kbd keys={keys} />}
      </TooltipContent>
    </Tooltip>
  );
}
