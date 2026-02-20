import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
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
  themeColor: "#0a0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
        <Toaster richColors theme="dark" position="top-center" />
      </body>
    </html>
  );
}
