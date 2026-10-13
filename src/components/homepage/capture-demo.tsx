"use client";

import { useEffect, useState, type RefObject } from "react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

// What the two capture demos share: the browser extension (ExtensionDemo) and
// the desktop tray app (DesktopDemo) open the same "Save to BitBin" form, as
// extension/popup.html and desktop/renderer/capture.html do. One script, in ms
// from the start of the loop, drives both: a cursor selects some text, a
// shortcut opens the form filled in from it, the cursor clicks ✦ Suggest (tags
// and a description), then Save. ExtensionSection runs the clock and lights its
// steps from the same times.

export const CAPTURE_LOOP = 7600;
export const SELECT_START = 300;
export const SELECT_END = 1000;
export const KEYS_AT = [1200, 1350, 1500];
export const KEYS_UP = 1900;
export const FORM_OPEN = 1800;
export const SUGGEST = 2500;
export const TAGS_IN = 3100;
export const SAVE = 3900;
export const SAVED = 4150;
export const FORM_CLOSE = 6000;

type Point = { x: number; y: number };
type Targets = { rest: Point; textStart: Point; textEnd: Point; suggest: Point; save: Point };

/** An element's position inside `root`, ignoring transforms (the form is scaled while hidden). */
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

/** Where the cursor has to go, measured from the scene and again whenever it resizes. */
export function useCursorTargets(
  root: RefObject<HTMLElement | null>,
  text: RefObject<HTMLElement | null>,
  suggest: RefObject<HTMLElement | null>,
  save: RefObject<HTMLElement | null>
) {
  const [targets, setTargets] = useState<Targets | null>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => {
      if (!text.current || !suggest.current || !save.current) return;
      const c = offsetIn(text.current, node);
      const s = offsetIn(suggest.current, node);
      const v = offsetIn(save.current, node);
      setTargets({
        rest: { x: node.offsetWidth * 0.42, y: node.offsetHeight - 64 },
        textStart: { x: c.x - 2, y: c.y + c.h / 2 },
        textEnd: { x: c.x + c.w, y: c.y + c.h / 2 },
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
  }, [root, text, suggest, save]);

  return targets;
}

/** Where the cursor is headed at time `t`, and how it gets there. */
function cursorAt(t: number, p: Targets): { at: Point; ms: number; ease: string } {
  if (t < 150) return { at: p.rest, ms: 0, ease: "linear" };
  if (t < SELECT_START) return { at: p.textStart, ms: 350, ease: "ease-out" };
  if (t < SELECT_END) return { at: p.textEnd, ms: SELECT_END - SELECT_START, ease: "linear" };
  if (t < 2100) return { at: { x: p.textEnd.x + 24, y: p.textEnd.y + 36 }, ms: 400, ease: "ease-out" };
  if (t < 3400) return { at: p.suggest, ms: 450, ease: "cubic-bezier(0.22,1,0.36,1)" };
  if (t < FORM_CLOSE) return { at: p.save, ms: 450, ease: "cubic-bezier(0.22,1,0.36,1)" };
  return { at: p.rest, ms: 700, ease: "ease-in-out" };
}

/** How much of the text is selected at `t`, 0 to 1. */
export const selectionAt = (t: number) => Math.max(0, Math.min(1, (t - SELECT_START) / (SELECT_END - SELECT_START)));

/** The pointer: it drags across the text, then clicks ✦ Suggest and Save with a ripple. */
export function DemoCursor({ t, targets }: { t: number; targets: Targets | null }) {
  if (!targets) return null;
  const cursor = cursorAt(t, targets);
  const pressing = (t >= SELECT_START && t < SELECT_END) || (t >= SUGGEST && t < SUGGEST + 250) || (t >= SAVE && t < SAVE + 250);
  const rippling = (t >= SUGGEST && t < SUGGEST + 400) || (t >= SAVE && t < SAVE + 400);
  return (
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
  );
}

/** The shortcut, shown like a screencast: each key lights as it goes down. */
export function KeyCaps({ t, keys, className }: { t: number; keys: string[]; className?: string }) {
  const shown = t >= KEYS_AT[0] - 150 && t < KEYS_UP + 250;
  return (
    <div
      className={cn(
        "absolute flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-[12px] shadow-[var(--shadow-lift)] transition-[opacity,translate] duration-200",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className
      )}
    >
      {keys.map((key, i) => (
        <span key={key} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-muted-foreground">+</span> : null}
          <kbd
            className={cn(
              "rounded-md border px-2 py-0.5 transition-all duration-100",
              t >= KEYS_AT[i] ? "translate-y-px border-green/60 bg-green/10 text-green" : "border-b-2 border-border text-muted-foreground"
            )}
          >
            {key}
          </kbd>
        </span>
      ))}
    </div>
  );
}

function Field({ label, value, select = false, mono = false }: { label: string; value: string; select?: boolean; mono?: boolean }) {
  return (
    <label className="grid min-w-0 grid-cols-1 gap-1 text-[10px] text-muted-foreground">
      {label}
      <span className={cn("flex h-6 min-w-0 items-center justify-between gap-1 rounded-md border border-border bg-surface px-2 text-foreground", mono && "font-mono text-[10px]")}>
        <span className="truncate">{value}</span>
        {select ? <span className="text-[8px] text-muted-foreground">▾</span> : null}
      </span>
    </label>
  );
}

export type CaptureFields = {
  type: string;
  collection: string;
  title: string;
  /** The extension guesses a language for snippets and commands; the desktop app leaves it to the server */
  language?: string;
  content: string;
  tags: string[];
  description: string;
  /** The extension notes the page the selection came from */
  source?: string;
  /** The desktop app can attach a file or image in place of text */
  attach?: boolean;
  /** The keys under the form, as each app writes them */
  hint: React.ReactNode;
};

/**
 * The "Save to BitBin" form both apps open. ✦ Suggest fills the tags (as chips)
 * and types a description; Save swaps the form for "Saved to BitBin." The form
 * stays laid out underneath, so the cursor's targets never move.
 */
export function CaptureForm({
  t,
  fields,
  suggestRef,
  saveRef,
  closable = false,
}: {
  t: number;
  fields: CaptureFields;
  suggestRef: RefObject<HTMLSpanElement | null>;
  saveRef: RefObject<HTMLSpanElement | null>;
  /** The desktop window has its own close button */
  closable?: boolean;
}) {
  const suggesting = t >= SUGGEST && t < TAGS_IN;
  const saving = t >= SAVE && t < SAVED;
  const saved = t >= SAVED;

  return (
    <>
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
        <LogoMark animated={false} className="size-4" />
        <span className="flex-1 text-[12px] font-bold">Save to BitBin</span>
        <span className="font-mono text-[8.5px] tracking-[0.15em] text-lime uppercase">Pro</span>
        {closable ? <span className="ml-1 text-[13px] leading-none text-muted-foreground">×</span> : null}
      </div>

      <div className="relative">
        {/* A single column that may shrink, so a long line is cut with an ellipsis instead of widening the form */}
        <div className={cn("grid grid-cols-1 gap-1.5 p-2.5 transition-opacity duration-200", saved && "opacity-0")}>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Type" value={fields.type} select />
            <Field label="Collection" value={fields.collection} select />
          </div>
          <span className="text-[10px] font-semibold text-lime">+ New collection</span>
          <Field label="Title" value={fields.title} />
          {fields.language ? <Field label="Language" value={fields.language} select /> : null}
          <Field label="Content" value={fields.content} mono />
          {fields.attach ? (
            <span className="text-[10px] font-semibold text-lime">
              + Attach a file or image <span className="font-normal text-muted-foreground">or drop one here</span>
            </span>
          ) : null}
          <label className="grid min-w-0 grid-cols-1 gap-1 text-[10px] text-muted-foreground">
            Tags
            <span className="flex min-w-0 gap-1">
              {/* The tag box: each tag is a chip, with room to type the next */}
              <span className="flex h-6 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-md border border-border bg-surface px-1.5 text-foreground">
                {t >= TAGS_IN ? (
                  fields.tags.map((tag, i) => (
                    <span
                      key={tag}
                      className="shrink-0 animate-pop rounded border border-lime/30 bg-lime/10 px-1 font-mono text-[9.5px] text-lime"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      {tag} ×
                    </span>
                  ))
                ) : suggesting ? (
                  <span className="text-muted-foreground">…</span>
                ) : (
                  <span className="truncate text-faint dark:text-muted-foreground/60">Type a tag, press Enter</span>
                )}
              </span>
              <span
                ref={suggestRef}
                className={cn(
                  "flex h-6 shrink-0 items-center rounded-md border px-1.5 font-semibold whitespace-nowrap text-foreground transition-colors",
                  suggesting ? "border-lime/60 bg-lime/10 text-lime" : "border-border bg-surface"
                )}
              >
                ✦ Suggest
              </span>
            </span>
          </label>
          {/* The same click writes a description, typed in just after the tags */}
          <label className="grid min-w-0 grid-cols-1 gap-1 text-[10px] text-muted-foreground">
            Description
            <span className="flex h-6 min-w-0 items-center rounded-md border border-border bg-surface px-2 text-foreground">
              {t >= TAGS_IN ? (
                <span className="truncate">{fields.description.slice(0, Math.max(0, Math.floor((t - TAGS_IN - 100) / 16)))}</span>
              ) : suggesting ? (
                <span className="text-muted-foreground">…</span>
              ) : (
                <span className="truncate text-faint dark:text-muted-foreground/60">Optional. ✦ Suggest writes one for you.</span>
              )}
            </span>
          </label>
          {fields.source ? <span className="truncate font-mono text-[9px] text-muted-foreground">From {fields.source}</span> : null}
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 truncate font-mono text-[9.5px] text-muted-foreground">{fields.hint}</span>
            <span
              ref={saveRef}
              className={cn(
                "shrink-0 rounded-md border border-lime bg-lime px-2.5 py-1 font-semibold text-primary-foreground transition-[filter,scale] duration-150",
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
    </>
  );
}
