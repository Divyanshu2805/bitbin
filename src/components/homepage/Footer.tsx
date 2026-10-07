import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { TransitionLink } from "@/components/shared/transition-link";
import FooterWordmark from "./FooterWordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#types", label: "Features" },
      { href: "#ai", label: "AI" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "#extension", label: "Browser extension" },
      { href: "#keys", label: "Shortcuts" },
      { href: "#faq", label: "FAQ" },
    ],
  },
];

export default function Footer() {
  return (
    <footer>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            One bin for snippets, prompts, commands, notes, files and links.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-1">
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-faint dark:text-muted-foreground/70">{col.title}</p>
            {col.links.map((link) => (
              <a key={link.label} href={link.href} className="w-fit py-1 text-sm text-muted-foreground transition-colors hover:text-lime">
                {link.label}
              </a>
            ))}
          </nav>
        ))}
        <nav aria-label="Account" className="flex flex-col gap-1">
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-faint dark:text-muted-foreground/70">Account</p>
          <TransitionLink href="/sign-in" className="w-fit py-1 text-sm text-muted-foreground transition-colors hover:text-lime">
            Sign in
          </TransitionLink>
          <TransitionLink href="/register" className="w-fit py-1 text-sm text-muted-foreground transition-colors hover:text-lime">
            Create account
          </TransitionLink>
        </nav>
      </div>

      {/* The wordmark, huge and outlined; lights up once you reach the bottom */}
      <FooterWordmark />

      <div>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-5 font-mono text-xs text-muted-foreground sm:px-8">
          <span>© {new Date().getFullYear()} BitBin</span>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-lime">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-lime">
              Terms
            </Link>
          </nav>
          <span>{"// made for developers who hoard snippets"}</span>
        </div>
      </div>
    </footer>
  );
}
