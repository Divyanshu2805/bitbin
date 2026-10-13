"use client";

import { useState } from "react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./ui";

// The FAQ: an accordion of questions, one open at a time (all closed to start).
// The open card keeps its surface; only its toggle is filled like a button, and the
// logo sits under its number, catching bits for as long as the answer is open.
// Orange parts of an answer pick out the facts that matter.

type Part = string | [highlight: string];

const FAQS: { q: string; a: Part[] }[] = [
  {
    q: "what can I keep in the bin?",
    a: [
      "Seven types: ",
      ["snippets, prompts, commands, notes and links"],
      " on every plan, plus ",
      ["files and images on Pro"],
      ". Every item takes a title, description, tags and any number of collections.",
    ],
  },
  {
    q: "is there really a free plan?",
    a: ["Yes. ", ["50 items and 3 collections"], ", with search, tags, favorites and pins. Upgrade when the bin gets full, and cancel whenever you like."],
  },
  {
    q: "can I get my data out?",
    a: [
      "Any time, from Settings. Export everything as ",
      ["JSON"],
      " on any plan, or as a ",
      ["ZIP that includes your files"],
      " on Pro. Either one imports back in, after a preview of what it holds.",
    ],
  },
  {
    q: "what does the AI see?",
    a: [
      ["Only the item you're working on"],
      ", and only when you press one of the AI buttons: suggest tags, write a description, explain code, or optimize a prompt. ",
      ["Nothing runs in the background."],
    ],
  },
  {
    q: "can I save without opening BitBin?",
    a: [
      "On Pro, yes. The ",
      ["Chrome/Edge extension"],
      " saves a selection with ",
      ["Ctrl+Shift+B"],
      ", the ",
      ["desktop tray app"],
      " saves your clipboard from any app with ",
      ["Ctrl+Alt+B"],
      ", and a token from Settings connects your scripts, or an AI assistant over MCP.",
    ],
  },
  {
    q: "is it keyboard friendly?",
    a: [
      "It's keyboard first. ",
      ["⌘K"],
      " searches everything, and in the app you can press ",
      ["?"],
      " to see every shortcut, from new items to jumping between pages.",
    ],
  },
];

function Answer({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? part : (
          <span key={i} className="font-semibold text-[color-mix(in_srgb,var(--brand-lime)_45%,var(--foreground))]">
            {part[0]}
          </span>
        )
      )}
    </>
  );
}

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (i: number) => setOpen((current) => (current === i ? null : i));

  return (
    <section id="faq" className="scroll-mt-24 py-24 sm:py-32" style={{ "--accent": "var(--brand-lime)" } as React.CSSProperties}>
      <div className="mx-auto grid max-w-(--landing-max) grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            index="04"
            label="faq"
            title="Questions, answered."
            description="Anything else? Sign in and press ? for shortcuts, or open Settings for your data and billing."
          />
        </div>

        {/* One card per question: a mono index, the question, and a toggle whose + folds into a − */}
        <ol data-scroll="stack" className="space-y-2.5 text-foreground">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                key={item.q}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border transition-[background-color,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isOpen ? "bg-card" : "bg-card hover:-translate-y-px"
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => toggle(i)}
                  className="relative flex w-full items-center gap-4 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40"
                >
                  <span
                    className={cn(
                      "w-6 shrink-0 font-mono text-xs tabular-nums transition-colors duration-300",
                      isOpen ? "text-[color-mix(in_srgb,var(--brand-lime)_45%,var(--foreground))]" : "text-faint dark:text-muted-foreground/60 group-hover:text-lime/80"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-[15px] font-medium transition-colors duration-300",
                      isOpen ? "text-foreground" : "text-foreground/85 group-hover:text-foreground"
                    )}
                  >
                    {item.q.charAt(0).toUpperCase() + item.q.slice(1)}
                  </span>
                  {/* Two bars: the upright one folds away, so + becomes − */}
                  <span
                    aria-hidden
                    className={cn(
                      "relative grid size-8 shrink-0 place-items-center rounded-lg border transition-[background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isOpen
                        ? "border-lime bg-lime text-primary-foreground"
                        : "border-border text-muted-foreground group-hover:border-lime/40 group-hover:text-lime"
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
                        "relative mr-5 ml-[3.75rem] border-t border-foreground/15 pt-3.5 pb-5 transition-[opacity,translate] duration-300 sm:mr-16",
                        isOpen ? "translate-y-0 opacity-100 delay-75" : "-translate-y-1 opacity-0"
                      )}
                    >
                      {/* In the gutter under the index; it only runs while this answer is open */}
                      <LogoMark animated={isOpen} className="absolute top-3.5 -left-10 size-6" />
                      <p className="text-sm leading-relaxed text-foreground/90">
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
