"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Lightbulb, RotateCcw, Tags, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentSpinner, ResultLine } from "@/components/shared/agent-spinner";
import { prefersReducedMotion, useInView } from "@/hooks/use-motion";
import { Accent, Section, Window } from "./ui";

// The four AI helpers working on one real file, on a loop while the section is
// on screen. They run one after another, the way an agent works through steps:
// the lines each one reads light up in the file, a spinner and a progress bar
// run on its card, then the result appears under a ⎿ and lands on the file (its
// tags and description fill in below the code). Everything has a fixed height,
// so nothing moves as results come in. "Run again" restarts it.

const CODE: React.ReactNode[] = [
  <><span className="text-tok-kw">export function</span> <span className="text-tok-fn">useDebounce</span>{"<"}<span className="text-tok-type">T</span>{">(value: "}<span className="text-tok-type">T</span>{", delay = "}<span className="text-tok-num">300</span>{") {"}</>,
  <>{"  "}<span className="text-tok-kw">const</span> [debounced, setDebounced] = <span className="text-tok-fn">useState</span>(value);</>,
  <>{"  "}<span className="text-tok-fn">useEffect</span>{"(() => {"}</>,
  <>{"    "}<span className="text-tok-kw">const</span> id = <span className="text-tok-fn">setTimeout</span>{"(() => "}<span className="text-tok-fn">setDebounced</span>{"(value), delay);"}</>,
  <>{"    "}<span className="text-tok-kw">return</span> {"() => "}<span className="text-tok-fn">clearTimeout</span>(id);</>,
  <>{"  }, [value, delay]);"}</>,
  <>{"  "}<span className="text-tok-kw">return</span> debounced;</>,
  <>{"}"}</>,
];

const TAGS = ["react", "hooks", "debounce", "typescript"];
const DESCRIPTION = "A generic hook that delays updating a value until it stops changing.";

const HELPERS = [
  {
    icon: Tags,
    title: "Suggest tags",
    verb: "Tagging",
    lines: [0, 7] as const, // the lines it reads, inclusive
    result: (
      <span className="flex flex-wrap gap-1.5">
        {TAGS.map((tag, i) => (
          <span
            key={tag}
            className="animate-pop rounded-md border border-violet/30 bg-violet/10 px-2 py-0.5 text-xs text-violet"
            style={{ animationDelay: `${i * 110}ms` }}
          >
            #{tag}
          </span>
        ))}
      </span>
    ),
  },
  {
    icon: FileText,
    title: "Write a description",
    verb: "Describing",
    lines: [0, 1] as const,
    result: <span className="font-sans text-sm text-foreground/90">{DESCRIPTION}</span>,
  },
  {
    icon: Lightbulb,
    title: "Explain this code",
    verb: "Reading",
    lines: [2, 5] as const,
    result: (
      <span className="font-sans text-[13px] leading-snug">
        Every change to <code className="font-mono text-foreground">value</code> restarts a timer; only after{" "}
        <code className="font-mono text-foreground">delay</code> ms of quiet does the result update.
      </span>
    ),
  },
  {
    icon: Wand2,
    title: "Optimize a prompt",
    verb: "Rewriting",
    lines: null,
    result: (
      <span className="font-sans text-[13px] leading-snug">
        <span className="line-through opacity-60">fix my code</span>{" "}
        <span className="text-foreground/90">→ Review this TypeScript for bugs, explain each one, then suggest a fix.</span>
      </span>
    ),
  },
];

const START_MS = 600;
const STEP_MS = 1500;
const HOLD_MS = 3200; // how long the finished state stays before it runs again

