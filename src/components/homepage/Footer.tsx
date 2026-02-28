import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface pb-8 pt-16">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mb-14 grid grid-cols-[2fr_1fr_1fr_1fr] gap-12 max-md:grid-cols-2 max-md:gap-8 max-sm:grid-cols-1">
          <div className="max-md:col-span-2 max-sm:col-span-1">
            <Link href="/" className="mb-4 inline-block">
              <Logo />
            </Link>
            <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              One bin for snippets, prompts, commands, notes, files and links.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="flex flex-col gap-2.5">
              <h4 className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground/70">
                {title}
              </h4>
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="w-fit text-sm text-muted-foreground transition-colors hover:text-lime"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BitBin. All rights reserved.
          </p>
          <p className="font-mono text-xs text-muted-foreground/70">
            made for developers who hoard snippets
          </p>
        </div>
      </div>
    </footer>
  );
}
