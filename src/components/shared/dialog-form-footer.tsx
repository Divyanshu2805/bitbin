import { Button } from "@/components/ui/button";
import { Check, Loader2, X, type LucideIcon } from "lucide-react";

interface DialogFormFooterProps {
  isLoading: boolean;
  onCancel: () => void;
  submitLabel: string;
  /** The submit button's icon, swapped for a spinner while loading */
  submitIcon?: LucideIcon;
}

export default function DialogFormFooter({
  isLoading,
  onCancel,
  submitLabel,
  submitIcon: SubmitIcon = Check,
}: DialogFormFooterProps) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
      >
        <X className="h-4 w-4" />
        Cancel
      </Button>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SubmitIcon className="h-4 w-4" />}
        {submitLabel}
      </Button>
    </div>
  );
}
