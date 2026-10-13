"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileText, Lightbulb, RotateCcw, Sparkles, Tags, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentSpinner, ResultLine } from "@/components/shared/agent-spinner";
import { prefersReducedMotion, useInView } from "@/hooks/use-motion";
import { Accent, Section, Window } from "./ui";

// The four AI helpers, each on the kind of item it works on in the app, on a
// loop while the section is on screen. They run one after another, the way an
// agent works through steps. The first three work on a snippet: the lines each
// one reads light up, then its result lands on the item (tags to keep, a
// description) or on its card (the explanation). The fourth belongs to prompts, so the window
// turns to a prompt and its editor's Original and Optimized tabs. A spinner and
// a progress bar run on the card of the helper at work, and the result appears
// under a ⎿. Everything has a fixed height, so nothing moves as results come
// in. "Run again" restarts it.

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

const PROMPT_BEFORE = "review my code and tell me whats wrong with it";
const PROMPT_AFTER = ["You are a senior TypeScript reviewer.", "1. List each bug with the line it is on.", "2. Explain it in one sentence.", "3. Suggest a fix as a diff."];

const HELPERS = [
  {
    icon: Tags,
    title: "Suggest tags",
    where: "item forms",
    verb: "Tagging",
    lines: [0, 7] as const, // the lines it reads, inclusive
    result: (
      // Suggestions come back to keep or drop, one by one
      <span className="flex flex-wrap gap-1">
        {TAGS.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex animate-pop items-center gap-1 rounded-md border border-violet/30 bg-violet/10 py-0.5 pr-1 pl-2 text-xs text-violet"
            style={{ animationDelay: `${i * 110}ms` }}
          >
            {tag}
            <Check className="size-3 text-lime" strokeWidth={3} />
            <X className="size-3 text-destructive" strokeWidth={3} />
          </span>
        ))}
      </span>
    ),
  },
  {
    icon: FileText,
    title: "Write a description",
    where: "description field",
    verb: "Describing",
    lines: [0, 1] as const,
    result: <span className="font-sans text-sm text-foreground/90">{DESCRIPTION}</span>,
  },
  {
    icon: Lightbulb,
    title: "Explain this code",
    where: "snippets and commands",
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
    where: "prompts",
    verb: "Rewriting",
    lines: null,
    result: (
      <span className="font-sans text-[13px] leading-snug">
        <span className="line-through opacity-60">{PROMPT_BEFORE}</span>{" "}
        <span className="text-foreground/90">→ a role, numbered steps and the output you want.</span>
      </span>
    ),
  },
];

