"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/constants/editor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface LanguagePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** The value was detected from the content, not chosen: shows an "auto" mark */
  detected?: boolean;
}

/**
 * A searchable language picker: opens below and to the right of its button (never over it), type to
 * filter, ↑↓ and ⏎ to choose. Replaces a long native-style select that covered
 * the editor.
 */
export default function LanguagePicker({ value, onChange, disabled, className, detected }: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((lang) => lang.value === (value || "plaintext")) ?? LANGUAGES[0];

  return (
    // modal: the picker opens inside dialogs and the drawer, whose scroll lock
    // would otherwise cancel wheel scrolling in the portaled list
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Language"
          disabled={disabled}
          className={cn(
            "inline-flex h-7 min-w-36 items-center justify-between gap-2 rounded-md border border-input bg-background/60 px-2.5 font-mono text-xs text-foreground/90 outline-none transition-colors",
            "hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50",
            open && "border-ring",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{current.label}</span>
            {detected && (
              <span
                className="shrink-0 rounded-sm bg-[color-mix(in_srgb,var(--ring)_14%,transparent)] px-1 text-[10px] leading-4 text-[var(--ring)]"
                title="Detected from the pasted content — pick another to override"
              >
                auto
              </span>
            )}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {/* Lined up with the button's left edge, so it opens to the right, into the form rather than out of it */}
      <PopoverContent align="start" sideOffset={6} collisionPadding={12} className="w-56 p-0">
        <Command
          filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
          className="bg-popover"
        >
          <CommandInput placeholder="search language" className="h-9 font-mono text-base lg:text-xs" />
          <CommandList className="thin-scrollbar max-h-64 p-1">
            <CommandEmpty className="py-4 text-center font-mono text-xs text-muted-foreground">no match</CommandEmpty>
            {LANGUAGES.map((lang) => {
              const selected = lang.value === current.value;
              return (
                <CommandItem
                  key={lang.value}
                  value={`${lang.label} ${lang.value}`}
                  onSelect={() => {
                    onChange(lang.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 font-mono text-xs data-[selected=true]:bg-[color-mix(in_srgb,var(--ring)_14%,transparent)]"
                >
                  {lang.label}
                  {selected && <Check className="h-3.5 w-3.5 text-[var(--ring)]" />}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
