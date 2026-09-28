import { Code, FolderOpen, Link as LinkIcon, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor, readableTint } from "@/lib/utils/color";
import { MockPathPill, MockSearch } from "./mock-app";
import { SAVED } from "./ExtensionDemo";

// BitBin on the other side of the extension: the React utils collection. When
// the popup's Save lands (SAVED), the new snippet slides in at the top with its
// tags and where it came from. The list is absolutely positioned, so the window
// keeps the height of the browser beside it and never resizes.

const BLUE = "#60a5fa"; // the snippet type colour

const ROWS = [
  { icon: Code, color: "#60a5fa", title: "useDebounce hook", preview: "export function useDebounce<T>(value: T, delay = 300)", meta: "snippet · 2d" },
  { icon: StickyNote, color: "#fde047", title: "memo vs useMemo", preview: "# memo skips re-renders; useMemo caches a value", meta: "note · 4d" },
  { icon: Code, color: "#60a5fa", title: "Custom hook template", preview: "export function useThing() { … }", meta: "snippet · 1w" },
  { icon: LinkIcon, color: "#34d399", title: "Suspense boundaries", preview: "react.dev/reference/react/Suspense", meta: "link · 2w" },
  { icon: Code, color: "#60a5fa", title: "useLocalStorage", preview: "const [v, setV] = useLocalStorage('key', init)", meta: "snippet · 3w" },
];

export default function ExtensionAppDemo({ t }: { t: number }) {
  const saved = t >= SAVED;

  return (
    <div className="flex h-full min-h-[380px] flex-col overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-[var(--shadow-lift)]">
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-3">
        <span className="size-2 rounded-full bg-[#ff5f57]" />
        <span className="size-2 rounded-full bg-[#febc2e]" />
        <span className="size-2 rounded-full bg-[#28c840]" />
        <MockSearch className="ml-auto h-6 w-40" />
      </div>

      {/* The collection page's header, as the app draws it: path, folder tile, name and [count] */}
      <div className="space-y-2 border-b border-border px-3.5 py-3">
        <MockPathPill path="collections/react-utils" />
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg"
            style={{ background: readableTint(BLUE, 12), color: readableColor(BLUE), boxShadow: `inset 0 0 0 1px ${readableTint(BLUE, 30)}, 0 10px 24px -12px ${readableColor(BLUE)}` }}
          >
            <FolderOpen className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="flex items-baseline gap-2 font-display text-[16px] font-bold tracking-tight">
              React utils
              <span
                key={saved ? "15" : "14"}
                className={cn("font-mono text-[11px] font-normal tabular-nums", saved ? "animate-pop text-lime" : "text-muted-foreground")}
              >
                [{saved ? 15 : 14}]
              </span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">Hooks, patterns and docs</p>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ul className="absolute inset-0 space-y-1 overflow-hidden p-2.5">
          {saved ? (
            <li className="animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] rounded-lg border border-lime/30 bg-lime/[0.04] px-2.5 py-2">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: readableTint(BLUE, 15), color: readableColor(BLUE) }}>
                  <Code className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    useMemo
                    <span className="rounded border border-lime/40 px-1 font-mono text-[9px] font-semibold tracking-wide text-lime">NEW</span>
                  </p>
                  <p className="truncate font-mono text-[10.5px] text-muted-foreground">const cached = useMemo(calc, deps)</p>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1 pl-[38px] font-mono text-[10px]">
                {["react", "hooks", "memo"].map((tag, i) => (
                  <span key={tag} className="animate-pop rounded bg-muted px-1.5 text-muted-foreground" style={{ animationDelay: `${250 + i * 110}ms` }}>
                    #{tag}
                  </span>
                ))}
                <span className="ml-auto truncate text-muted-foreground">from react.dev</span>
              </div>
            </li>
          ) : null}
          {ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.title} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: readableTint(row.color, 12), color: readableColor(row.color) }}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-foreground/90">{row.title}</p>
                  <p className="truncate font-mono text-[10.5px] text-muted-foreground/80">{row.preview}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{row.meta}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
