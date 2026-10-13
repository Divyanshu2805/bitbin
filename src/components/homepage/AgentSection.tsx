"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Code, FolderOpen, Link as LinkIcon, Sparkles, StickyNote, Terminal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor, readableTint } from "@/lib/utils/color";
import { MockPathPill, MockSearch } from "./mock-app";
import { AgentSpinner, ResultLine, ToolLine } from "@/components/shared/agent-spinner";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { Accent, SectionHeading } from "./ui";

// BitBin as an MCP server: an assistant in a terminal, connected to the bin
// through POST /api/v1/mcp (lib/mcp.ts, docs/api/token-api.md), using the
// server's real tools. Two requests take turns. Saving: it looks for the
// command first (search_items), finds the collection (list_collections) and
// files it there (save_item). Finding: it searches (search_items) and reads the
// item in full (get_item). BitBin's own window beside it shows the collection
// involved, with the item landing or lighting up, and the calls as the endpoint
// sees them. Under both, the three steps it takes to connect, as Settings shows
// them. One clock drives it all; each scene's `steps` are the script.

const TICK = 100;
const RATE = 1.5; // script ms per real ms: the demo plays this much faster than written
const TYPE_MS = 28;
const STEP_MS = 1800; // from one tool call to the next
const RESULT_MS = 600; // a call takes this long to answer
const HOLD_MS = 4200; // the finished scene stays this long

const ORANGE = "#fb923c"; // commands
const BLUE = "#60a5fa"; // snippets

type Row = { icon: LucideIcon; color: string; title: string; preview: string; meta: string };
type Step = { tool: string; args?: string; result: React.ReactNode; ms: string };

type Scene = {
  id: "save" | "find";
  prompt: string;
  steps: Step[];
  /** What the assistant says once the last call has answered */
  answer: React.ReactNode;
  status: string;
  collection: { path: string; name: string; about: string; color: string; count: number; types: [LucideIcon, string, string, number][] };
  rows: Row[];
  /** save: a new row lands on top. find: the row with this title lights up as it is read. */
  lands?: { title: string; preview: string; tags: string[] };
  reads?: string;
};

