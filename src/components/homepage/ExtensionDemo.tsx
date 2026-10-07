"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Plus, Puzzle, RotateCw, X } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { readableColor, readableTint } from "@/lib/utils/color";

// The browser extension, as it really works: Chrome with a react.dev page open.
// A cursor drags across a line of code to select it, Ctrl+Shift+B opens the
// BitBin popup (the same form as extension/popup.html) filled in from the
// selection, the cursor clicks ✦ Suggest for tags, then Save, and "Saved to
// BitBin". Driven by `t`, ms into the loop; ExtensionSection shows the item
// arriving in the app at SAVED.

export const EXT_LOOP = 7600;
const SELECT_START = 300;
const SELECT_END = 1000;
export const KEYS_AT = [1200, 1350, 1500];
export const KEYS_UP = 1900;
export const POPUP_OPEN = 1800;
export const SUGGEST = 2500;
const TAGS_IN = 3100;
const DESCRIPTION = "Caches a calculation between re-renders.";
export const SAVE = 3900;
export const SAVED = 4150;
export const POPUP_CLOSE = 6000;

type Point = { x: number; y: number };
type Targets = { rest: Point; codeStart: Point; codeEnd: Point; suggest: Point; save: Point };

/** An element's position inside `root`, ignoring transforms (the popup is scaled while hidden). */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Where the cursor is headed at time `t`, and how it gets there. */
function cursorAt(t: number, p: Targets): { at: Point; ms: number; ease: string } {
  if (t < 150) return { at: p.rest, ms: 0, ease: "linear" };
  if (t < SELECT_START) return { at: p.codeStart, ms: 350, ease: "ease-out" };
  if (t < SELECT_END) return { at: p.codeEnd, ms: SELECT_END - SELECT_START, ease: "linear" };
  if (t < 2100) return { at: { x: p.codeEnd.x + 40, y: p.codeEnd.y + 36 }, ms: 400, ease: "ease-out" };
  if (t < 3400) return { at: p.suggest, ms: 450, ease: "cubic-bezier(0.22,1,0.36,1)" };
  if (t < POPUP_CLOSE) return { at: p.save, ms: 450, ease: "cubic-bezier(0.22,1,0.36,1)" };
  return { at: p.rest, ms: 700, ease: "ease-in-out" };
}

