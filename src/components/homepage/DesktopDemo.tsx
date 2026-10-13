"use client";

import { useRef } from "react";
import { ChevronUp, ClipboardCheck, Folder, Globe, Search, Terminal, Wifi } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { CaptureForm, DemoCursor, FORM_CLOSE, FORM_OPEN, KeyCaps, SELECT_END, selectionAt, useCursorTargets, type CaptureFields } from "./capture-demo";

// The desktop tray app, as it really works: a desktop with a terminal open. A
// cursor selects a command and copies it, Ctrl+Alt+B opens BitBin's small
// capture window (the same form as desktop/renderer/capture.html) with the
// clipboard in it, typed as a command, the cursor clicks ✦ Suggest, then Save.
// The app lives in the tray, bottom right, lit while its window is open. Driven
// by `t`, like ExtensionDemo (capture-demo.tsx).

const COMMAND = 'pg_dump --schema-only "$DATABASE_URL" > schema.sql';

const FIELDS: CaptureFields = {
  type: "Command",
  collection: "Database",
  title: "pg_dump --schema-only",
  content: COMMAND,
  tags: ["postgres", "backup", "schema"],
  description: "Dumps the schema, without data, to schema.sql.",
  attach: true,
  hint: (
    <>
      <span className="kbd">Ctrl</span>
      <span className="kbd">Enter</span> save · <span className="kbd">Esc</span> close
    </>
  ),
};

export default function DesktopDemo({ t }: { t: number }) {
  const root = useRef<HTMLDivElement>(null);
  const command = useRef<HTMLSpanElement>(null);
  const suggestBtn = useRef<HTMLSpanElement>(null);
  const saveBtn = useRef<HTMLSpanElement>(null);
  const targets = useCursorTargets(root, command, suggestBtn, saveBtn);

  const open = t >= FORM_OPEN && t < FORM_CLOSE;
  const copied = t >= SELECT_END && t < FORM_OPEN + 600;

  return (
    <div
      ref={root}
      className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-[radial-gradient(120%_90%_at_15%_0%,color-mix(in_srgb,var(--brand-green)_14%,var(--surface)),var(--surface)_60%)] text-left text-foreground shadow-[var(--shadow-lift)]"
    >
      {/* The desktop, with a terminal on it */}
      <div className="relative h-[458px] p-4 sm:p-5">
        <div className="max-w-[560px] overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] sm:w-[72%]">
          <div className="flex h-7 items-center gap-1.5 border-b border-border bg-surface px-2.5">
            <span className="size-2 rounded-full bg-[#ff5f57]" />
            <span className="size-2 rounded-full bg-[#febc2e]" />
            <span className="size-2 rounded-full bg-[#28c840]" />
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">~/projects/api — zsh</span>
          </div>
          <div className="space-y-1 px-3 py-3 font-mono text-[11.5px] leading-relaxed">
            <p>
              <span className="text-lime">$</span> psql <span className="text-tok-str">&quot;$DATABASE_URL&quot;</span> -c <span className="text-tok-str">&quot;\dt&quot;</span>
            </p>
            <p className="text-muted-foreground">public | items | table</p>
            <p className="text-muted-foreground">public | collections | table</p>
            <p className="[overflow-wrap:anywhere]">
              <span className="text-lime">$</span>{" "}
              <span ref={command} className="relative inline-block">
                {/* The selection, following the cursor across the command */}
                <span
                  aria-hidden
                  className="absolute -inset-x-0.5 inset-y-0 origin-left rounded-sm bg-[#3b82f6]/40 transition-transform duration-100 ease-linear"
                  style={{ transform: `scaleX(${selectionAt(t)})` }}
                />
                <span className="relative">{COMMAND}</span>
              </span>
            </p>
            <p className="text-muted-foreground">wrote schema.sql (214 lines)</p>
            <p>
              <span className="text-lime">$</span> <span className="caret" />
            </p>
          </div>
        </div>

        {/* Copied: the clipboard is what the app saves */}
        <p
          className={cn(
            "absolute bottom-16 left-5 flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground shadow-[var(--shadow-lift)] transition-[opacity,translate] duration-200",
            copied ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
        >
          <ClipboardCheck className="size-3.5 text-lime" /> copied
        </p>
        <KeyCaps t={t} keys={["Ctrl", "Alt", "B"]} className="bottom-4 left-5" />
      </div>

      {/* The taskbar: pinned apps, then the tray with BitBin in it */}
      <div className="flex h-9 shrink-0 items-center gap-2.5 border-t border-border bg-card px-3 text-muted-foreground">
        <span className="grid size-5 grid-cols-2 gap-px">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="rounded-[2px] bg-green/70" />
          ))}
        </span>
        <Search className="size-3.5" />
        <span className="grid size-6 place-items-center rounded-md bg-muted text-foreground">
          <Terminal className="size-3.5" />
        </span>
        <Globe className="size-3.5" />
        <Folder className="size-3.5" />
        <span className="ml-auto flex items-center gap-2 font-mono text-[10px]">
          <ChevronUp className="size-3" />
          <span className={cn("grid size-5 place-items-center rounded-md transition-colors duration-200", open ? "bg-lime/15 ring-1 ring-lime/40" : "")}>
            <LogoMark animated={false} className="size-3.5" />
          </span>
          <Wifi className="size-3" />
          <span className="tabular-nums">10:42</span>
        </span>
      </div>

      {/* BitBin's capture window, opened by the shortcut */}
      <div
        className={cn(
          "absolute top-6 right-5 w-[244px] origin-bottom-right overflow-hidden rounded-lg border border-border bg-card text-[11px] shadow-[0_24px_60px_-20px_light-dark(rgb(20_22_26/0.3),rgb(0_0_0/0.9))] transition-[opacity,scale] duration-200 xl:w-[272px]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <CaptureForm t={t} fields={FIELDS} suggestRef={suggestBtn} saveRef={saveBtn} closable />
      </div>

      <DemoCursor t={t} targets={targets} />
    </div>
  );
}