const SCENES: Scene[] = [
  {
    id: "save",
    prompt: "save the kubectl command we used to debug the api pod to my bitbin, under Infra",
    steps: [
      { tool: "search_items", args: 'query: "kubectl logs"', result: <>No matches: it isn&apos;t in the bin yet</>, ms: "61ms" },
      {
        tool: "list_collections",
        result: (
          <>
            6 collections, one of them <span className="text-tok-str">&quot;Infra&quot;</span>
          </>
        ),
        ms: "38ms",
      },
      {
        tool: "save_item",
        args: 'type: "command", collection: "Infra"',
        result: (
          <>
            <span className="text-lime">saved</span> · &quot;Tail pod logs&quot; → Infra · #k8s #logs #debug
          </>
        ),
        ms: "97ms",
      },
    ],
    answer: <>Saved. It&apos;s one ⌘K away in BitBin.</>,
    status: "✓ saved to bitbin",
    collection: {
      path: "collections/infra",
      name: "Infra",
      about: "Servers, containers and deploys",
      color: ORANGE,
      count: 11,
      types: [
        [Terminal, "#f97316", "commands", 5],
        [Code, "#3b82f6", "snippets", 4],
        [Sparkles, "#8b5cf6", "prompts", 2],
      ],
    },
    rows: [
      { icon: Terminal, color: ORANGE, title: "docker system prune", preview: "$ docker system prune -af --volumes", meta: "command · 2d" },
      { icon: Code, color: BLUE, title: "nginx reverse proxy", preview: "location /api { proxy_pass http://api:3000; }", meta: "snippet · 5d" },
      { icon: Terminal, color: ORANGE, title: "psql connect to staging", preview: '$ psql "$STAGING_DATABASE_URL"', meta: "command · 1w" },
      { icon: Sparkles, color: "#a78bfa", title: "Incident runbook", preview: "You are an SRE. Write a runbook for…", meta: "prompt · 2w" },
      { icon: Terminal, color: ORANGE, title: "Restart a deployment", preview: "$ kubectl rollout restart deploy/api", meta: "command · 3w" },
      { icon: Code, color: BLUE, title: "Healthcheck script", preview: "curl -fsS $URL/health || exit 1", meta: "snippet · 1mo" },
    ],
    lands: { title: "Tail pod logs", preview: "kubectl logs -f deploy/api", tags: ["k8s", "logs", "debug"] },
  },
  {
    id: "find",
    prompt: "how did I debounce input last time? check my bitbin",
    steps: [
      {
        tool: "search_items",
        args: 'query: "debounce"',
        result: (
          <>
            1 match: <span className="text-tok-str">&quot;useDebounce hook&quot;</span> · snippet · #react #hooks
          </>
        ),
        ms: "54ms",
      },
      { tool: "get_item", args: 'id: "cm4a…x9"', result: <>typescript · 8 lines · in React utils</>, ms: "41ms" },
    ],
    answer: (
      <>
        You saved a hook for it:
        <span className="mt-1.5 block rounded-md border border-border bg-surface px-3 py-2 text-[12px] leading-[1.7]">
          <span className="block">
            <span className="text-tok-kw">const</span> debounced = <span className="text-tok-fn">useDebounce</span>(value, <span className="text-tok-num">300</span>);
          </span>
        </span>
      </>
    ),
    status: "✓ read from bitbin",
    collection: {
      path: "collections/react-utils",
      name: "React utils",
      about: "Hooks, patterns and docs",
      color: BLUE,
      count: 14,
      types: [
        [Code, "#3b82f6", "snippets", 9],
        [StickyNote, "#fde047", "notes", 3],
        [LinkIcon, "#10b981", "links", 2],
      ],
    },
    rows: [
      { icon: Code, color: BLUE, title: "useDebounce hook", preview: "export function useDebounce<T>(value: T, delay = 300)", meta: "snippet · 2d" },
      { icon: StickyNote, color: "#fde047", title: "memo vs useMemo", preview: "# memo skips re-renders; useMemo caches a value", meta: "note · 4d" },
      { icon: Code, color: BLUE, title: "Custom hook template", preview: "export function useThing() { … }", meta: "snippet · 1w" },
      { icon: LinkIcon, color: "#34d399", title: "Suspense boundaries", preview: "react.dev/reference/react/Suspense", meta: "link · 2w" },
      { icon: Code, color: BLUE, title: "useLocalStorage", preview: "const [v, setV] = useLocalStorage('key', init)", meta: "snippet · 3w" },
      { icon: Code, color: BLUE, title: "useMediaQuery", preview: "const wide = useMediaQuery('(min-width: 1024px)')", meta: "snippet · 1mo" },
    ],
    reads: "useDebounce hook",
  },
];

/** When each part of a scene happens, in script ms. */
function timeline(scene: Scene) {
  const typeEnd = 400 + scene.prompt.length * TYPE_MS;
  const calls = scene.steps.map((_, i) => typeEnd + 1500 + i * STEP_MS);
  const done = calls[calls.length - 1] + RESULT_MS + 500;
  return { typeEnd, calls, done, loop: done + HOLD_MS };
}

// The three steps to connect, as Settings words them. They play first, then the requests.
const SETUP: { title: string; text: string }[] = [
  { title: "Create a token", text: "In Settings, choose what the assistant may do: search, save, list collections." },
  { title: "Run one command", text: "Copy it from Settings → AI assistants and paste it in your terminal." },
  { title: "Just ask", text: "It saves and finds things in your bin. Revoke the token and it's cut off." },
];

const SCOPES = ["Search and read items", "Save items", "List collections"];
const CONNECT_CMD = "claude mcp add --transport http bitbin …/api/v1/mcp";