export default function ExtensionDemo({ t }: { t: number }) {
  const root = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLSpanElement>(null);
  const suggestBtn = useRef<HTMLSpanElement>(null);
  const saveBtn = useRef<HTMLSpanElement>(null);
  const [targets, setTargets] = useState<Targets | null>(null);

  // Measure where the cursor has to go, and again whenever the window resizes.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => {
      if (!code.current || !suggestBtn.current || !saveBtn.current) return;
      const c = offsetIn(code.current, node);
      const s = offsetIn(suggestBtn.current, node);
      const v = offsetIn(saveBtn.current, node);
      setTargets({
        rest: { x: node.offsetWidth * 0.42, y: node.offsetHeight - 48 },
        codeStart: { x: c.x - 2, y: c.y + c.h / 2 },
        codeEnd: { x: c.x + c.w, y: c.y + c.h / 2 },
        suggest: { x: s.x + s.w / 2, y: s.y + s.h / 2 },
        save: { x: v.x + v.w / 2, y: v.y + v.h / 2 },
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    const first = window.setTimeout(measure, 0);
    return () => {
      observer.disconnect();
      window.clearTimeout(first);
    };
  }, []);

  const open = t >= POPUP_OPEN && t < POPUP_CLOSE;
  const suggesting = t >= SUGGEST && t < TAGS_IN;
  const saving = t >= SAVE && t < SAVED;
  const saved = t >= SAVED;
  const selection = Math.max(0, Math.min(1, (t - SELECT_START) / (SELECT_END - SELECT_START)));
  const keysShown = t >= KEYS_AT[0] - 150 && t < KEYS_UP + 250;
  const pressing = (t >= SELECT_START && t < SELECT_END) || (t >= SUGGEST && t < SUGGEST + 250) || (t >= SAVE && t < SAVE + 250);
  const rippling = (t >= SUGGEST && t < SUGGEST + 400) || (t >= SAVE && t < SAVE + 400);
  const cursor = targets ? cursorAt(t, targets) : null;

  return (
    <div ref={root} className="relative overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-[var(--shadow-lift)]">
      {/* Tab strip */}
      <div className="flex h-8 items-end gap-1 bg-surface pr-2 pl-2.5">
        <span className="mb-2.5 flex gap-1.5">
          <span className="size-2 rounded-full bg-[#ff5f57]" />
          <span className="size-2 rounded-full bg-[#febc2e]" />
          <span className="size-2 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 flex h-6 w-40 items-center gap-1.5 rounded-t-md bg-surface px-2 text-[10.5px] text-foreground/90">
          <span
            className="grid size-3 place-items-center rounded-full text-[7px] font-bold"
            style={{ background: readableTint("#58c4dc", 20), color: readableColor("#58c4dc") }}
          >
            ⚛
          </span>
          <span className="truncate">useMemo – React</span>
          <X className="ml-auto size-2.5 text-muted-foreground" />
        </span>
        <Plus className="mb-1.5 size-3 text-muted-foreground" />
      </div>

      {/* Toolbar: navigation, the address bar, extensions */}
      <div className="flex h-8 items-center gap-2 border-b border-border bg-surface px-2.5 text-muted-foreground">
        <ArrowLeft className="size-3" />
        <ArrowRight className="size-3 opacity-40" />
        <RotateCw className="size-3" />
        <span className="flex h-5 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-surface px-2.5 text-[10.5px]">
          <Lock className="size-2.5 shrink-0" />
          <span className="truncate">
            <span className="text-foreground/90">react.dev</span>/reference/react/useMemo
          </span>
        </span>
        <Puzzle className="size-3" />
        <span className={cn("grid size-5 place-items-center rounded-md transition-colors duration-200", open ? "bg-lime/15 ring-1 ring-lime/40" : "")}>
          <LogoMark className="size-3.5" />
        </span>
        <span className="grid size-4 place-items-center rounded-full bg-violet/15 text-[8px] font-bold text-violet">D</span>
      </div>

      {/* The page */}
      <div className="h-[368px] bg-card px-5 py-4">
        <p className="font-mono text-[10px] text-muted-foreground">API Reference › Hooks</p>
        <p className="mt-1 font-display text-xl font-bold">useMemo</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          useMemo is a React Hook that lets you cache the result of a calculation between re-renders.
        </p>
        <div className="mt-3.5 rounded-md border border-border bg-surface px-3.5 py-3 font-mono text-[12px]">
          <span ref={code} className="relative inline-block">
            {/* The selection, following the cursor across the line */}
            <span
              aria-hidden
              className="absolute -inset-x-0.5 inset-y-0 origin-left rounded-sm bg-[#3b82f6]/40 transition-transform duration-100 ease-linear"
              style={{ transform: `scaleX(${selection})` }}
            />
            <span className="relative">
              <span className="text-tok-kw">const</span> cached = <span className="text-tok-fn">useMemo</span>(calc, deps)
            </span>
          </span>
        </div>
        <p className="mt-3.5 text-[12.5px] leading-relaxed text-faint dark:text-muted-foreground/70">
          Call useMemo at the top level of your component to cache a calculation between re-renders.
        </p>
      </div>

      {/* Keystrokes, shown like a screencast */}
      <div
        className={cn(
          "absolute bottom-5 left-5 flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-2 font-mono text-[12px] shadow-[var(--shadow-lift)] backdrop-blur transition-[opacity,translate] duration-200",
          keysShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
      >
        {["Ctrl", "Shift", "B"].map((key, i) => (
          <span key={key} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-muted-foreground">+</span> : null}
            <kbd
              className={cn(
                "rounded-md border px-2 py-0.5 transition-all duration-100",
                t >= KEYS_AT[i] ? "translate-y-px border-cyan/60 bg-cyan/10 text-cyan" : "border-b-2 border-border text-muted-foreground"
              )}
            >
              {key}
            </kbd>
          </span>
        ))}
      </div>

      {/* The BitBin popup, hanging off its toolbar icon */}
      <div
        className={cn(
          "absolute top-[58px] right-7 w-[236px] origin-top-right overflow-hidden rounded-lg border border-border bg-card text-[11px] shadow-[0_24px_60px_-20px_light-dark(rgb(20_22_26/0.3),rgb(0_0_0/0.9))] transition-[opacity,scale] duration-200",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
          <LogoMark className="size-4" />
          <span className="flex-1 text-[12px] font-bold">Save to BitBin</span>
          <span className="font-mono text-[8.5px] tracking-[0.15em] text-lime uppercase">Pro</span>
        </div>

        {/* The form stays laid out underneath, so the cursor's targets never move */}
        <div className="relative">
          <div className={cn("grid gap-1.5 p-2.5 transition-opacity duration-200", saved && "opacity-0")}>
            <div className="grid grid-cols-2 gap-1.5">
              <Field label="Type" value="Snippet" select />
              <Field label="Collection" value="React utils" select />
            </div>
            <Field label="Title" value="useMemo" />
            <label className="grid gap-1 text-[10px] text-muted-foreground">
              Content
              <span className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-[10px] text-foreground">
                const cached = useMemo(calc, deps)
              </span>
            </label>
            <label className="grid gap-1 text-[10px] text-muted-foreground">
              Tags
              <span className="flex gap-1">
                <span className="flex h-6 min-w-0 flex-1 items-center rounded-md border border-border bg-surface px-2 text-foreground">
                  {t >= TAGS_IN ? (
                    <span key="tags" className="truncate animate-fade-in">
                      react, hooks, memo
                    </span>
                  ) : suggesting ? (
                    <span className="text-muted-foreground">…</span>
                  ) : (
                    <span className="text-faint dark:text-muted-foreground/60">comma, separated</span>
                  )}
                </span>
                <span
                  ref={suggestBtn}
                  className={cn(
                    "flex h-6 items-center rounded-md border px-1.5 font-semibold whitespace-nowrap text-foreground transition-colors",
                    suggesting ? "border-lime/60 bg-lime/10 text-lime" : "border-border bg-surface"
                  )}
                >
                  ✦ Suggest
                </span>
              </span>
            </label>
            {/* The same click writes a description, typed in just after the tags */}
            <label className="grid gap-1 text-[10px] text-muted-foreground">
              Description
              <span className="flex h-6 min-w-0 items-center rounded-md border border-border bg-surface px-2 text-foreground">
                {t >= TAGS_IN ? (
                  <span className="truncate">{DESCRIPTION.slice(0, Math.max(0, Math.floor((t - TAGS_IN - 100) / 16)))}</span>
                ) : suggesting ? (
                  <span className="text-muted-foreground">…</span>
                ) : (
                  <span className="text-faint dark:text-muted-foreground/60">Optional</span>
                )}
              </span>
            </label>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9.5px] text-muted-foreground">Ctrl+Enter to save</span>
              <span
                ref={saveBtn}
                className={cn(
                  "rounded-md border border-lime bg-lime px-2.5 py-1 font-semibold text-primary-foreground transition-[filter,scale] duration-150",
                  saving && "scale-95 brightness-90"
                )}
              >
                Save
              </span>
            </div>
          </div>
          {saved ? (
            <div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 text-center animate-fade-in">
              <span className="grid size-8 place-items-center rounded-full bg-lime/15 text-lime animate-pop">✓</span>
              <p className="font-semibold">Saved to BitBin.</p>
              <p className="font-semibold text-lime">Open BitBin</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* The cursor */}
      {cursor ? (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-10"
          style={{ transform: `translate(${cursor.at.x}px, ${cursor.at.y}px)`, transition: `transform ${cursor.ms}ms ${cursor.ease}` }}
        >
          {rippling ? (
            <span key={t >= SAVE ? "save" : "suggest"} className="absolute -top-3 -left-3 size-6 rounded-full border-2 border-lime/70 animate-ping" />
          ) : null}
          {/* A macOS-style pointer; its tip sits exactly on the point */}
          <svg
            viewBox="0 0 24 24"
            className={cn("size-[22px] drop-shadow-[0_3px_6px_rgb(0_0_0/0.35)] transition-transform duration-100", pressing && "scale-90")}
            style={{ marginLeft: -5, marginTop: -3, transformOrigin: "5px 3px" }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
              fill="#0a0b0d"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, select = false }: { label: string; value: string; select?: boolean }) {
  return (
    <label className="grid gap-1 text-[10px] text-muted-foreground">
      {label}
      <span className="flex h-6 items-center justify-between rounded-md border border-border bg-surface px-2 text-foreground">
        <span className="truncate">{value}</span>
        {select ? <span className="text-[8px] text-muted-foreground">▾</span> : null}
      </span>
    </label>
  );
}
