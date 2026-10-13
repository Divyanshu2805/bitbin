import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { AuthAccent, AuthRoot, TypedWord } from "@/components/auth/auth-ui";
import HeroLogo from "@/components/homepage/HeroLogo";
import HeroVideo from "@/components/homepage/HeroVideo";
import { TransitionLink } from "@/components/shared/transition-link";
import "../brand.css";

// What the brand panel's headline types out in turn: "Every snippet, … one bin."
const TYPED_WORDS = ["snippet", "prompt", "command", "note", "link", "file", "image"];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRoot className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: the landing hero in miniature (brand.css), the same footage behind it, its headline typing what the bin holds. Follows the theme */}
      <aside className="auth-brand">
        <HeroVideo />
        <div aria-hidden className="hero-backdrop" />

        <Link href="/" className="w-fit" aria-label="BitBin home">
          <Logo />
        </Link>

        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <HeroLogo />
          <p className="auth-headline brand-serif">
            <span className="sr-only">{`Every ${TYPED_WORDS.join(", ")}: one bin.`}</span>
            <span className="hero-line">
              <span aria-hidden>
                Every <TypedWord words={TYPED_WORDS} />
              </span>
            </span>
            <span className="hero-line">
              <span>
                <span aria-hidden><AuthAccent>one bin.</AuthAccent></span>
              </span>
            </span>
          </p>
          <p className="auth-brand-description animate-fade-up" style={{ animationDelay: "160ms" }}>
            Save it once. AI tags it, ⌘K finds it in a keystroke.
          </p>
        </div>

        <p className="auth-facts animate-fade-up" style={{ animationDelay: "240ms" }}>
          <span>Free for 50 items</span>
          <span>AI tags</span>
          <span>⌘K search</span>
        </p>
      </aside>

      {/* Form panel: the next sheet, laid over the brand panel's edge */}
      <main className="auth-sheet">
        <div className="flex items-center justify-between px-6 pt-4">
          <Link href="/" className="lg:invisible" aria-label="BitBin home">
            <Logo />
          </Link>
          <TransitionLink href="/" back className="landing-tour-link text-muted-foreground">
            <span aria-hidden className="tour-arrow tour-arrow-back">
              <ArrowLeft />
              <ArrowLeft />
            </span>
            <span>Back home</span>
          </TransitionLink>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-16 pt-6 sm:px-8">
          {children}
        </div>
      </main>
    </AuthRoot>
  );
}
