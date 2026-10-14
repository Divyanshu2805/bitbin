"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ClipboardCopy, Keyboard, ListChecks, Monitor, MousePointer2, Puzzle, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { CAPTURE_LOOP, FORM_CLOSE, FORM_OPEN, KEYS_AT, SAVE, SAVED, SUGGEST } from "./capture-demo";
import ExtensionDemo from "./ExtensionDemo";
import DesktopDemo from "./DesktopDemo";
import ExtensionAppDemo from "./ExtensionAppDemo";
import { Accent, Section } from "./ui";

// Saving without opening BitBin, end to end, on a loop while on screen. Two
// companion apps take turns: the browser extension (ExtensionDemo: a selection
// on a page, Ctrl+B, the popup) and the desktop tray app (DesktopDemo:
// the clipboard from any app, Ctrl+Alt+B, a small window). Both open the same
// form, suggest tags and save; beside them, BitBin (ExtensionAppDemo) shows the
// item arrive. Above them, the switch picks an app (and fills while its turn
// plays), and the steps light up as each one happens. The capture app is lit
// until the item is saved, then BitBin is.

const TICK = 100;

type Mode = "extension" | "desktop";

const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: "extension", label: "Browser extension", icon: Puzzle },
  { id: "desktop", label: "Desktop app", icon: Monitor },
];

type Step = { icon: LucideIcon; title: string; text: string; from: number; to: number };

const STEPS: Record<Mode, Step[]> = {
  extension: [
    { icon: MousePointer2, title: "Select", text: "Code, a command or a paragraph, on any page.", from: 0, to: KEYS_AT[0] },
    { icon: Keyboard, title: "Shortcut", text: "Ctrl+B, or right-click › Save selection to BitBin.", from: KEYS_AT[0], to: FORM_OPEN },
    { icon: ListChecks, title: "Check", text: "Type, title and language are guessed for you.", from: FORM_OPEN, to: SUGGEST },
    { icon: Sparkles, title: "Tag", text: "✦ Suggest fills in tags and a description.", from: SUGGEST, to: SAVE },
    { icon: Check, title: "Saved", text: "In your bin, with a link back to the page.", from: SAVE, to: FORM_CLOSE },
  ],
  desktop: [
    { icon: ClipboardCopy, title: "Copy", text: "Text or a screenshot, in any app.", from: 0, to: KEYS_AT[0] },
    { icon: Keyboard, title: "Shortcut", text: "Ctrl+Alt+B from anywhere, or the tray icon.", from: KEYS_AT[0], to: FORM_OPEN },
    { icon: ListChecks, title: "Check", text: "Type and title are guessed; attach a file if you like.", from: FORM_OPEN, to: SUGGEST },
    { icon: Sparkles, title: "Tag", text: "✦ Suggest fills in tags and a description.", from: SUGGEST, to: SAVE },
    { icon: Check, title: "Saved", text: "In your bin, in the collection you picked.", from: SAVE, to: FORM_CLOSE },
  ],
};