const PROMPT_STEP = HELPERS.length - 1;
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
  // The window turns to the prompt once the three snippet helpers are done
  const onPrompt = done >= PROMPT_STEP;
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
      description="BitBin reads what you save and handles the boring parts: tags, descriptions, plain-English explanations and sharper prompts. It only runs when you press the button, on the item in front of you."
    >
      <div ref={ref} data-scroll="unfold" className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Window
            title={onPrompt ? "~/items/prompts · Code review" : "~/items/snippets · useDebounce hook"}
            right={
              <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                {current ? (
                  <span className="flex items-center gap-1.5 text-violet">
                    <span className="size-1.5 rounded-full bg-violet animate-led text-violet" />
                    {current.verb.toLowerCase()}…
                  </span>
                ) : null}
                {onPrompt ? "markdown" : "typescript"}
              </span>
            }
          >
            {/* The item: a snippet, then a prompt. Both fill the same box, so the window never changes size */}
            <div key={onPrompt ? "prompt" : "snippet"} className="h-[304px] animate-fade-in">
              {onPrompt ? (
                <div className="flex h-full flex-col p-4">
                  {/* The prompt's editor: Original and Optimized tabs, Use This and Optimize in its header */}
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface">
                    <div className="flex items-center gap-1 border-b border-border px-2.5 py-1.5 font-mono text-[11px]">
                      {(["Original", "Optimized"] as const).map((tab) => {
                        const active = (tab === "Optimized") === finishedAll;
                        return (
                          <span
                            key={tab}
                            className={cn(
                              "flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors duration-300",
                              active ? "bg-violet/15 text-violet" : "text-muted-foreground",
                              tab === "Optimized" && !finishedAll && "opacity-40"
                            )}
                          >
                            {tab === "Optimized" ? <Sparkles className="size-3" /> : <FileText className="size-3" />}
                            {tab}
                          </span>
                        );
                      })}
                      <span className="ml-auto flex items-center gap-3 text-muted-foreground">
                        {finishedAll ? (
                          <span key={`use${run}`} className="flex animate-pop items-center gap-1 text-lime">
                            <Check className="size-3" strokeWidth={3} /> Use This
                          </span>
                        ) : null}
                        <span className={cn("flex items-center gap-1 text-violet", !finishedAll && "animate-pulse")}>
                          <Wand2 className="size-3" /> {finishedAll ? "Optimize" : "Optimizing…"}
                        </span>
                      </span>
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-hidden p-4 text-[13.5px] leading-relaxed">
                      {!finishedAll ? (
                        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-10 animate-[scan_2.2s_linear_infinite] bg-gradient-to-b from-transparent via-violet/10 to-transparent" />
                      ) : null}
                      {finishedAll ? (
                        <div key={`after${run}`} className="space-y-1.5">
                          {PROMPT_AFTER.map((line, i) => (
                            <p
                              key={line}
                              className={cn("animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]", i === 0 ? "font-medium text-foreground" : "text-muted-foreground")}
                              style={{ animationDelay: `${i * 110}ms` }}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{PROMPT_BEFORE}</p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-2 font-mono text-[11.5px] text-muted-foreground">
                    <span className="text-faint dark:text-muted-foreground/70">prompts only</span>
                    <span className="ml-auto">{finishedAll ? "keep it with Use This, or stay on Original" : "the original is never changed for you"}</span>
                  </p>
                </div>
              ) : (
                <>
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
                      <span className="w-20 shrink-0 text-faint dark:text-muted-foreground/70">Tags</span>
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
                      <span className="w-20 shrink-0 text-faint dark:text-muted-foreground/70">Description</span>
                      {done >= 2 ? (
                        <span key={`d${run}`} className="truncate font-sans text-[12.5px] text-foreground/90 animate-[print_1s_steps(40)_both]">
                          {DESCRIPTION}
                        </span>
                      ) : (
                        <span className="h-2 w-56 rounded bg-muted" />
                      )}
                    </div>
                  </div>
                </>
              )}
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

        {/* The helpers as an agent's steps: a rail on the left fills from one to the next. The
            cards are solid, like the app's: a header bar and a body, the header tinted violet
            while the helper runs. */}
        <div className="relative pl-10">
          <span aria-hidden className="absolute top-7 bottom-7 left-[13px] w-px bg-border" />
          <span
            aria-hidden
            className="absolute top-7 left-[13px] w-px bg-violet transition-[height] duration-700 ease-out"
            style={{ height: `calc((100% - 3.5rem) * ${started ? Math.min(done, HELPERS.length - 1) / (HELPERS.length - 1) : 0})` }}
          />
          <div className="grid content-start gap-3">
            {HELPERS.map((helper, i) => {
              const Icon = helper.icon;
              const finished = done > i;
              const running = started && done === i;
              const queued = !finished && !running;
              return (
                <div key={helper.title} className="relative">
                  {/* Its node on the rail */}
                  <span aria-hidden className="absolute top-4 -left-10 grid size-[27px] place-items-center">
                                        <span
                      className={cn(
                        "relative grid size-[27px] place-items-center rounded-full border font-mono text-[11px] transition-colors duration-500",
                        finished && "border-violet bg-violet text-background",
                        running && "border-2 border-violet bg-card text-violet",
                        queued && "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {finished ? <Check key={`n${run}`} className="size-3.5 animate-pop" strokeWidth={3} /> : i + 1}
                    </span>
                  </span>

                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl bg-card shadow-[var(--shadow-soft)]"
                    )}
                  >
                    {/* Header bar: the helper, where its button lives, and its state */}
                    <p
                      className={cn(
                        "flex items-center gap-2.5 px-3.5 py-2 font-mono text-[13px] transition-colors duration-500",
                        running ? "bg-[color-mix(in_srgb,var(--brand-violet)_14%,var(--card))]" : "bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-md transition-colors duration-500",
                          running ? "bg-violet text-background" : finished ? "bg-[color-mix(in_srgb,var(--brand-violet)_22%,var(--card))] text-violet" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className={cn("whitespace-nowrap font-semibold transition-colors", queued ? "text-muted-foreground" : "text-foreground")}>{helper.title}</span>
                      {/* Where the button lives in the app */}
                      <span className="hidden truncate whitespace-nowrap rounded border border-border bg-card px-1.5 text-[10.5px] text-muted-foreground xl:inline">{helper.where}</span>
                      <span
                        className={cn(
                          "ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-colors duration-300",
                          finished && "bg-lime text-background",
                          running && "bg-violet text-background",
                          queued && "bg-muted text-muted-foreground"
                        )}
                      >
                        {finished ? (
                          <span key={`ok${run}`} className="inline-flex animate-pop items-center gap-1">
                            <Check className="size-3" strokeWidth={3} /> done
                          </span>
                        ) : running ? (
                          "running"
                        ) : (
                          "queued"
                        )}
                      </span>
                    </p>
                    <div className="h-[62px] overflow-hidden px-3.5 py-2.5">
                      {finished ? (
                        <ResultLine key={`r${run}`} className="animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both] text-muted-foreground">
                          {helper.result}
                        </ResultLine>
                      ) : running ? (
                        <AgentSpinner verb={helper.verb} className="text-[13px]" />
                      ) : (
                        // What will land here, as a skeleton
                        <span aria-hidden className="flex flex-col gap-1.5 pt-1">
                          <span className="h-2 w-3/5 rounded bg-muted" />
                          <span className="h-2 w-2/5 rounded bg-muted" />
                        </span>
                      )}
                    </div>
                    {/* Progress while this helper runs */}
                    {running ? (
                      <span
                        key={`p${run}`}
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-[3px] origin-left animate-[bar-fill_linear_both] bg-violet"
                        style={{ animationDuration: `${STEP_MS}ms` }}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}
