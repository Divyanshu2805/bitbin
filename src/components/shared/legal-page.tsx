import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";

interface LegalPageProps {
  title: string;
  updated: string;
  children: React.ReactNode;
}

/** Shared frame for the public Privacy and Terms pages: a header, a readable column and cross-links. */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-lime"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">Last updated {updated}</p>
        <div className="prose dark:prose-invert mt-8 max-w-none prose-headings:scroll-mt-20 prose-a:text-lime">
          {children}
        </div>
      </main>

      <footer className="border-t border-border/60">
        <nav
          aria-label="Legal"
          className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-sm text-muted-foreground sm:px-8"
        >
          <Link href="/privacy" className="hover:text-lime">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-lime">
            Terms of Service
          </Link>
        </nav>
      </footer>
    </div>
  );
}
