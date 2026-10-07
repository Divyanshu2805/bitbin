import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  // The frame draws the sign-in page's corner brackets on focus (`.field-frame`)
  return (
    <span data-slot="textarea-frame" className="field-frame block w-full min-w-0">
      <textarea
        data-slot="textarea"
        className={cn(
          "border-input placeholder:text-faint dark:placeholder:text-muted-foreground/65 hover:border-foreground/20 focus-visible:border-ring/50 focus-visible:bg-background/80 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-background/60 px-3 py-2 text-base shadow-xs transition-[color,background-color,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 lg:text-sm",
          className
        )}
        {...props}
      />
    </span>
  )
}

export { Textarea }
