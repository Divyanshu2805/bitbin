"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One click flips between light and dark (from "system" it flips away from
 * whatever the system shows). The sun / moon swap with the `dark:` variant
 * rather than reading the theme, so it renders the same on the server and never
 * mismatches on hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    // Like the toolbar buttons beside it (`.term-bare`): just a grey icon at
    // rest; on hover the lime edge, halo and sweep come in and the icon turns lime
    <Button
      variant="outline"
      size="icon"
      className={cn("term-bare relative shrink-0", className)}
      aria-label="Toggle light and dark theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="theme-icon h-[18px] w-[18px] scale-100 rotate-0 transition-[transform,color] duration-300 dark:scale-0 dark:-rotate-90" />
      <Moon className="theme-icon absolute h-[18px] w-[18px] scale-0 rotate-90 transition-[transform,color] duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
