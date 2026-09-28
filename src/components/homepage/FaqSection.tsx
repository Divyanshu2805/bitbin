"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./ui";

// The FAQ: an accordion of questions, one open at a time (the first to start).
// Coloured parts of an answer pick out the facts that matter.

type Part = string | [text: string, tone: "lime" | "cyan" | "coral"];

const FAQS: { q: string; a: Part[] }[] = [
  {
    q: "what can I keep in the bin?",
    a: [
      "Seven types: ",
      ["snippets, prompts, commands, notes and links", "cyan"],
      " on every plan, plus ",
      ["files and images on Pro", "lime"],
      ". Every item takes a title, description, tags and any number of collections.",
    ],
  },
  {
    q: "is there really a free plan?",
    a: ["Yes. ", ["50 items and 3 collections", "lime"], ", with search, tags, favorites and pins. Upgrade when the bin gets full, and cancel whenever you like."],
  },
  {
    q: "can I get my data out?",
    a: [
      "Any time, from Settings. Export everything as ",
      ["JSON", "cyan"],
      " on any plan, or as a ",
      ["ZIP that includes your files", "lime"],
      " on Pro. The same JSON imports back in.",
    ],
  },
  {
    q: "what does the AI see?",
    a: [
      ["Only the item you're working on", "lime"],
      ", and only when you press one of the AI buttons: suggest tags, write a description, explain code, or optimize a prompt. ",
      ["Nothing runs in the background.", "cyan"],
    ],
  },
  {
    q: "can I save without opening BitBin?",
    a: [
      "On Pro, yes. Install the ",
      ["Chrome/Edge extension", "cyan"],
      " and press ",
      ["Ctrl+Shift+B", "lime"],
      " on any selection, or create a token in Settings and save from your scripts and agents.",
    ],
  },
  {
    q: "is it keyboard friendly?",
    a: [
      "It's keyboard first. ",
      ["⌘K", "lime"],
      " searches everything, and in the app you can press ",
      ["?", "lime"],
      " to see every shortcut, from new items to jumping between pages.",
    ],
  },
];

const TONES = { lime: "text-lime", cyan: "text-cyan", coral: "text-coral" } as const;

function Answer({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? part : (
          <span key={i} className={cn("font-medium", TONES[part[1]])}>
            {part[0]}
          </span>
        )
      )}
    </>
  );
}

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const toggle = (i: number) => setOpen((current) => (current === i ? null : i));

  return (
    <section id="faq" className="scroll-mt-24 py-24 sm:py-32" style={{ "--accent": "var(--brand-cyan)" } as React.CSSProperties}>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            index="03"
            label="faq"
            title="Questions, answered."
            description="Anything else? Sign in and press ? for shortcuts, or open Settings for your data and billing."
          />
        </div>

        {/* One card per question: a mono index, the question, and a toggle whose + folds into a − */}
        <ol data-reveal className="space-y-2.5 text-foreground">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                key={item.q}
                className={cn(
                  "group relative overflow-hidden rounded-xl border backdrop-blur-md transition-[border-color,background-color,box-shadow,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isOpen
                    ? "border-cyan/40 bg-card shadow-[var(--shadow-lift),0_18px_40px_-24px_color-mix(in_srgb,var(--brand-cyan)_55%,transparent)]"
                    : "border-border/80 bg-card/60 hover:-translate-y-px hover:border-cyan/25 hover:bg-card/85"
                )}
              >
                {/* Open: a cyan wash from the top left, and a cyan bar down the left edge */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_srgb,var(--brand-cyan)_10%,transparent),transparent_60%)] transition-opacity duration-500",
                    isOpen ? "opacity-100" : "opacity-0"
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-3 bottom-3 left-0 w-[3px] origin-top rounded-r-full bg-cyan shadow-[0_0_12px_var(--brand-cyan)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen ? "scale-y-100" : "scale-y-0"
                  )}
                />
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => toggle(i)}
                  className="relative flex w-full items-center gap-4 px-5 py-4 text-left outline-none focus-visible:bg-muted/40"
                >
                  <span
                    className={cn(
                      "w-6 shrink-0 font-mono text-xs tabular-nums transition-colors duration-300",
                      isOpen ? "text-cyan" : "text-muted-foreground/60 group-hover:text-cyan/80"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-[15px] font-medium transition-colors duration-300",
                      isOpen ? "text-cyan" : "text-foreground/85 group-hover:text-foreground"
                    )}
                  >
                    {item.q.charAt(0).toUpperCase() + item.q.slice(1)}
                  </span>
                  {/* Two bars: the upright one folds away, so + becomes − */}
                  <span
                    aria-hidden
                    className={cn(
                      "relative grid size-8 shrink-0 place-items-center rounded-lg border transition-[background-color,border-color,color,rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isOpen
                        ? "rotate-180 border-cyan/50 bg-cyan/15 text-cyan"
                        : "border-border text-muted-foreground group-hover:border-cyan/40 group-hover:text-cyan"
                    )}
                  >
                    <span className="absolute h-[1.5px] w-3 rounded-full bg-current" />
                    <span
                      className={cn(
                        "absolute h-3 w-[1.5px] rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isOpen ? "scale-y-0" : "scale-y-100"
                      )}
                    />
                  </span>
                </button>
                <div
                  id={`faq-${i}`}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="min-h-0 overflow-hidden" inert={!isOpen}>
                    {/* Under a hairline, lined up with the question, clear of the index and the toggle */}
                    <div
                      className={cn(
                        "relative mr-5 ml-[3.75rem] border-t border-border/70 pt-3.5 pb-5 transition-[opacity,translate] duration-300 sm:mr-16",
                        isOpen ? "translate-y-0 opacity-100 delay-75" : "-translate-y-1 opacity-0"
                      )}
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <Answer parts={item.a} />
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
