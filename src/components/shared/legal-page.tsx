import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import "@/app/brand.css";

interface LegalPageProps {
  title: string;
  updated: string;
  children: React.ReactNode;
}

/**
 * Shared frame for the public Privacy and Terms pages, in the landing page's look (brand.css):
 * a header, then a sheet with rounded shoulders holding a serif title and a readable column.
 */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="legal-page brand min-h-screen bg-background">
      <header>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" aria-label="BitBin home">
            <Logo />
          </Link>
          <Link href="/" className="landing-tour-link text-muted-foreground">
            <span aria-hidden className="tour-arrow tour-arrow-back">
              <ArrowLeft />
              <ArrowLeft />
            </span>
            <span>Home</span>
          </Link>
        </div>
      </header>

      <main className="legal-sheet">
        <div className="mx-auto max-w-3xl px-5 pb-16 pt-14 sm:px-8">
          <h1 className="legal-title brand-serif">
            <span className="hero-line">
              <span>{title}</span>
            </span>
          </h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">Last updated {updated}</p>
          <div className="legal-prose prose dark:prose-invert mt-10 max-w-none prose-headings:scroll-mt-20 prose-a:text-lime">
            {children}
          </div>
        </div>

        <footer className="border-t border-border">
          <nav
            aria-label="Legal"
            className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-sm sm:px-8"
          >
            <Link href="/privacy" className="brand-link brand-link-quiet">
              Privacy Policy
            </Link>
            <Link href="/terms" className="brand-link brand-link-quiet">
              Terms of Service
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
