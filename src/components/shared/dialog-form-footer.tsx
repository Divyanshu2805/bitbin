import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DialogFormFooterProps {
  isLoading: boolean;
  onCancel: () => void;
  submitLabel: string;
}

export default function DialogFormFooter({
  isLoading,
  onCancel,
  submitLabel,
}: DialogFormFooterProps) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}
