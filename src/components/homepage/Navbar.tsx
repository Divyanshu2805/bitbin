"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "AI", href: "/#ai" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3">
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-[1120px] items-center justify-between rounded-2xl border px-4 transition-all duration-300",
          scrolled || mobileOpen
            ? "border-border bg-background/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <Link href="/" aria-label="BitBin home">
          <Logo animated />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild className="font-semibold">
            <Link href="/register">Get started</Link>
          </Button>
        </div>

        <button
          className="rounded-lg p-1.5 text-foreground transition-colors hover:bg-accent md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="mx-auto mt-2 flex max-w-[1120px] flex-col gap-1 rounded-2xl border border-border bg-background/95 p-3 backdrop-blur-xl animate-fade-up md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <Link href="/sign-in" onClick={() => setMobileOpen(false)}>Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register" onClick={() => setMobileOpen(false)}>Get started</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
