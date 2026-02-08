"use client";

import ConfirmDeleteDialog from "@/components/shared/confirm-delete-dialog";

interface DeleteCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  onConfirm: () => Promise<void>;
}

export default function DeleteCollectionDialog({
  open,
  onOpenChange,
  collectionName,
  onConfirm,
}: DeleteCollectionDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Collection"
      description={
        <p>
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{collectionName}</span>?
          Items in this collection will not be deleted, they will just be removed
          from this collection.
        </p>
      }
      onConfirm={onConfirm}
    />
  );
}
