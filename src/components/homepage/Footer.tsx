import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { TransitionLink } from "@/components/shared/transition-link";
import FooterWordmark from "./FooterWordmark";
import { CtaLink } from "./ui";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#types", label: "Features" },
      { href: "#ai", label: "AI helpers" },
      { href: "#agents", label: "MCP for AI assistants" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "#extension", label: "Extension and desktop app" },
      { href: "#keys", label: "Shortcuts" },
      { href: "#faq", label: "FAQ" },
    ],
  },
];

export default function Footer() {
  return (
    <footer>
      <div className="landing-closing mx-auto max-w-(--landing-max) px-5 sm:px-8">
        <div><h2>Make room for your next idea.</h2><p>Build a library that gets more useful with everything you save.</p></div>
        <div data-scroll="unfold"><CtaLink href="/register">Start your knowledge hub</CtaLink></div>
      </div>
      <div className="mx-auto grid max-w-(--landing-max) grid-cols-2 gap-x-6 gap-y-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10">
        <div className="col-span-2 md:col-span-1">
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
          <Link href="/privacy" className="w-fit py-1 text-sm text-muted-foreground transition-colors hover:text-lime">
            Privacy
          </Link>
          <Link href="/terms" className="w-fit py-1 text-sm text-muted-foreground transition-colors hover:text-lime">
            Terms
          </Link>
        </nav>
      </div>

      {/* The wordmark, huge and outlined; lights up once you reach the bottom */}
      <FooterWordmark />
    </footer>
  );
}
