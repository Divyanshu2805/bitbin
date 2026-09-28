"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light / dark / system theme. next-themes puts `.dark` on <html> before the
 * first paint (so there's no flash) and remembers the choice in localStorage.
 * Dark stays the default: it's BitBin's home look.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
