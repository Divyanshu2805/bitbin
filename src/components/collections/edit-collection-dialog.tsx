"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import DialogFormFooter from "@/components/shared/dialog-form-footer";
import { toast } from "sonner";
import { updateCollection, type UpdateCollectionInput } from "@/actions/collections";

interface EditCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function EditCollectionDialog({
  open,
  onOpenChange,
  collection,
}: EditCollectionDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description || "");

  useEffect(() => {
    if (open) {
      setName(collection.name);
      setDescription(collection.description || "");
    }
  }, [open, collection]);

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const input: UpdateCollectionInput = {
        id: collection.id,
        name,
        description: description || null,
      };

      const result = await updateCollection(input);

      if (result.success) {
        toast.success("Collection updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        if (result.fieldErrors) {
          const firstError = Object.values(result.fieldErrors)[0]?.[0];
          toast.error(firstError || result.error || "Failed to update collection");
        } else {
          toast.error(result.error || "Failed to update collection");
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            Edit Collection
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter collection name"
              required
              disabled={isLoading}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter collection description"
              disabled={isLoading}
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFormFooter isLoading={isLoading} onCancel={handleClose} submitLabel="Save" />
        </form>
      </DialogContent>
    </Dialog>
  );
}