// The setup, played by a cursor. Each move glides to an element marked data-cursor="…"
// in the windows, and its click lands CLICK_AFTER later. Script ms, like the scenes.
type Target = "scope0" | "scope1" | "scope2" | "create" | "copy" | "shell" | "input";
const MOVES: { at: number; to: Target; step: number }[] = [
  { at: 0, to: "scope0", step: 0 },
  { at: 800, to: "scope1", step: 0 },
  { at: 1600, to: "scope2", step: 0 },
  { at: 2400, to: "create", step: 0 },
  { at: 3500, to: "copy", step: 1 },
  { at: 4600, to: "shell", step: 1 },
  { at: 6800, to: "input", step: 2 },
];
const CLICK_AFTER = 650;
const clickAt = (to: Target) => MOVES.find((m) => m.to === to)!.at + CLICK_AFTER;
const SCOPE_AT = [clickAt("scope0"), clickAt("scope1"), clickAt("scope2")];
const TOKEN_AT = clickAt("create") + 100;
const COPIED_AT = clickAt("copy") + 50;
const PASTE_AT = clickAt("shell") + 400; // ⌘V
const CONNECTED_AT = PASTE_AT + 700;
const TOOLS_AT = CONNECTED_AT + 400;
const SETUP_MS = clickAt("input") + 700;
const CURSOR_FADE = 1100; // into each request, the cursor rests on the prompt, then leaves

/** Where the cursor is headed, and so which step it is on */
function cursorAt(phase: number, t: number) {
  if (phase > 0) return MOVES[MOVES.length - 1];
  return MOVES.reduce((cur, m) => (t >= m.at ? m : cur), MOVES[0]);
}

