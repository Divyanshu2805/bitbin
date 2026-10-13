import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { HistorySlides } from "@/components/shared/transition-link";
import { VIEW_SCRIPT } from "@/lib/view-mode-script";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

// The fonts are self-hosted (latin variable files from Google Fonts, in
// ./fonts) rather than loaded with next/font/google: that downloads them at
// build time, and Turbopack intermittently fails the build on Google's reply
// ("next/font/google queries have exactly one entry").

// Geist for reading, Fraunces for headings, JetBrains Mono for labels and code.
const geist = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

// Fraunces for headings: upright only; the variable file carries its optical size and "soft" axes.
const fraunces = localFont({
  src: "./fonts/fraunces-latin.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains-mono",
  weight: "300 800",
});

// Link previews: `metadataBase` makes the Open Graph and Twitter image URLs absolute, and the
// image itself comes from opengraph-image.tsx / twitter-image.tsx next to this file.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["code snippets", "prompt library", "developer notes", "command palette", "snippet manager"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#151514",
  colorScheme: "dark",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT + VIEW_SCRIPT }} />
      </head>
      <body className={`${geist.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <HistorySlides />
        {/* One toast at a time: a new one replaces the last instead of stacking over it */}
        <Toaster position="top-center" visibleToasts={1} />
        <Analytics />
      </body>
    </html>
  );
}
