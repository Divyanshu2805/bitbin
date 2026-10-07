import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // The frame draws the sign-in page's corner brackets on focus (`.field-frame`)
  return (
    <span data-slot="input-frame" className="field-frame block w-full min-w-0">
      <input
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-faint dark:placeholder:text-muted-foreground/65 selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-background/60 px-3 py-1 text-base shadow-xs transition-[color,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 lg:text-sm",
          "hover:border-foreground/20 focus-visible:border-ring/50 focus-visible:bg-background/80",
          "aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    </span>
  )
}

export { Input }
