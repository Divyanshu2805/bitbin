import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import AuthShowcase from "@/components/auth/auth-showcase";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="noise relative hidden flex-col justify-between overflow-hidden border-r border-border p-10 lg:flex">
        <div className="bg-grid mask-radial absolute inset-0" aria-hidden />
        <div
          className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-coral/10 blur-3xl"
          aria-hidden
        />

        <Link href="/" className="relative w-fit">
          <Logo animated />
        </Link>

        <div className="relative space-y-10">
          <div className="max-w-md space-y-3">
            <h2 className="text-4xl font-bold leading-[1.1]">
              Every snippet.
              <br />
              <span className="text-brand-gradient">One bin.</span>
            </h2>
            <p className="text-muted-foreground">
              Code, prompts, commands, notes and links — saved once, found in a
              keystroke.
            </p>
          </div>
          <AuthShowcase />
        </div>

        <p className="relative font-mono text-xs text-muted-foreground">
          ⌘K to search · AI tagging · Collections
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen flex-col bg-card [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:shadow-none">
        <div className="flex items-center justify-between p-6">
          <Link href="/" className="lg:invisible">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          {children}
        </div>
      </main>
    </div>
  );
}
