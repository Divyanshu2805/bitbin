import { ArrowDown } from "lucide-react";
import HeroVideo from "./HeroVideo";
import HeroLogo from "./HeroLogo";
import HeroSort from "./HeroSort";
import { CtaLink } from "./ui";

// The hero is taller than the screen and pins its contents (.hero-pin) while the page scrolls
// through it: the words in the middle of a ring of cards, then the bin they are sorted into (HeroSort).
export default function Hero() {
  return (
    <section id="top" className="landing-hero relative isolate">
      <div className="hero-pin">
        {/* Behind everything: footage of a screen at work, then a warm light under the words, and a fine grain */}
        <HeroVideo />
        <div aria-hidden className="hero-backdrop" />
        <div className="landing-hero-copy">
          <HeroLogo />
          <h1 className="landing-headline animate-fade-up" style={{ animationDelay: "80ms" }}>
            <span className="hero-line"><span>A home for</span></span>
            <span className="hero-line"><span>everything</span></span>
            <span className="hero-line">
              <span>
                you know.
                {/* A pen stroke that draws itself under the last line */}
                <svg aria-hidden className="hero-underline" viewBox="0 0 300 18" preserveAspectRatio="none" fill="none">
                  <path pathLength={100} d="M3 12 C 60 3, 120 3, 170 9 S 262 15, 297 6" />
                </svg>
              </span>
            </span>
          </h1>
          <p className="landing-hero-description animate-fade-up" style={{ animationDelay: "160ms" }}>
            Good ideas deserve better than forgotten tabs.
          </p>
          <div className="landing-hero-actions animate-fade-up" style={{ animationDelay: "240ms" }}>
            <CtaLink href="/register">Try BitBin</CtaLink>
            <a href="#how" className="landing-tour-link">
              <span>See it in action</span>
              {/* Two arrows in a ring: one drops out of it as the next drops in */}
              <span aria-hidden className="tour-arrow"><ArrowDown /><ArrowDown /></span>
            </a>
          </div>
        </div>
        <HeroSort />
      </div>
    </section>
  );
}
