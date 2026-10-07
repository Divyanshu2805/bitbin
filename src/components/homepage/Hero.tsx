"use client";

import { useEffect } from "react";
import { useTransitionRouter } from "@/components/shared/transition-link";
import { useTypewriter } from "@/hooks/use-motion";
import { readableColor } from "@/lib/utils/color";
import IdeDemo from "./IdeDemo";
import { CtaLink } from "./ui";

const WORDS = ["snippet", "prompt", "command", "note", "link"] as const;
const COLORS: Record<(typeof WORDS)[number], string> = {
  snippet: "#60a5fa",
  prompt: "#a78bfa",
  command: "#fb923c",
  note: "#fde047",
  link: "#34d399",
};

/** "Every snippet▌": the word types itself out, deletes, and becomes the next type. */
function TypedWord() {
  const { text, index } = useTypewriter(WORDS, { typeMs: 70, deleteMs: 40, holdMs: 1800 });
  const color = readableColor(COLORS[WORDS[index]]);
  return (
    <span className="inline-block min-w-[7.6ch] whitespace-nowrap text-left" style={{ color }}>
      {text}
      <span
        aria-hidden
        className="ml-1 inline-block h-[0.9em] w-[0.08em] translate-y-[0.1em] animate-blink"
        style={{ background: color }}
      />
    </span>
  );
}

export default function Hero() {
  const router = useTransitionRouter();

  // The ⏎ on "Start for free" is real: Enter, with nothing else focused, starts sign-up.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat || document.activeElement !== document.body) return;
      if (window.scrollY > window.innerHeight) return;
      router.push("/register");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <section id="top" className="relative isolate overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-32">
      {/* No backdrop of its own: the page-wide one (LandingBackdrop) runs behind every section */}

      <div className="mx-auto max-w-[1200px] px-5 text-center sm:px-8">
        <h1
          className="mx-auto max-w-5xl font-display text-[clamp(2.3rem,6.4vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.055em] animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <span className="sr-only">Every snippet, prompt and command you copy-paste twice, in one bin.</span>
          <span aria-hidden>
            Every <TypedWord />
            <br />
            you copy-paste twice,
            <br />
            <span className="text-brand-gradient">in one bin.</span>
          </span>
        </h1>

        <p
          className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-desc animate-fade-up sm:text-xl"
          style={{ animationDelay: "180ms" }}
        >
          BitBin is a keyboard-first home for developer knowledge. Save code, prompts, commands, notes, files and links
          once, and find any of them again with <span className="kbd align-middle">⌘</span>{" "}
          <span className="kbd align-middle">K</span>.
        </p>

        <div
          className="mt-10 flex flex-col items-center justify-center gap-3 animate-fade-up sm:flex-row"
          style={{ animationDelay: "260ms" }}
        >
          <CtaLink href="/register" variant="terminal" prompt>
            Get started for free
          </CtaLink>
        </div>
        <p className="mt-5 font-mono text-xs text-faint dark:text-muted-foreground/70 animate-fade-up" style={{ animationDelay: "320ms" }}>
          free forever plan · no credit card
        </p>
      </div>

      {/* The demo, as wide as the sections below */}
      <div className="mx-auto mt-16 max-w-[1200px] px-5 animate-fade-up sm:mt-20 sm:px-8" style={{ animationDelay: "420ms" }}>
        <IdeDemo />
      </div>
    </section>
  );
}
