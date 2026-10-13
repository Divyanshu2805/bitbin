"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight, Lock, Plus, Puzzle, RotateCw, X } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { readableColor, readableTint } from "@/lib/utils/color";
import { CaptureForm, DemoCursor, FORM_CLOSE, FORM_OPEN, KeyCaps, selectionAt, useCursorTargets, type CaptureFields } from "./capture-demo";

// The browser extension, as it really works: Chrome with a react.dev page open.
// A cursor drags across a line of code to select it, Ctrl+Shift+B opens the
// BitBin popup (the same form as extension/popup.html) filled in from the
// selection, the cursor clicks ✦ Suggest for tags and a description, then Save,
// and "Saved to BitBin". Driven by `t`, ms into the loop (capture-demo.tsx);
// ExtensionSection shows the item arriving in the app at SAVED.

const FIELDS: CaptureFields = {
  type: "Snippet",
  collection: "React utils",
  title: "useMemo",
  language: "JavaScript",
  content: "const cached = useMemo(calc, deps)",
  tags: ["react", "hooks", "memo"],
  description: "Caches a calculation between re-renders.",
  source: "react.dev/reference/react/useMemo",
  hint: "Ctrl+Enter to save",
};

export default function ExtensionDemo({ t }: { t: number }) {
  const root = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLSpanElement>(null);
  const suggestBtn = useRef<HTMLSpanElement>(null);
  const saveBtn = useRef<HTMLSpanElement>(null);
  const targets = useCursorTargets(root, code, suggestBtn, saveBtn);

  const open = t >= FORM_OPEN && t < FORM_CLOSE;

  return (
    <div ref={root} className="relative overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-[var(--shadow-lift)]">
      {/* Tab strip */}
      <div className="flex h-8 items-end gap-1 bg-surface pr-2 pl-2.5">
        <span className="mb-2.5 flex gap-1.5">
          <span className="size-2 rounded-full bg-[#ff5f57]" />
          <span className="size-2 rounded-full bg-[#febc2e]" />
          <span className="size-2 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 flex h-6 w-40 items-center gap-1.5 rounded-t-md bg-card px-2 text-[10.5px] text-foreground/90">
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
      <div className="flex h-8 items-center gap-2 border-b border-border bg-card px-2.5 text-muted-foreground">
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
          <LogoMark animated={false} className="size-3.5" />
        </span>
        <span className="grid size-4 place-items-center rounded-full bg-violet/15 text-[8px] font-bold text-violet">D</span>
      </div>

      {/* The page */}
      <div className="h-[430px] bg-card px-5 py-4">
        <p className="font-mono text-[10px] text-muted-foreground">API Reference › Hooks</p>
        <p className="mt-1 font-display text-xl font-bold">useMemo</p>
        <p className="mt-1.5 max-w-[60ch] text-[12.5px] leading-relaxed text-muted-foreground">
          useMemo is a React Hook that lets you cache the result of a calculation between re-renders.
        </p>
        <div className="mt-3.5 rounded-md border border-border bg-surface px-3.5 py-3 font-mono text-[12px]">
          <span ref={code} className="relative inline-block">
            {/* The selection, following the cursor across the line */}
            <span
              aria-hidden
              className="absolute -inset-x-0.5 inset-y-0 origin-left rounded-sm bg-[#3b82f6]/40 transition-transform duration-100 ease-linear"
              style={{ transform: `scaleX(${selectionAt(t)})` }}
            />
            <span className="relative">
              <span className="text-tok-kw">const</span> cached = <span className="text-tok-fn">useMemo</span>(calc, deps)
            </span>
          </span>
        </div>
        <p className="mt-3.5 max-w-[60ch] text-[12.5px] leading-relaxed text-faint dark:text-muted-foreground/70">
          Call useMemo at the top level of your component to cache a calculation between re-renders.
        </p>
        <p className="mt-5 font-display text-[15px] font-bold">Parameters</p>
        <p className="mt-1.5 max-w-[60ch] text-[12.5px] leading-relaxed text-faint dark:text-muted-foreground/70">
          calculateValue: the function calculating the value that you want to cache. dependencies: the list of all reactive values
          referenced inside of it.
        </p>
      </div>

      <KeyCaps t={t} keys={["Ctrl", "Shift", "B"]} className="bottom-5 left-5" />

      {/* The BitBin popup, hanging off its toolbar icon */}
      <div
        className={cn(
          "absolute top-[58px] right-7 w-[244px] origin-top-right overflow-hidden rounded-lg border border-border bg-card text-[11px] shadow-[0_24px_60px_-20px_light-dark(rgb(20_22_26/0.3),rgb(0_0_0/0.9))] transition-[opacity,scale] duration-200 xl:w-[272px]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <CaptureForm t={t} fields={FIELDS} suggestRef={suggestBtn} saveRef={saveBtn} />
      </div>

      <DemoCursor t={t} targets={targets} />
    </div>
  );
}
