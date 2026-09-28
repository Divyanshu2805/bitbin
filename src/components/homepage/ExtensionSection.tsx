"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Keyboard, ListChecks, MousePointer2, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import ExtensionDemo, { EXT_LOOP, KEYS_AT, POPUP_CLOSE, POPUP_OPEN, SAVE, SUGGEST } from "./ExtensionDemo";
import ExtensionAppDemo from "./ExtensionAppDemo";
import { Accent, Section } from "./ui";

// The browser extension, end to end, on a loop while on screen: in Chrome
// (ExtensionDemo) a cursor selects some code, the shortcut opens the popup,
// it suggests tags and saves; beside it, BitBin (ExtensionAppDemo) shows the
// snippet arrive. The steps underneath light up as each one happens.

const TICK = 100;

const STEPS: { icon: LucideIcon; title: string; text: string; from: number; to: number }[] = [
  { icon: MousePointer2, title: "Select", text: "Code, a command or a paragraph, on any page.", from: 0, to: KEYS_AT[0] },
  { icon: Keyboard, title: "Shortcut", text: "Ctrl+Shift+B, ⌘⇧B on macOS, or right-click › BitBin.", from: KEYS_AT[0], to: POPUP_OPEN },
  { icon: ListChecks, title: "Check", text: "Type, title and language are guessed for you.", from: POPUP_OPEN, to: SUGGEST },
  { icon: Sparkles, title: "Tag", text: "One click and AI fills them in.", from: SUGGEST, to: SAVE },
  { icon: Check, title: "Saved", text: "In your bin, with a link back to the page.", from: SAVE, to: POPUP_CLOSE },
];

export default function ExtensionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const paused = usePagePaused();
  const [t, setT] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!inView || still || hovered || paused) return;
    const id = window.setInterval(() => setT((v) => (v + TICK) % EXT_LOOP), TICK);
    return () => window.clearInterval(id);
  }, [inView, still, hovered, paused]);

  // Reduced motion: saved, with the snippet in the app
  const ext = still ? 4500 : t;
  // How far along the track the fill is: node i sits at i/4, and it moves on
  // through each step in proportion; full once saved, empty after the popup closes.
  const stepIndex = STEPS.findIndex((step) => ext >= step.from && ext < step.to);
  const progress =
    ext >= POPUP_CLOSE || stepIndex < 0
      ? 0
      : Math.min(1, (stepIndex + (ext - STEPS[stepIndex].from) / (STEPS[stepIndex].to - STEPS[stepIndex].from)) / (STEPS.length - 1));

  return (
    <Section
      id="extension"
      index="01.4"
      label="extension · pro"
      accent="var(--brand-cyan)"
      title={
        <>
          Save from <Accent>any page.</Accent>
        </>
      }
      description="Select something on any page and press one shortcut. The BitBin extension for Chrome and Edge fills in the details and files it in your bin."
    >
      <div ref={ref}>
        {/* Chrome on the left, BitBin on the right; pausing on hover */}
        <div
          data-reveal
          className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
          onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <ExtensionDemo t={ext} />
          <ExtensionAppDemo t={ext} />
        </div>

        {/* The steps as one track: nodes joined by a line that fills as the demo goes */}
        <div className="mt-6 rounded-2xl border border-border bg-card/50 px-3 pt-5 pb-4 backdrop-blur-sm sm:px-6">
          <ol className="relative grid grid-cols-5">
            <span aria-hidden className="absolute top-4 right-[10%] left-[10%] h-px bg-border" />
            <span
              aria-hidden
              className="absolute top-4 left-[10%] h-px w-[80%] origin-left bg-gradient-to-r from-lime to-cyan"
              style={{ transform: `scaleX(${progress})`, transition: `transform ${TICK}ms linear` }}
            />
            {STEPS.map((step) => {
              const Icon = step.icon;
              const current = ext >= step.from && ext < step.to;
              const past = ext >= step.to && ext < POPUP_CLOSE;
              return (
                <li key={step.title} className="relative flex flex-col items-center px-1 text-center">
                  <span
                    className={cn(
                      "relative z-10 grid size-8 place-items-center rounded-full border bg-background transition-[color,border-color,box-shadow] duration-300",
                      current
                        ? "border-cyan text-cyan shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-cyan)_12%,transparent),0_0_18px_-2px_var(--brand-cyan)]"
                        : past
                          ? "border-lime/60 text-lime"
                          : "border-border text-muted-foreground"
                    )}
                  >
                    {past ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  <span className={cn("mt-2.5 text-[12.5px] font-semibold transition-colors sm:text-[13.5px]", current || past ? "text-foreground" : "text-muted-foreground")}>
                    {step.title}
                  </span>
                  <span className="mt-0.5 hidden max-w-[190px] text-[12px] leading-snug text-muted-foreground sm:block">{step.text}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">Chrome and Edge · needs a Pro token from Settings</p>
      </div>
    </Section>
  );
}
