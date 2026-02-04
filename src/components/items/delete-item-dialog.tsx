"use client";

import ConfirmDeleteDialog from "@/components/shared/confirm-delete-dialog";

interface DeleteItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  onConfirm: () => Promise<void>;
}

export default function DeleteItemDialog({
  open,
  onOpenChange,
  itemTitle,
  onConfirm,
}: DeleteItemDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Item"
      description={
        <p>
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{itemTitle}</span>?
          This will permanently remove the item and all its data.
        </p>
      }
      onConfirm={onConfirm}
    />
  );
}
