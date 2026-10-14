"use client";

import { useEffect, useRef, useState } from "react";
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
// The links, always in the bar: Why BitBin, the five feature sections (01.1–01.5),
// Pricing, FAQ.
const LINKS = [
  { id: "how", index: "00", label: "Why BitBin", name: "Why BitBin", color: "var(--brand-lime)" },
  ...FEATURES.map((f) => ({ id: f.id, index: f.index, label: f.short, name: f.name, color: f.color, pro: f.pro, icon: f.icon })),
  { id: "pricing", index: "02", label: "Pricing", name: "Pricing", color: "var(--brand-lime)" },
  { id: "faq", index: "03", label: "FAQ", name: "FAQ", color: "var(--brand-lime)" },
];

const IDS = LINKS.map((link) => link.id);

type Rect = { x: number; w: number };

export default function Navbar() {
  const scrolled = useScrolled();
  const active = useScrollSpy(IDS);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  // True as the hover card appears, so it starts on the link instead of sliding in from the last one
  const [snap, setSnap] = useState(false);
  const [rects, setRects] = useState<Rect[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLElement | null)[]>([]);

  const currentIndex = scrolled ? LINKS.findIndex((link) => link.id === active) : -1;

  // Where each link sits in the track
  const measure = () => {
    if (!trackRef.current) return;
    setRects(linkRefs.current.map((el) => (el ? { x: el.offsetLeft, w: el.offsetWidth } : { x: 0, w: 0 })));
  };

  // Kept current as fonts load and the window resizes
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    linkRefs.current.forEach((el) => el && observer.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pointAt = (i: number) => {
    if (rects.length === 0) measure();
    setHover(i);
  };

  const hoverRect = hover === null ? undefined : rects[hover];
  const showHover = hover !== null && hover !== currentIndex && hoverRect !== undefined;
  const currentRect = currentIndex >= 0 ? rects[currentIndex] : undefined;
  const colorOf = (i: number | null) => (i === null || i < 0 ? undefined : LINKS[i].color);

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
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled || open
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
                  "--c": colorOf(hover),
                  "--x": `${hoverRect?.x ?? 0}px`,
                  width: hoverRect?.w ?? 0,
                  opacity: showHover ? 1 : 0,
                } as React.CSSProperties
              }
            />

            <ul className="relative flex items-center gap-0.5">
              {LINKS.map((link, i) => (
                <li key={link.id}>
                  <a
                    ref={(el) => {
                      linkRefs.current[i] = el;
                    }}
                    href={`#${link.id}`}
                    aria-current={i === currentIndex ? "true" : undefined}
                    onPointerEnter={() => pointAt(i)}
                    onFocus={() => pointAt(i)}
                    onBlur={() => setHover(null)}
                    className={cn(
                      "relative flex h-9 items-center rounded-[10px] px-3.5 text-[13.5px] whitespace-nowrap transition-colors duration-300",
                      i === currentIndex || hover === i ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
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

      {open ? (
        <nav id="landing-mobile-nav" data-lenis-prevent aria-label="Sections" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border px-5 pb-4 sm:px-8 lg:hidden">
          {LINKS.map((link, i) => {
            const Icon = "icon" in link ? link.icon : null;
            return (
              <div key={link.id} className="animate-fade-up border-b border-border" style={{ animationDelay: `${i * 35}ms` }}>
                <a href={`#${link.id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 py-3.5 text-base">
                  {Icon ? <Icon className="size-4" style={{ color: link.color }} /> : <span className="font-mono text-xs text-lime">{link.index}</span>}
                  {link.name}
                  {"pro" in link && link.pro ? <span className="rounded border border-coral/30 px-1 font-mono text-[9.5px] text-coral">PRO</span> : null}
                  <span className="ml-auto font-mono text-[11px] text-faint">{link.index}</span>
                </a>
              </div>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
