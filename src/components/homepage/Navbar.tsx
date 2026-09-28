"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import { useScrolled, useScrollProgress, useScrollSpy } from "@/hooks/use-motion";
import { FEATURES } from "./features";
import { CtaLink } from "./ui";

// The page's top level: Problem, Features, Pricing, FAQ. Features is a group of
// five sections (01.1–01.5). Outside them, clicking "Features" unfolds the bar
// itself into a row of the five, as cards;
// once you scroll into one, "Features" unfolds in place into those five links,
// styled like the rest, with an underline on hover; the current one is in its
// section's colour.
// It folds back up when you leave.
const TOP = [
  { id: "organize", href: "#organize", index: "00", label: "Problem" },
  { id: "features", href: "#types", index: "01", label: "Features" },
  { id: "pricing", href: "#pricing", index: "02", label: "Pricing" },
  { id: "faq", href: "#faq", index: "03", label: "FAQ" },
] as const;

const FEATURE_IDS = FEATURES.map((f) => f.id);
const IDS = ["organize", ...FEATURE_IDS, "pricing", "faq"];

export default function Navbar() {
  const scrolled = useScrolled();
  const active = useScrollSpy(IDS);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const barRef = useScrollProgress<HTMLDivElement>();

  const inFeatures = scrolled && FEATURE_IDS.includes(active ?? "");
  const activeFeature = FEATURES.findIndex((f) => f.id === active);

  useEffect(() => {
    if (!open && !menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setMenu(false);
    };
    const onDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.("[data-features-menu]")) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, menu]);

  const showMenu = menu && !inFeatures;

  // Scrolling the page folds the panel back up: the wheel closes it at once,
  // and the scroll listener catches the scrollbar, keys and touch
  useEffect(() => {
    if (!showMenu) return;
    const from = window.scrollY;
    const close = () => setMenu(false);
    const onScroll = () => {
      if (Math.abs(window.scrollY - from) > 8) close();
    };
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", close);
      window.removeEventListener("scroll", onScroll);
    };
  }, [showMenu]);

  // While the panel is open the page behind it holds still: LandingBackdrop and
  // the CSS in globals.css pause on this attribute
  useEffect(() => {
    document.documentElement.toggleAttribute("data-features-open", showMenu);
    return () => document.documentElement.removeAttribute("data-features-open");
  }, [showMenu]);

  const solid = scrolled || open || showMenu;
  const current = (id: string) => (id === "features" ? inFeatures : scrolled && active === id);

  return (
    <>
    {/* Behind the open Features panel: the page dims and blurs, and a click on it closes the panel */}
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-40 hidden bg-background/40 backdrop-blur-[2px] transition-opacity duration-300 lg:block",
        showMenu ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    />
    <header
      ref={barRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300",
        solid ? "border-border backdrop-blur-xl" : "border-transparent",
        showMenu ? "bg-background/95" : solid && "bg-background/80"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5 sm:px-8">
        <a href="#top" aria-label="BitBin, back to top" className="shrink-0 rounded-lg">
          <Logo animated />
        </a>

        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {TOP.map((link) => {
              const isCurrent = current(link.id);
              const linkClass = cn(
                "group relative flex items-center gap-1 rounded-md px-3 py-2 font-mono text-[13px] transition-colors",
                isCurrent ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              );

              if (link.id !== "features") {
                return (
                  <li key={link.id}>
                    <a href={link.href} aria-current={isCurrent ? "true" : undefined} className={linkClass}>
                      {link.label}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-3 -bottom-px h-px origin-left bg-lime transition-transform duration-300",
                          isCurrent ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                        )}
                      />
                    </a>
                  </li>
                );
              }

              return (
                <li key={link.id} className="relative">
                  {/* Folded it's just "Features ▾"; unfolded it's the five parts */}
                  <div className="flex items-center">
                    {/* "Features ▾" folds away as the parts unfold */}
                    <div className={cn("grid transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", inFeatures ? "grid-cols-[0fr]" : "grid-cols-[1fr]")}>
                      <div className="min-w-0 overflow-hidden">
                        <button
                          type="button"
                          data-features-menu
                          aria-expanded={showMenu}
                          aria-controls="features-menu"
                          tabIndex={inFeatures ? -1 : 0}
                          onClick={() => setMenu((v) => !v)}
                          className={cn(linkClass, "whitespace-nowrap", showMenu && "text-foreground")}
                        >
                          {link.label}
                          <ChevronDown className={cn("size-3.5 transition-transform duration-300", showMenu && "rotate-180")} />
                          {/* Open, it's underlined like the current section; inside the button, which clips below it */}
                          <span
                            aria-hidden
                            className={cn(
                              "absolute inset-x-3 bottom-0.5 h-px origin-left bg-lime transition-transform duration-300",
                              showMenu ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <div className={cn("grid transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", inFeatures ? "grid-cols-[1fr]" : "grid-cols-[0fr]")}>
                      <div className="min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {FEATURES.map((feature, i) => {
                            const here = i === activeFeature;
                            return (
                              <a
                                key={feature.id}
                                href={`#${feature.id}`}
                                tabIndex={inFeatures ? 0 : -1}
                                aria-current={here ? "true" : undefined}
                                className={cn(
                                  "group relative flex items-center rounded-md px-3 py-2 font-mono text-[13px] transition-[color,opacity,translate] duration-300",
                                  inFeatures ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                                  here ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                                style={{ transitionDelay: inFeatures ? `${150 + i * 45}ms` : "0ms", color: here ? feature.color : undefined }}
                              >
                                {feature.short}
                                {/* Inside the link: the unfolding wrapper clips anything below it */}
                                <span
                                  aria-hidden
                                  className={cn(
                                    "absolute inset-x-3 bottom-0.5 h-px origin-left transition-transform duration-300",
                                    here ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                  )}
                                  style={{ background: feature.color }}
                                />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <CtaLink href="/sign-in" variant="terminal" size="sm" prompt>
            Sign in
          </CtaLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid size-9 place-items-center rounded-lg transition-colors hover:bg-muted lg:hidden"
          >
            <span className={cn("absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300", open ? "rotate-45" : "-translate-y-[3px]")} />
            <span className={cn("absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-300", open ? "-rotate-45" : "translate-y-[3px]")} />
          </button>
        </div>
      </div>

      {/* Outside Features: the bar unfolds into the five parts, as a row of cards */}
      <div
        data-features-menu
        className={cn(
          "hidden transition-[grid-template-rows] ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid",
          showMenu ? "grid-rows-[1fr] duration-500" : "grid-rows-[0fr] delay-100 duration-300"
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!showMenu}>
          <ul id="features-menu" aria-label="Features" className="mx-auto grid max-w-[1200px] grid-cols-5 gap-3 px-5 pt-1 pb-5 sm:px-8">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <li
                  key={feature.id}
                  className={cn(
                    "transition-[opacity,translate,scale,filter] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    showMenu
                      ? "translate-y-0 scale-100 opacity-100 blur-0 duration-500"
                      : "-translate-y-3 scale-[0.97] opacity-0 blur-[3px] duration-200"
                  )}
                  // Opening, the cards drop in left to right; closing, they lift out right to left
                  style={{ transitionDelay: `${showMenu ? 60 + i * 40 : (FEATURES.length - 1 - i) * 25}ms` }}
                >
                  <a
                    href={`#${feature.id}`}
                    onClick={() => setMenu(false)}
                    className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border bg-card/70 p-3.5 outline-none transition-[border-color,background-color,translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--c)_50%,transparent)] hover:bg-card hover:shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--c)_45%,transparent)] focus-visible:border-(--c)"
                    style={{ "--c": feature.color } as React.CSSProperties}
                  >
                    {/* On hover, the part's colour glows from the corner behind the arrow and draws in along the top edge */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: "radial-gradient(120px circle at 100% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%)" }}
                    />
                    <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-(--c) transition-transform duration-300 group-hover:scale-x-100" />

                    <span className="relative flex items-start justify-between">
                      <span className="grid size-8 place-items-center rounded-md border border-[color-mix(in_srgb,var(--c)_22%,transparent)] bg-[color-mix(in_srgb,var(--c)_10%,transparent)] text-(--c) transition-transform duration-300 group-hover:scale-105">
                        <Icon className="size-4" />
                      </span>
                      {/* The index gives way to an arrow on hover */}
                      <span className="relative font-mono text-[10.5px] text-muted-foreground/60">
                        <span className="block transition-[opacity,translate] duration-200 group-hover:-translate-y-1 group-hover:opacity-0">{feature.index}</span>
                        <ArrowUpRight className="absolute top-0 right-0 size-4 translate-y-1 text-(--c) opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-y-0 group-hover:opacity-100" />
                      </span>
                    </span>

                    <span className="relative mt-3 flex items-center gap-2 text-[13.5px] font-medium text-foreground">
                      {feature.name}
                      {feature.pro ? <span className="rounded-sm border border-coral/30 px-1 font-mono text-[9.5px] text-coral">PRO</span> : null}
                    </span>
                    <span className="relative mt-1 text-[12px] leading-snug text-muted-foreground">{feature.text}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Reading progress along the bottom edge */}
      <span
        aria-hidden
        className={cn("absolute inset-x-0 -bottom-px h-px origin-left bg-lime transition-opacity", solid ? "opacity-100" : "opacity-0")}
        style={{ transform: "scaleX(var(--p, 0))" }}
      />

      {open ? (
        <nav id="landing-mobile-nav" data-lenis-prevent aria-label="Sections" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border px-5 pb-5 lg:hidden">
          {TOP.map((link, i) => (
            <div key={link.id} className="border-b border-border animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
              <a href={link.href} onClick={() => setOpen(false)} className="flex items-center gap-3 py-3.5 text-base">
                <span className="font-mono text-xs text-lime">{link.index}</span>
                {link.label}
              </a>
              {link.id === "features" ? (
                <div className="-mt-1 mb-2.5 ml-7 space-y-0.5 border-l border-border pl-3">
                  {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <a
                        key={feature.id}
                        href={`#${feature.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 py-1.5 text-[15px] text-muted-foreground"
                      >
                        <Icon className="size-3.5" style={{ color: feature.color }} />
                        {feature.name}
                        {feature.pro ? <span className="rounded border border-coral/30 px-1 font-mono text-[9.5px] text-coral">PRO</span> : null}
                        <span className="ml-auto font-mono text-[11px] text-muted-foreground/60">{feature.index}</span>
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      ) : null}
    </header>
    </>
  );
}