export default function AiSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const [run, setRun] = useState(0);
  // How many helpers have finished; the next one is running.
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      const id = window.setTimeout(() => setDone(HELPERS.length), 0);
      return () => window.clearTimeout(id);
    }
    const timers = [window.setTimeout(() => setDone(0), 0)];
    HELPERS.forEach((_, i) => timers.push(window.setTimeout(() => setDone(i + 1), START_MS + (i + 1) * STEP_MS)));
    timers.push(window.setTimeout(() => setRun((r) => r + 1), START_MS + HELPERS.length * STEP_MS + HOLD_MS));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [inView, run]);

  const started = inView;
  const finishedAll = done >= HELPERS.length;
  const current = started && !finishedAll ? HELPERS[done] : null;
  const reading = (line: number) => !!current?.lines && line >= current.lines[0] && line <= current.lines[1];

  return (
    <Section
      id="ai"
      index="01.3"
      label="ai · pro"
      accent="var(--brand-violet)"
      title={
        <>
          Let the bin <Accent>do the busywork.</Accent>
        </>
      }
      description="BitBin reads what you save and handles the boring parts: tags, descriptions and plain-English explanations. It only runs when you press the button, on the item in front of you."
    >
      <div ref={ref} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
          <Window
            title="src/hooks/useDebounce.ts"
            right={
              <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                {current ? (
                  <span className="flex items-center gap-1.5 text-violet">
                    <span className="size-1.5 rounded-full bg-violet animate-led text-violet" />
                    {current.verb.toLowerCase()}…
                  </span>
                ) : null}
                typescript
              </span>
            }
          >
            <pre className="thin-scrollbar relative overflow-x-auto bg-card py-4 font-mono text-[13px] leading-[1.8]">
              {/* A scan line passes over the code while the helpers run */}
              {current ? (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-10 animate-[scan_2.2s_linear_infinite] bg-gradient-to-b from-transparent via-violet/10 to-transparent" />
              ) : null}
              {CODE.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "relative px-4 transition-colors duration-500",
                    reading(i) ? "bg-violet/[0.08]" : "hover:bg-violet/[0.06]"
                  )}
                >
                  {/* A marker in the gutter on the lines being read */}
                  <span
                    aria-hidden
                    className={cn("absolute inset-y-0 left-0 w-0.5 bg-violet transition-opacity duration-500", reading(i) ? "opacity-100" : "opacity-0")}
                  />
                  <span className="mr-5 inline-block w-4 select-none text-right text-faint dark:text-muted-foreground/40">{i + 1}</span>
                  {line}
                </div>
              ))}
            </pre>

            {/* What the helpers wrote back onto the item */}
            <div className="space-y-2 border-t border-border px-4 py-3 font-mono text-[11.5px]">
              <div className="flex h-6 items-center gap-2">
                <span className="w-20 shrink-0 text-faint dark:text-muted-foreground/70">tags</span>
                {done >= 1 ? (
                  <span key={`t${run}`} className="flex gap-1.5 overflow-hidden">
                    {TAGS.map((tag, i) => (
                      <span key={tag} className="animate-pop rounded bg-violet/10 px-1.5 text-violet" style={{ animationDelay: `${i * 90}ms` }}>
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="h-2 w-40 rounded bg-muted" />
                )}
              </div>
              <div className="flex h-6 items-center gap-2">
                <span className="w-20 shrink-0 text-faint dark:text-muted-foreground/70">description</span>
                {done >= 2 ? (
                  <span key={`d${run}`} className="truncate font-sans text-[12.5px] text-foreground/90 animate-[print_1s_steps(40)_both]">
                    {DESCRIPTION}
                  </span>
                ) : (
                  <span className="h-2 w-56 rounded bg-muted" />
                )}
              </div>
            </div>

            <div className="flex h-12 items-center gap-2 border-t border-border px-4 font-mono text-xs">
              {!finishedAll ? (
                <AgentSpinner verb={["Reading", "Thinking", "Tagging"]} timer className="text-xs" />
              ) : (
                <>
                  <span className="animate-pop text-lime">✓</span>
                  <span className="text-muted-foreground">4 helpers finished</span>
                  <button
                    type="button"
                    onClick={() => setRun((r) => r + 1)}
                    className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-muted-foreground transition-colors hover:border-violet/40 hover:text-violet active:scale-95"
                  >
                    <RotateCcw className="size-3" /> Run again
                  </button>
                </>
              )}
            </div>
          </Window>
        </div>

        <div className="grid content-start gap-3">
          {HELPERS.map((helper, i) => {
            const Icon = helper.icon;
            const finished = done > i;
            const running = started && done === i;
            return (
              <div
                key={helper.title}
                data-spotlight
                style={{ "--spot": "var(--brand-violet)", "--accent-color": "var(--brand-violet)", animationDelay: `${i * 100}ms` } as React.CSSProperties}
                className={cn(
                  "card-glow relative overflow-hidden rounded-xl border bg-card px-4 pt-3.5 pb-3 transition-[border-color,box-shadow] duration-500",
                  started ? "animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both]" : "opacity-0",
                  // Like an app card: a hairline tinted in its accent and a soft shadow; lit while it runs
                  running
                    ? "border-violet/40 shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-violet)_6%,transparent),var(--shadow-soft)]"
                    : "border-[color-mix(in_srgb,var(--brand-violet)_16%,var(--border))] shadow-[var(--shadow-soft)]"
                )}
              >
                <p className="flex items-center gap-2.5 font-mono text-[13px]">
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-lg transition-colors duration-500",
                      finished || running ? "bg-violet/20 text-violet" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("size-3.5", running && "animate-pulse")} />
                  </span>
                  <span className={cn("font-semibold transition-colors", finished || running ? "text-foreground" : "text-muted-foreground")}>
                    {helper.title}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {finished ? (
                      <span key={`ok${run}`} className="inline-block animate-pop text-lime">
                        ✓ done
                      </span>
                    ) : running ? (
                      <span className="text-violet">running</span>
                    ) : (
                      "queued"
                    )}
                  </span>
                </p>
                <div className="mt-2 h-10 overflow-hidden">
                  {finished ? (
                    <ResultLine className="animate-fade-in text-muted-foreground">{helper.result}</ResultLine>
                  ) : running ? (
                    <AgentSpinner verb={helper.verb} className="text-[13px]" />
                  ) : (
                    <p className="font-mono text-[13px] text-faint dark:text-muted-foreground/40">waiting…</p>
                  )}
                </div>
                {/* Progress while this helper runs */}
                {running ? (
                  <span
                    key={`p${run}`}
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-violet/70 animate-[bar-fill_linear_both]"
                    style={{ animationDuration: `${STEP_MS}ms` }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
