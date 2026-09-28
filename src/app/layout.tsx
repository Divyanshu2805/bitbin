import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { HistorySlides } from "@/components/shared/transition-link";
import { VIEW_SCRIPT } from "@/lib/view-mode-script";
import "./globals.css";

// Geist for reading, JetBrains Mono for headings, labels and code.
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// IBM Plex Sans for description text (the `text-desc` utility).
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "BitBin — Every snippet, one bin",
    template: "%s · BitBin",
  },
  description:
    "BitBin is a fast, searchable home for your code snippets, AI prompts, terminal commands, notes, files and links.",
  applicationName: "BitBin",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff2e9" },
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
  ],
};

// Restores the collapsed sidebar before the first paint, so the rail never
// flashes open. Kept tiny and wrapped in try: storage can be unavailable.
const SIDEBAR_SCRIPT = `try{if(localStorage.getItem("bitbin:sidebar")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT + VIEW_SCRIPT }} />
      </head>
      <body className={`${geist.variable} ${plexSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <HistorySlides />
          {/* One toast at a time: a new one replaces the last instead of stacking over it */}
          <Toaster richColors position="top-center" visibleToasts={1} />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
