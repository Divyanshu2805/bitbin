"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useScrolled, useScrollSpy } from "@/hooks/use-motion";
import { FEATURES } from "./features";
import { CtaLink } from "./ui";

// A flat bar across the top of the page: the logo and the sections on the left,
// Sign in on the right. One card highlights the links (`.nav-pill` in
// landing.css): the section you are in is a solid card popped up out of the bar,
// in its colour, and it glides to the next link as you scroll; the link under the
// pointer (or keyboard focus) gets a lighter card of the same shape, which slides
// from link to link instead of jumping.
// The page's top level: Why BitBin, Features, Privacy, Pricing, FAQ. Features is a
// group of five sections (01.1–01.5): hovering or clicking it opens a panel under
// the bar, as Claude's menus do: a column per group, a small heading over plain
// links, the one you are in in its colour. Once you scroll into one of the five,
// "Features" unfolds in place into those five links, the card on the one you are
// in; it folds back up when you leave.
const TOP = [
  { id: "how", href: "#how", index: "00", label: "Why BitBin", color: "var(--brand-lime)" },
  { id: "features", href: "#types", index: "01", label: "Features", color: "var(--brand-lime)" },
  { id: "privacy", href: "#privacy", index: "02", label: "Privacy", color: "var(--brand-green)" },
  { id: "pricing", href: "#pricing", index: "03", label: "Pricing", color: "var(--brand-lime)" },
  { id: "faq", href: "#faq", index: "04", label: "FAQ", color: "var(--brand-lime)" },
] as const;

const FEATURE_IDS = FEATURES.map((f) => f.id);
const IDS = ["how", ...FEATURE_IDS, "privacy", "pricing", "faq"];
const FEATURES_INDEX = TOP.findIndex((link) => link.id === "features");
// The Features panel's columns, as Claude lays out its menus: a small heading over plain links
const GROUPS = [
  { title: "Organize", ids: ["types", "keys"] },
  { title: "AI", ids: ["agents", "ai"] },
  { title: "Capture", ids: ["extension"] },
].map((group) => ({ ...group, items: FEATURES.filter((f) => group.ids.includes(f.id)) }));
// How long the panel waits before closing once the pointer leaves, so a diagonal move into it doesn't shut it
const CLOSE_DELAY = 160;

type Rect = { x: number; w: number };
// The highlight cards address a link by number: a top-level link by its index, a feature link by FEATURE_KEY + its index
const FEATURE_KEY = 100;