export default function ExtensionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const paused = usePagePaused();
  // One clock for both apps: at the end of a loop the other one takes its turn
  const [clock, setClock] = useState<{ mode: Mode; t: number }>({ mode: "extension", t: 0 });
  const [hovered, setHovered] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!inView || still || hovered || paused) return;
    const id = window.setInterval(() => {
      setClock((c) => (c.t + TICK < CAPTURE_LOOP ? { ...c, t: c.t + TICK } : { mode: c.mode === "extension" ? "desktop" : "extension", t: 0 }));
    }, TICK);
    return () => window.clearInterval(id);
  }, [inView, still, hovered, paused]);

  const { mode } = clock;
  const steps = STEPS[mode];
  // Reduced motion: saved, with the item in the app
  const t = still ? 4500 : clock.t;
  // The step playing; once the form has closed, all of them are done
  const stepIndex = t >= FORM_CLOSE ? steps.length : Math.max(0, steps.findIndex((step) => t >= step.from && t < step.to));
  const caption = stepIndex < steps.length ? steps[stepIndex].text : "Done. Next time, it's one shortcut away.";
  // The window doing the work is lit; the other steps back
  const focus = still ? null : t < SAVED ? "capture" : t < FORM_CLOSE + 800 ? "bitbin" : null;
  const windowClass = (name: "capture" | "bitbin") =>
    cn("min-w-0 transition-[opacity,scale] duration-700 ease-out", focus && focus !== name && "scale-[0.985] opacity-50");

  return (
    <Section
      id="extension"
      index="01.4"
      label="capture · pro"
      accent="var(--brand-green)"
      title={
        <>
          Save from <Accent>anywhere.</Accent>
        </>
      }
      description="Select something on a page, or copy it in any app, and press one shortcut. The browser extension and the desktop tray app fill in the details and file it in your bin."
    >
      <div ref={ref}>
        {/* Which app is playing. It switches by itself after each loop, and the playing one fills as
            its turn goes; a click picks one and starts it over */}
        <div className="-mt-6 flex flex-col items-center gap-2.5 sm:-mt-8">
          <div role="radiogroup" aria-label="Capture app" className="relative grid grid-cols-2 rounded-full border border-border bg-(--plan-ink) p-1 text-[13px]">
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-1 left-1 w-[calc(50%-4px)] overflow-hidden rounded-full bg-green transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                mode === "desktop" && "translate-x-full"
              )}
            >
              {!still ? (
                <span
                  key={mode}
                  className="absolute bottom-0 left-0 h-[2px] bg-primary-foreground/40"
                  style={{ width: `${(t / CAPTURE_LOOP) * 100}%`, transition: `width ${TICK}ms linear` }}
                />
              ) : null}
            </span>
            {MODES.map((option) => {
              const Icon = option.icon;
              const current = option.id === mode;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={current}
                  onClick={() => setClock({ mode: option.id, t: 0 })}
                  className={cn(
                    "relative flex items-center justify-center gap-2 rounded-full px-4 py-1.5 font-semibold whitespace-nowrap transition-colors sm:px-5",
                    current ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* The steps, in step with the demo below */}
          <ol key={mode} className="inline-flex max-w-full animate-fade-in flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-(--plan-ink) p-1">
            {steps.map((step, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={step.title} className="flex items-center gap-1">
                  {i > 0 ? <ChevronRight className={cn("size-3.5 transition-colors duration-500", done || active ? "text-green/70" : "text-muted-foreground/40")} /> : null}
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-500",
                      active ? "bg-green text-primary-foreground" : done ? "text-foreground/75" : "text-muted-foreground/70"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4.5 place-items-center rounded-full font-mono text-[10px] transition-colors duration-500",
                        active ? "bg-primary-foreground text-green" : done ? "bg-green text-primary-foreground" : "border border-border"
                      )}
                    >
                      {done ? <Check key="done" className="size-2.5 animate-pop" strokeWidth={3.5} /> : i + 1}
                    </span>
                    <span className="font-semibold">{step.title}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="relative h-5 w-full overflow-hidden text-center text-[13px] text-muted-foreground">
            <span key={`${mode}${stepIndex}`} className="absolute inset-x-0 animate-[fade-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
              {caption}
            </span>
          </p>
        </div>

        {/* The app on the left, BitBin on the right; pausing on hover */}
        <div
          data-scroll="unfold"
          className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
          onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <div className={windowClass("capture")}>
            <div key={mode} className="animate-fade-in">
              {mode === "extension" ? <ExtensionDemo t={t} /> : <DesktopDemo t={t} />}
            </div>
          </div>
          <div className={windowClass("bitbin")}>
            <ExtensionAppDemo t={t} mode={mode} />
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
          Extension for Chrome and Edge · tray app for Windows · both connect with a Pro token from Settings
        </p>
      </div>
    </Section>
  );
}
