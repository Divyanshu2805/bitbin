import { Code, FolderOpen, Link as LinkIcon, StickyNote, Terminal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor, readableTint } from "@/lib/utils/color";
import { MockPathPill, MockSearch } from "./mock-app";
import { SAVED } from "./capture-demo";

// BitBin on the other side of a capture: the collection the form filed the item
// into. When Save lands (SAVED), the new item slides in at the top with its
// tags; one from the extension also says which page it came from. The list is
// absolutely positioned, so the window keeps the height of the demo beside it
// and never resizes.

const BLUE = "#60a5fa"; // snippets
const ORANGE = "#fb923c"; // commands

type Row = { icon: LucideIcon; color: string; title: string; preview: string; meta: string };

type Scene = {
  path: string;
  name: string;
  about: string;
  color: string;
  count: number;
  saved: { icon: LucideIcon; color: string; title: string; preview: string; tags: string[]; source?: string };
  rows: Row[];
};

const SCENES: Record<"extension" | "desktop", Scene> = {
  extension: {
    path: "collections/react-utils",
    name: "React utils",
    about: "Hooks, patterns and docs",
    color: BLUE,
    count: 14,
    saved: { icon: Code, color: BLUE, title: "useMemo", preview: "const cached = useMemo(calc, deps)", tags: ["react", "hooks", "memo"], source: "react.dev" },
    rows: [
      { icon: Code, color: BLUE, title: "useDebounce hook", preview: "export function useDebounce<T>(value: T, delay = 300)", meta: "snippet · 2d" },
      { icon: StickyNote, color: "#fde047", title: "memo vs useMemo", preview: "# memo skips re-renders; useMemo caches a value", meta: "note · 4d" },
      { icon: Code, color: BLUE, title: "Custom hook template", preview: "export function useThing() { … }", meta: "snippet · 1w" },
      { icon: LinkIcon, color: "#34d399", title: "Suspense boundaries", preview: "react.dev/reference/react/Suspense", meta: "link · 2w" },
      { icon: Code, color: BLUE, title: "useLocalStorage", preview: "const [v, setV] = useLocalStorage('key', init)", meta: "snippet · 3w" },
      { icon: Code, color: BLUE, title: "useMediaQuery", preview: "const wide = useMediaQuery('(min-width: 1024px)')", meta: "snippet · 1mo" },
    ],
  },
  desktop: {
    path: "collections/database",
    name: "Database",
    about: "Postgres commands, queries and notes",
    color: ORANGE,
    count: 9,
    saved: { icon: Terminal, color: ORANGE, title: "pg_dump --schema-only", preview: 'pg_dump --schema-only "$DATABASE_URL" > schema.sql', tags: ["postgres", "backup", "schema"] },
    rows: [
      { icon: Terminal, color: ORANGE, title: "psql connect to staging", preview: 'psql "$STAGING_DATABASE_URL"', meta: "command · 1d" },
      { icon: Code, color: BLUE, title: "Keyset pagination", preview: "WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC", meta: "snippet · 3d" },
      { icon: StickyNote, color: "#fde047", title: "Postgres indexes", preview: "# When a partial index beats a full one", meta: "note · 1w" },
      { icon: Terminal, color: ORANGE, title: "Reset the dev database", preview: "npm run db:migrate && npm run db:seed", meta: "command · 2w" },
      { icon: LinkIcon, color: "#34d399", title: "EXPLAIN visualizer", preview: "explain.dalibo.com", meta: "link · 3w" },
      { icon: Terminal, color: ORANGE, title: "Kill idle connections", preview: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity …", meta: "command · 1mo" },
    ],
  },
};

export default function ExtensionAppDemo({ t, mode }: { t: number; mode: "extension" | "desktop" }) {
  const saved = t >= SAVED;
  const scene = SCENES[mode];
  const SavedIcon = scene.saved.icon;

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
        <MockPathPill path={scene.path} />
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg"
            style={{ background: readableTint(scene.color, 12), color: readableColor(scene.color), }}
          >
            <FolderOpen className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="flex items-baseline gap-2 font-display text-[16px] font-bold tracking-tight">
              {scene.name}
              <span
                key={String(saved)}
                className={cn("font-mono text-[11px] font-normal tabular-nums", saved ? "animate-pop text-lime" : "text-muted-foreground")}
              >
                [{scene.count + (saved ? 1 : 0)}]
              </span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{scene.about}</p>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ul className="absolute inset-0 space-y-1 overflow-hidden p-2.5">
          {saved ? (
            <li className="animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] rounded-lg border border-lime/30 bg-lime/[0.04] px-2.5 py-2">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: readableTint(scene.saved.color, 15), color: readableColor(scene.saved.color) }}>
                  <SavedIcon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="truncate">{scene.saved.title}</span>
                    <span className="shrink-0 rounded border border-lime/40 px-1 font-mono text-[9px] font-semibold tracking-wide text-lime">NEW</span>
                  </p>
                  <p className="truncate font-mono text-[10.5px] text-muted-foreground">{scene.saved.preview}</p>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1 pl-[38px] font-mono text-[10px]">
                {scene.saved.tags.map((tag, i) => (
                  <span key={tag} className="animate-pop rounded bg-muted px-1.5 text-muted-foreground" style={{ animationDelay: `${250 + i * 110}ms` }}>
                    #{tag}
                  </span>
                ))}
                {scene.saved.source ? <span className="ml-auto truncate text-muted-foreground">saved from {scene.saved.source}</span> : null}
              </div>
            </li>
          ) : null}
          {scene.rows.map((row) => {
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