export default function Navbar() {
  const scrolled = useScrolled();
  const active = useScrollSpy(IDS);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  // True as the hover card appears, so it starts on the link instead of sliding in from the last one
  const [snap, setSnap] = useState(false);
  const [rects, setRects] = useState<Rect[]>([]);
  const [featureRects, setFeatureRects] = useState<Rect[]>([]);
  // Where the links start, so the panel's columns line up under them
  const [navLeft, setNavLeft] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLElement | null)[]>([]);
  const featureRefs = useRef<(HTMLElement | null)[]>([]);
  const closeTimer = useRef<number | undefined>(undefined);

  const activeFeature = FEATURE_IDS.indexOf(active ?? "");
  // Inside the five feature sections the bar is unfolded: "Features" gives way to a link for each
  const unfolded = scrolled && activeFeature >= 0;
  const currentIndex = !scrolled
    ? -1
    : unfolded
      ? FEATURE_KEY + activeFeature
      : TOP.findIndex((link) => link.id !== "features" && active === link.id);
  // The panel has nothing to add while the five links are in the bar itself
  const showMenu = menu && !unfolded;
  const rectOf = (key: number | null) => (key === null ? undefined : key >= FEATURE_KEY ? featureRects[key - FEATURE_KEY] : rects[key]);
  const colorOf = (key: number | null) =>
    key === null || key < 0 ? undefined : key >= FEATURE_KEY ? FEATURES[key - FEATURE_KEY].color : TOP[key].color;

  // Where each link sits in the track, and where the track starts on the page
  const measure = () => {
    const track = trackRef.current;
    if (!track) return;
    const rect = (el: HTMLElement | null) => (el ? { x: el.offsetLeft, w: el.offsetWidth } : { x: 0, w: 0 });
    setRects(linkRefs.current.map(rect));
    setFeatureRects(featureRefs.current.map(rect));
    setNavLeft(track.getBoundingClientRect().left);
  };

  // Kept current as fonts load, the window resizes and the bar unfolds (the track's width changes every frame of that)
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    linkRefs.current.forEach((el) => el && observer.observe(el));
    // The links move with the window even when their size doesn't
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

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

  // Scrolling the page closes the panel: the wheel at once, the scroll listener
  // catches the scrollbar, keys and touch
  useEffect(() => {
    if (!menu) return;
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
  }, [menu]);

  // While the panel is open the page behind it holds still: LandingBackdrop and
  // the CSS in globals.css pause on this attribute
  useEffect(() => {
    document.documentElement.toggleAttribute("data-features-open", showMenu);
    return () => document.documentElement.removeAttribute("data-features-open");
  }, [showMenu]);

  const openMenu = () => {
    window.clearTimeout(closeTimer.current);
    measure();
    setMenu(true);
  };
  const closeMenuSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(false), CLOSE_DELAY);
  };

  const pointAt = (i: number) => {
    if (rects.length === 0) measure();
    setHover(i);
  };

  // The panel keeps "Features" lit while the pointer is inside it
  const lit = hover ?? (showMenu ? FEATURES_INDEX : null);
  const hoverRect = rectOf(lit);
  const showHover = lit !== null && lit !== currentIndex && hoverRect !== undefined;
  const currentRect = currentIndex >= 0 ? rectOf(currentIndex) : undefined;

  // Each time the hover card comes into view it starts where it is needed instead of sliding
  // in from wherever it was last; the snap is lifted two frames later
  const [wasShown, setWasShown] = useState(false);
  if (showHover !== wasShown) {
    setWasShown(showHover);
    if (showHover) setSnap(true);
  }
  useEffect(() => {
    if (!snap) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSnap(false));
    });
    return () => cancelAnimationFrame(frame);
  }, [snap]);

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
        onPointerEnter={() => window.clearTimeout(closeTimer.current)}
        onPointerLeave={(event) => event.pointerType === "mouse" && closeMenuSoon()}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled || showMenu || open
            ? "border-border bg-background/90 shadow-[0_10px_30px_-24px_rgb(0_0_0/0.6)] backdrop-blur-md"
            : "border-transparent bg-background"
        )}
      >
        <div className="mx-auto flex h-16 max-w-(--landing-max) items-center gap-2 px-5 sm:px-8">
          <a href="#top" aria-label="BitBin, back to top" className="shrink-0 rounded-lg">
            <Logo animated />
          </a>

          <nav aria-label="Sections" className="ml-6 hidden lg:block">
            <div ref={trackRef} className="relative" onPointerLeave={() => setHover(null)}>
              {/* The section you are in: a solid card that glides between links */}
              <span
                aria-hidden
                className={cn("nav-pill is-current", hover === currentIndex && "is-lifted")}
                style={
                  {
                    "--c": colorOf(currentIndex),
                    "--x": `${currentRect?.x ?? 0}px`,
                    width: currentRect?.w ?? 0,
                    opacity: currentRect ? 1 : 0,
                  } as React.CSSProperties
                }
              />
              {/* Under the pointer: the same card, lighter */}
              <span
                aria-hidden
                className={cn("nav-pill is-hover", snap && "is-snapping")}
                style={
                  {
                    "--c": colorOf(lit),
                    "--x": `${hoverRect?.x ?? 0}px`,
                    width: hoverRect?.w ?? 0,
                    opacity: showHover ? 1 : 0,
                  } as React.CSSProperties
                }
              />

              <ul className="relative flex items-center gap-0.5">
                {TOP.map((link, i) => {
                  const isCurrent = i === currentIndex;
                  const className = cn(
                    "relative flex h-9 items-center gap-1 rounded-[10px] px-3.5 text-[13.5px] whitespace-nowrap transition-colors duration-300",
                    isCurrent || lit === i ? "text-foreground" : "text-muted-foreground"
                  );
                  const handlers = {
                    onPointerEnter: (event: React.PointerEvent) => {
                      pointAt(i);
                      if (event.pointerType !== "mouse") return;
                      if (link.id === "features") openMenu();
                      else closeMenuSoon();
                    },
                    onFocus: () => pointAt(i),
                    onBlur: () => setHover(null),
                  };

                  if (link.id === "features") {
                    return (
                      <li key={link.id} className="flex items-center">
                        {/* "Features ▾" folds away as the five links unfold */}
                        <div className={cn("grid transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", unfolded ? "grid-cols-[0fr]" : "grid-cols-[1fr]")}>
                          <div className="min-w-0 overflow-hidden" inert={unfolded}>
                            <button
                              ref={(el) => {
                                linkRefs.current[i] = el;
                              }}
                              type="button"
                              data-features-menu
                              aria-expanded={showMenu}
                              aria-controls="features-menu"
                              onClick={() => (menu ? setMenu(false) : openMenu())}
                              className={className}
                              {...handlers}
                            >
                              {link.label}
                              <ChevronDown className={cn("size-3.5 opacity-70 transition-transform duration-300", showMenu && "rotate-180")} />
                            </button>
                          </div>
                        </div>
                        <div className={cn("grid transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", unfolded ? "grid-cols-[1fr]" : "grid-cols-[0fr]")}>
                          <div className="min-w-0 overflow-hidden" inert={!unfolded}>
                            <div className="flex items-center gap-0.5">
                              {FEATURES.map((feature, f) => {
                                const key = FEATURE_KEY + f;
                                const here = key === currentIndex;
                                return (
                                  <a
                                    key={feature.id}
                                    ref={(el) => {
                                      featureRefs.current[f] = el;
                                    }}
                                    href={`#${feature.id}`}
                                    aria-current={here ? "true" : undefined}
                                    onPointerEnter={() => pointAt(key)}
                                    onFocus={() => pointAt(key)}
                                    onBlur={() => setHover(null)}
                                    className={cn(
                                      "relative flex h-9 items-center rounded-[10px] px-3.5 text-[13.5px] whitespace-nowrap transition-[color,opacity,translate] duration-300",
                                      unfolded ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                                      here || lit === key ? "text-foreground" : "text-muted-foreground"
                                    )}
                                    // Unfolding, the five come in left to right; folding, they go together
                                    style={{ transitionDelay: unfolded ? `${120 + f * 45}ms` : "0ms" }}
                                  >
                                    {feature.short}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={link.id}>
                      <a
                        ref={(el) => {
                          linkRefs.current[i] = el;
                        }}
                        href={link.href}
                        aria-current={isCurrent ? "true" : undefined}
                        className={className}
                        {...handlers}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <CtaLink href="/sign-in" variant="secondary" size="sm">
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

        {/* The Features panel: drops in under the bar, a column per group of plain links */}
        <div
          data-features-menu
          inert={!showMenu}
          className={cn(
            "absolute inset-x-0 top-full hidden border-b border-border bg-background/95 backdrop-blur-md transition-[opacity,translate,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
            showMenu ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1.5 opacity-0"
          )}
        >
          <ul id="features-menu" aria-label="Features" className="flex gap-16 pt-5 pb-8" style={{ paddingLeft: navLeft + 14 }}>
            {GROUPS.map((group, g) => (
              <li
                key={group.title}
                className={cn(
                  "min-w-[180px] transition-[opacity,translate] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  showMenu ? "translate-y-0 opacity-100 duration-500" : "-translate-y-1 opacity-0 duration-150"
                )}
                // Opening, the columns come in left to right; closing, they go together
                style={{ transitionDelay: showMenu ? `${50 + g * 45}ms` : "0ms" }}
              >
                <p className="mb-2 text-[12px] text-muted-foreground">{group.title}</p>
                <ul>
                  {group.items.map((feature) => {
                    const here = scrolled && active === feature.id;
                    return (
                      <li key={feature.id}>
                        <a
                          href={`#${feature.id}`}
                          onClick={() => setMenu(false)}
                          aria-current={here ? "true" : undefined}
                          className={cn(
                            "group flex items-center gap-2 py-1.5 text-[15px] transition-colors duration-200",
                            here ? "text-(--c)" : "text-foreground/75 hover:text-foreground"
                          )}
                          style={{ "--c": feature.color } as React.CSSProperties}
                        >
                          <span className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">{feature.name}</span>
                          {feature.pro ? <span className="rounded-sm border border-coral/30 px-1 font-mono text-[9.5px] text-coral">PRO</span> : null}
                          {here ? <span aria-hidden className="size-1.5 rounded-full bg-(--c)" /> : null}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        {open ? (
          <nav id="landing-mobile-nav" data-lenis-prevent aria-label="Sections" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border px-5 pb-4 sm:px-8 lg:hidden">
            {TOP.map((link, i) => (
              <div key={link.id} className="animate-fade-up border-b border-border" style={{ animationDelay: `${i * 35}ms` }}>
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
                          <span className="ml-auto font-mono text-[11px] text-faint dark:text-muted-foreground/60">{feature.index}</span>
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
