import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our @utility background patterns (globals.css) set background-image. Without
// this, tailwind-merge reads `bg-dots` as a background colour and drops it when a
// `bg-*` colour class comes after it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "bg-image": ["bg-grid", "bg-dots"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
