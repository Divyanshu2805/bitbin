"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PencilLine, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateName } from "@/actions/settings";

/**
 * The profile's name, edited in place: a pencil beside it opens a field; Enter
 * or the tick saves, Escape or the cross cancels.
 */
export default function EditableName({ name }: { name: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setValue(name ?? "");
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (value.trim() === (name ?? "")) {
      cancel();
      return;
    }
    setSaving(true);
    const result = await updateName({ name: value });
    setSaving(false);
    if (!result.success) {
      setError(result.fieldErrors?.name?.[0] ?? result.error ?? "Could not update your name.");
      return;
    }
    toast.success("Name updated");
    setEditing(false);
    router.refresh();
  };

  if (!editing) {
    return (
      <div className="group/name flex min-w-0 items-center gap-1.5">
        <p className="truncate font-display text-xl font-bold tracking-[-0.03em]">
          {name || <span className="text-muted-foreground">No name set</span>}
        </p>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={startEditing}
          aria-label="Edit name"
          className="shrink-0 text-muted-foreground hover:text-lime sm:opacity-0 sm:group-hover/name:opacity-100 sm:focus-visible:opacity-100"
        >
          <PencilLine />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {/* Input's frame is full width, so the width limit goes on a wrapper */}
        <div className="w-full min-w-0 max-w-xs">
          <Input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            maxLength={50}
            autoFocus
            aria-label="Name"
            aria-invalid={error ? true : undefined}
            placeholder="Your name"
            className="h-9 font-display text-base font-semibold"
          />
        </div>
        <Button type="submit" size="icon-sm" disabled={saving} aria-label="Save name">
          <Check />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={cancel} aria-label="Cancel">
          <X />
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="font-mono text-[11px] text-muted-foreground">
          <span className="kbd">Enter</span> to save · <span className="kbd">Esc</span> to cancel
        </p>
      )}
    </form>
  );
}