export default function AgentSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const paused = usePagePaused();
  // One clock for both requests: when one has been held a while, the other takes its turn
  const [clock, setClock] = useState({ phase: 0, t: 0 });
  const [still, setStill] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!inView || still || paused) return;
    const id = window.setInterval(() => {
      setClock((c) => {
        const next = c.t + TICK * RATE;
        const loop = c.phase === 0 ? SETUP_MS : timeline(SCENES[c.phase - 1]).loop;
        return next < loop ? { ...c, t: next } : { phase: (c.phase + 1) % (SCENES.length + 1), t: 0 };
      });
    }, TICK);
    return () => window.clearInterval(id);
  }, [inView, still, paused]);

  // Phase 0 is the setup; after it, one phase per request. Reduced motion: the first request, finished.
  const phase = still ? 1 : clock.phase;
  const setup = phase === 0;
  const scene = SCENES[Math.max(phase - 1, 0)];
  const times = timeline(scene);
  const now = still ? times.loop - TICK : clock.t;
  const move = cursorAt(phase, now);
  const step = move.step;
  const typed = scene.prompt.slice(0, Math.max(0, Math.floor((now - 400) / TYPE_MS)));
  const called = (i: number) => !setup && now >= times.calls[i];
  const answered = (i: number) => !setup && now >= times.calls[i] + RESULT_MS;
  const last = scene.steps.length - 1;
  const finished = answered(last);
  const pasted = !setup || now >= PASTE_AT;
  const connected = !setup || now >= CONNECTED_AT;
  // Thinking between the prompt and the first call, and between an answer and the next call
  const thinking = !setup && now >= times.typeEnd + 300 && !finished && scene.steps.every((_, i) => !called(i) || answered(i));
  const { collection } = scene;
  const landed = Boolean(scene.lands) && finished;
  const tokenMade = !setup || now >= TOKEN_AT;
  const copied = !setup || now >= COPIED_AT;
  const clicks = setup ? MOVES.map((m) => m.at + CLICK_AFTER).filter((c) => c <= now) : [];
  const lastClick = clicks[clicks.length - 1];
  const pressing = lastClick !== undefined && now - lastClick < 220;
  const cursorShown = !still && (setup || now < CURSOR_FADE);
  // The window the cursor is working in is lit; the other one steps back
  const focus = !setup ? null : move.to === "shell" || move.to === "input" ? "terminal" : "bitbin";
  const windowClass = (name: "terminal" | "bitbin") =>
    cn(
      "transition-[opacity,transform,box-shadow] duration-700 ease-out",
      focus && focus !== name && "opacity-45 scale-[0.985]",
      focus === name && "shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand-coral)_45%,transparent),0_24px_60px_-24px_var(--brand-coral)]"
    );

  // Find the cursor's target in the windows, relative to their grid
  const target = move.to;
  useEffect(() => {
    const measure = () => {
      const grid = ref.current;
      const el = grid?.querySelector<HTMLElement>(`[data-cursor="${target}"]`);
      if (!grid || !el) return;
      const g = grid.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPos({ x: r.left - g.left + Math.min(28, r.width / 2), y: r.top - g.top + r.height / 2 });
    };
    const id = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, [target, setup]);

  return (
    <section
      id="agents"
      className="relative scroll-mt-24 py-24 sm:py-32"
      style={{ "--accent": "var(--brand-coral)" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-(--landing-max) px-5 sm:px-8">
        <SectionHeading
          index="01.2"
          label="mcp · pro"
          title={
            <>
              Connect your <Accent>AI assistant</Accent> to your bin.
            </>
          }
          description="BitBin is an MCP server. Add it to Claude Code, or any assistant that speaks the Model Context Protocol, with one command and a token from Settings, and it can search your bin, read what you saved and file new things where they belong."
        />

        {/* The three steps, always listed, in step with the cursor below */}
        <div className="mt-12 flex justify-center">
          <ol className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-(--plan-ink) p-1">
            {SETUP.map((st, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={st.title} className="flex items-center gap-1">
                  {i > 0 ? <ChevronRight className={cn("size-3.5 transition-colors duration-500", done || active ? "text-lime/70" : "text-muted-foreground/40")} /> : null}
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] transition-all duration-500",
                      active ? "bg-lime text-primary-foreground" : done ? "text-foreground/75" : "text-muted-foreground/70"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4.5 place-items-center rounded-full font-mono text-[10px] transition-colors duration-500",
                        active ? "bg-primary-foreground text-lime" : done ? "bg-lime text-primary-foreground" : "border border-border"
                      )}
                    >
                      {done ? <Check key="done" className="size-2.5 animate-pop" strokeWidth={3.5} /> : i + 1}
                    </span>
                    <span className="font-semibold">{st.title}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div ref={ref} data-scroll="unfold" className="relative mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] 2xl:gap-6">
          {/* The assistant's terminal */}
          <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-lift)]", windowClass("terminal"))}>
            <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-4">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">~/projects/api — claude</span>
            </div>

            <div className="h-[400px] overflow-hidden p-4 font-mono text-[13px] leading-[1.75] sm:p-5">
              {/* Connected once, with the command from Settings → AI assistants. In the setup it is pasted in. */}
              <div
                data-cursor="shell"
                className={cn("rounded-lg border px-3 py-2 transition-colors duration-500", pasted ? "border-coral/40" : "border-border")}
              >
                <p className="truncate text-muted-foreground">
                  <span className="text-lime">$</span>{" "}
                  {pasted ? <span className="animate-fade-in">{CONNECT_CMD}</span> : null}
                  {setup && now < CONNECTED_AT ? <span className="caret" /> : null}
                </p>
                {connected ? (
                  <p className="animate-fade-in">
                    <span className="text-coral">✻</span> MCP server connected: <span className="text-lime">bitbin</span>
                  </p>
                ) : null}
                {!setup || now >= TOOLS_AT ? <p className="animate-fade-in truncate pl-5 text-muted-foreground">search_items · get_item · list_collections · save_item</p> : null}
              </div>

              <div key={scene.id} className={cn("mt-4 space-y-2.5", setup && "hidden")}>
                <p className="text-foreground">
                  <span className="text-muted-foreground">&gt; </span>
                  {typed}
                  {now < times.typeEnd ? <span className="caret" /> : null}
                </p>

                {scene.steps.map((step, i) =>
                  called(i) ? (
                    <div key={step.tool} className="animate-fade-in">
                      <ToolLine name={`bitbin - ${step.tool}`} args={step.args} state={answered(i) ? "done" : "running"} />
                      {answered(i) ? <ResultLine>{step.result}</ResultLine> : null}
                    </div>
                  ) : null
                )}

                {now >= times.done ? (
                  <div className="flex animate-fade-in gap-2">
                    <span className="shrink-0 text-lime">⏺</span>
                    <span className="min-w-0 flex-1">{scene.answer}</span>
                  </div>
                ) : null}

                {thinking ? <AgentSpinner timer hint="esc to interrupt" className="text-[13px]" /> : null}
              </div>
            </div>

            {/* Input box, like the assistant's prompt */}
            <div className="border-t border-border px-4 pt-3 pb-2 sm:px-5">
              <div data-cursor="input" className="rounded-lg border border-border px-3 py-2 font-mono text-[13px] text-muted-foreground">
                &gt; <span className={now < times.typeEnd ? "" : "caret"} />
              </div>
              <p className="mt-1.5 flex justify-between font-mono text-[11px] text-muted-foreground/85">
                <span>? for shortcuts</span>
                <span className={finished ? "text-lime" : ""}>{finished ? scene.status : connected ? "bitbin · 4 tools" : "not connected"}</span>
              </p>
            </div>
          </div>

          {/* BitBin, on the other side of the endpoint: the collection involved, with the
              call log along the bottom in step with the assistant */}
          <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-lift)]", windowClass("bitbin"))}>
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
              <MockSearch className="ml-auto h-6 w-48" />
            </div>

            {setup ? (
              <div className="flex min-h-[300px] flex-1 flex-col gap-4 p-4 lg:min-h-0">
                <div>
                  <MockPathPill path="settings/ai-assistants" />
                  <p className="mt-2 font-display text-[16px] font-bold tracking-tight">New token</p>
                  <p className="text-xs text-muted-foreground">Choose what the assistant may do.</p>
                </div>
                <ul className="space-y-1.5">
                  {SCOPES.map((label, i) => {
                    const on = now >= SCOPE_AT[i];
                    return (
                      <li key={label} data-cursor={`scope${i}`} className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors duration-300", on ? "border-lime/30" : "border-border")}>
                        <span className={cn("grid size-4 shrink-0 place-items-center rounded border transition-colors duration-300", on ? "border-lime bg-lime text-background" : "border-border")}>
                          {on ? <Check className="size-3 animate-pop" strokeWidth={3} /> : null}
                        </span>
                        <span className={on ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
                {tokenMade ? (
                  <div className="animate-[fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both] space-y-2">
                    <div className="rounded-lg border border-lime/30 bg-lime/[0.04] px-3 py-2 font-mono text-[12px]">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Token · shown once</p>
                      <p className="mt-0.5 truncate text-foreground/90">bb_9f2c41ab7e…e41a</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-mono text-[11.5px]">
                      <p className="min-w-0 flex-1 truncate text-foreground/80">{CONNECT_CMD}</p>
                      <span
                        data-cursor="copy"
                        className={cn(
                          "shrink-0 rounded-md border px-2 py-0.5 text-[10.5px] transition-colors duration-300",
                          copied ? "border-lime/40 text-lime" : "border-border text-muted-foreground"
                        )}
                      >
                        {copied ? "Copied ✓" : "Copy"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span
                    data-cursor="create"
                    className="self-start rounded-lg bg-coral px-3.5 py-1.5 text-[13px] font-semibold text-background shadow-[0_8px_20px_-10px_var(--brand-coral)]"
                  >
                    Create token
                  </span>
                )}
              </div>
            ) : (
            <div key={scene.id} className="flex min-h-0 flex-1 animate-fade-in flex-col">
              {/* The collection page's header, as the app draws it: path, folder tile, name and [count] */}
              <div className="space-y-2 border-b border-border px-4 py-3.5">
                <MockPathPill path={collection.path} />
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg"
                    style={{
                      background: readableTint(collection.color, 16),
                      color: readableColor(collection.color),
                    }}
                  >
                    <FolderOpen className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-baseline gap-2 font-display text-[18px] font-bold tracking-tight">
                      {collection.name}
                      <span key={String(landed)} className={cn("font-mono text-xs font-normal tabular-nums", landed ? "animate-pop text-lime" : "text-muted-foreground")}>
                        [{collection.count + (landed ? 1 : 0)}]
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{collection.about}</p>
                  </div>
                </div>
              </div>

              {/* What's inside, by type: the chips under a collection's header */}
              <div className="flex flex-wrap gap-1.5 px-4 pt-3 font-mono text-[11px]">
                {collection.types.map(([Icon, color, name, n], i) => (
                  <span key={name} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-[color-mix(in_srgb,var(--card)_70%,transparent)] px-2 py-0.5 text-muted-foreground">
                    <Icon className="size-3" style={{ color: readableColor(color) }} />
                    {name}
                    <span className="tabular-nums text-foreground/80">{n + (landed && i === 0 ? 1 : 0)}</span>
                  </span>
                ))}
              </div>

              {/* Items: a saved one slides in at the top and pushes the rest down; a read one
                  lights up. The list is absolutely positioned so it never changes the window's
                  height: the terminal sets it, and whatever doesn't fit is clipped. */}
              <div className="relative min-h-[300px] flex-1 lg:min-h-0">
                <ul className="absolute inset-0 space-y-1.5 overflow-hidden p-3">
                  {landed && scene.lands ? (
                    <li className="animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] rounded-lg border border-lime/30 bg-lime/[0.04] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: readableTint(ORANGE, 15), color: readableColor(ORANGE) }}>
                          <Terminal className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {scene.lands.title}
                            <span className="rounded border border-lime/40 px-1 font-mono text-[9.5px] font-semibold tracking-wide text-lime">NEW</span>
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            <span className="text-lime">$</span> {scene.lands.preview}
                          </p>
                        </div>
                        <span className="hidden shrink-0 gap-1 font-mono text-[10.5px] sm:flex">
                          {scene.lands.tags.map((tag, i) => (
                            <span key={tag} className="animate-pop rounded bg-muted px-1.5 text-muted-foreground" style={{ animationDelay: `${300 + i * 120}ms` }}>
                              #{tag}
                            </span>
                          ))}
                        </span>
                      </div>
                    </li>
                  ) : null}
                  {scene.rows.map((row) => {
                    const Icon = row.icon;
                    const read = row.title === scene.reads && called(last);
                    return (
                      <li
                        key={row.title}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors duration-500",
                          read ? "border-lime/30 bg-lime/[0.04]" : "border-transparent"
                        )}
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: readableTint(row.color, 12), color: readableColor(row.color) }}>
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm text-foreground/90">
                            <span className="truncate">{row.title}</span>
                            {read ? <span className="shrink-0 animate-pop rounded border border-lime/40 px-1 font-mono text-[9.5px] font-semibold tracking-wide text-lime">READ</span> : null}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground/80">{row.preview}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{row.meta}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            )}

            {/* The endpoint's side of the conversation: every tool call is a POST to /api/v1/mcp */}
            <div className="shrink-0 border-t border-border bg-surface px-4 py-3 font-mono text-[11px]">
              <p className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground/85">
                <span>MCP log</span>
                <span className="normal-case tracking-normal">scoped tokens · Pro · 60 req/min</span>
              </p>
              <div className="h-[54px] space-y-0.5">
                {scene.steps.map((step, i) =>
                  answered(i) ? (
                    <p key={`${scene.id}-${step.tool}`} className="flex animate-fade-in gap-3">
                      <span className="w-9" style={{ color: readableColor(ORANGE) }}>
                        POST
                      </span>
                      <span className="flex-1 truncate text-foreground/80">
                        /api/v1/mcp <span style={{ color: readableColor(BLUE) }}>{step.tool}</span>
                      </span>
                      <span className="text-lime">200</span>
                      <span className="w-12 text-right text-muted-foreground">{step.ms}</span>
                    </p>
                  ) : null
                )}
                {!answered(0) ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-lime animate-led text-lime" /> waiting for tool calls…
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* The cursor that does each step */}
          {pos ? (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-0 left-0 z-20 transition-[transform,opacity] duration-[550ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
                cursorShown ? "opacity-100" : "opacity-0"
              )}
              style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
            >
              {lastClick !== undefined ? (
                <span key={lastClick} className="absolute -top-4 -left-4 size-8 animate-[cursor-ripple_0.6s_ease-out_both] rounded-full border-2 border-coral" />
              ) : null}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                className={cn("relative -mt-0.5 -ml-0.5 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition-transform duration-150", pressing && "scale-[0.82]")}
              >
                <path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              {setup && now >= PASTE_AT - 250 && now < PASTE_AT + 450 ? (
                <span className="absolute top-5 left-5 animate-pop rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground shadow-md">⌘V</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
