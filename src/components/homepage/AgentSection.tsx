"use client";

import { useEffect, useRef, useState } from "react";
import { Code, FolderOpen, Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor, readableTint } from "@/lib/utils/color";
import { MockPathPill, MockSearch } from "./mock-app";
import { AgentSpinner, ResultLine, ToolLine } from "@/components/shared/agent-spinner";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { Accent, SectionHeading } from "./ui";

// A coding agent in a terminal, filing something into BitBin through the real
// token API (see docs/api/token-api.md), with BitBin's own window beside it
// showing the item land, tagged and in the right collection. One clock drives
// both; the EVENTS table is the script.

const PROMPT = "save the kubectl command we used to debug the api pod to my bitbin, under Infra";
const TICK = 100;
const RATE = 1.5; // script ms per real ms: the demo plays this much faster than written
const LOOP = 15500;

const TYPE_END = 400 + PROMPT.length * 28;

const EVENTS = {
  think1: TYPE_END + 300,
  collections: TYPE_END + 1500,
  collectionsResult: TYPE_END + 2100,
  think2: TYPE_END + 2400,
  tags: TYPE_END + 3300,
  tagsResult: TYPE_END + 3900,
  todos: TYPE_END + 4400,
  think3: TYPE_END + 5000,
  save: TYPE_END + 5800,
  saveResult: TYPE_END + 6400,
  done: TYPE_END + 7000,
};

// The Infra collection before the agent's save lands.
// The command and snippet type colours
const ORANGE = "#fb923c";
const BLUE = "#60a5fa";

const ROWS = [
  { icon: Terminal, color: "#fb923c", title: "docker system prune", preview: "$ docker system prune -af --volumes", meta: "command · 2d" },
  { icon: Code, color: "#60a5fa", title: "nginx reverse proxy", preview: "location /api { proxy_pass http://api:3000; }", meta: "snippet · 5d" },
  { icon: Terminal, color: "#fb923c", title: "psql connect to staging", preview: "$ psql \"$STAGING_DATABASE_URL\"", meta: "command · 1w" },
  { icon: Sparkles, color: "#a78bfa", title: "Incident runbook", preview: "You are an SRE. Write a runbook for…", meta: "prompt · 2w" },
  { icon: Terminal, color: "#fb923c", title: "Restart a deployment", preview: "$ kubectl rollout restart deploy/api", meta: "command · 3w" },
  { icon: Code, color: "#60a5fa", title: "Healthcheck script", preview: "curl -fsS $URL/health || exit 1", meta: "snippet · 1mo" },
];

// Each of the agent's calls, as the API logs it.
const REQUESTS = [
  { at: EVENTS.collectionsResult, method: "GET", path: "/api/v1/collections", status: 200, ms: "84ms" },
  { at: EVENTS.tagsResult, method: "POST", path: "/api/v1/ai/tags", status: 200, ms: "612ms" },
  { at: EVENTS.saveResult, method: "POST", path: "/api/v1/items", status: 201, ms: "97ms" },
];

function Todo({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("block transition-colors duration-500", done ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground")}>
      <span className={done ? "text-lime" : ""}>{done ? "☒" : "☐"}</span> {children}
    </span>
  );
}

export default function AgentSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const paused = usePagePaused();
  const [t, setT] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!inView || still || paused) return;
    const id = window.setInterval(() => setT((v) => (v + TICK * RATE) % LOOP), TICK);
    return () => window.clearInterval(id);
  }, [inView, still, paused]);

  const now = still ? LOOP - TICK : t;
  const at = (ms: number) => now >= ms;
  const typed = PROMPT.slice(0, Math.max(0, Math.floor((now - 400) / 28)));
  const thinking =
    (at(EVENTS.think1) && !at(EVENTS.collections)) ||
    (at(EVENTS.think2) && !at(EVENTS.tags)) ||
    (at(EVENTS.think3) && !at(EVENTS.save));
  const saved = at(EVENTS.saveResult);

  return (
    <section
      id="agents"
      className="relative scroll-mt-24 py-24 sm:py-32"
      style={{ "--accent": "var(--brand-coral)" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeading
          index="01.2"
          label="agents · pro"
          title={
            <>
              Built for the age of <Accent>coding agents.</Accent>
            </>
          }
          description="Give your scripts or your AI coding agent a BitBin token, and the command it just figured out ends up in your bin: tagged, filed, and one ⌘K away next time."
        />

        <div ref={ref} className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* The agent's terminal */}
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-lift)]">
            <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-4">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">~/projects/api — agent</span>
            </div>

            <div className="h-[470px] overflow-hidden p-4 font-mono text-[13px] leading-[1.75] sm:p-5">
              {/* Welcome box */}
              <div className="rounded-lg border border-coral/40 px-3 py-2">
                <p>
                  <span className="text-coral">✻</span> Welcome! Your agent can reach BitBin.
                </p>
                <p className="pl-5 text-muted-foreground">BITBIN_TOKEN=bb_•••• · cwd: ~/projects/api</p>
              </div>

              <div className="mt-4 space-y-2.5">
                <p className="text-foreground">
                  <span className="text-muted-foreground">&gt; </span>
                  {typed}
                  {now < TYPE_END ? <span className="caret" /> : null}
                </p>

                {at(EVENTS.collections) ? (
                  <div className="animate-fade-in">
                    <ToolLine name="Bash" args="curl $BITBIN/api/v1/collections" state={at(EVENTS.collectionsResult) ? "done" : "running"} />
                    {at(EVENTS.collectionsResult) ? <ResultLine>Found &quot;Infra&quot; (cm4a…)</ResultLine> : null}
                  </div>
                ) : null}

                {at(EVENTS.tags) ? (
                  <div className="animate-fade-in">
                    <ToolLine name="Bash" args="curl -X POST $BITBIN/api/v1/ai/tags" state={at(EVENTS.tagsResult) ? "done" : "running"} />
                    {at(EVENTS.tagsResult) ? (
                      <ResultLine>
                        [<span className="text-tok-str">&quot;k8s&quot;</span>, <span className="text-tok-str">&quot;logs&quot;</span>,{" "}
                        <span className="text-tok-str">&quot;debug&quot;</span>]
                      </ResultLine>
                    ) : null}
                  </div>
                ) : null}

                {at(EVENTS.todos) ? (
                  <div className="animate-fade-in">
                    <ToolLine name="Update Todos" />
                    <ResultLine>
                      <Todo done>Find the Infra collection</Todo>
                      <Todo done>Suggest tags</Todo>
                      <Todo done={saved}>Save the command</Todo>
                    </ResultLine>
                  </div>
                ) : null}

                {at(EVENTS.save) ? (
                  <div className="animate-fade-in">
                    <ToolLine name="Bash" args="curl -X POST $BITBIN/api/v1/items" state={saved ? "done" : "running"} />
                    {saved ? (
                      <ResultLine>
                        <span className="text-lime">201 Created</span> · &quot;Tail pod logs&quot; → Infra
                      </ResultLine>
                    ) : null}
                  </div>
                ) : null}

                {at(EVENTS.done) ? (
                  <p className="animate-fade-in">
                    <span className="text-lime">⏺</span> Saved. It&apos;s one ⌘K away in BitBin.
                  </p>
                ) : null}

                {thinking ? <AgentSpinner timer hint="esc to interrupt" className="text-[13px]" /> : null}
              </div>
            </div>

            {/* Input box, like the agent's prompt */}
            <div className="border-t border-border px-4 pt-3 pb-2 sm:px-5">
              <div className="rounded-lg border border-border px-3 py-2 font-mono text-[13px] text-muted-foreground">
                &gt; <span className={now < TYPE_END ? "" : "caret"} />
              </div>
              <p className="mt-1.5 flex justify-between font-mono text-[11px] text-muted-foreground/85">
                <span>? for shortcuts</span>
                <span className={saved ? "text-lime" : ""}>{saved ? "✓ synced to bitbin" : "bitbin connected"}</span>
              </p>
            </div>
          </div>

          {/* BitBin, on the other side of the API: the Infra collection, with the
              request log along the bottom in step with the agent's calls */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-lift)]">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
              <MockSearch className="ml-auto h-6 w-48" />
            </div>

            {/* The collection page's header, as the app draws it: path, folder tile, name and [count] */}
            <div className="space-y-2 border-b border-border px-4 py-3.5">
              <MockPathPill path="collections/infra" />
              <div className="flex items-center gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg"
                  style={{ background: readableTint(ORANGE, 12), color: readableColor(ORANGE), boxShadow: `inset 0 0 0 1px ${readableTint(ORANGE, 30)}, 0 10px 24px -12px ${readableColor(ORANGE)}` }}
                >
                  <FolderOpen className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2 font-display text-[18px] font-bold tracking-tight">
                    Infra
                    <span
                      key={saved ? "12" : "11"}
                      className={cn("font-mono text-xs font-normal tabular-nums", saved ? "animate-pop text-lime" : "text-muted-foreground")}
                    >
                      [{saved ? 12 : 11}]
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">Servers, containers and deploys</p>
                </div>
              </div>
            </div>

            {/* What's inside, by type: the chips under a collection's header */}
            <div className="flex flex-wrap gap-1.5 px-4 pt-3 font-mono text-[11px]">
              {(
                [
                  [Terminal, "#f97316", "commands", saved ? 6 : 5],
                  [Code, "#3b82f6", "snippets", 4],
                  [Sparkles, "#8b5cf6", "prompts", 2],
                ] as const
              ).map(([Icon, color, name, n]) => (
                <span key={name} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-[color-mix(in_srgb,var(--card)_70%,transparent)] px-2 py-0.5 text-muted-foreground">
                  <Icon className="size-3" style={{ color: readableColor(color) }} />
                  {name}
                  <span className="tabular-nums text-foreground/80">{n}</span>
                </span>
              ))}
            </div>

            {/* Items: the new one slides in at the top and pushes the rest down. The
                list is absolutely positioned so it never changes the window's height:
                the terminal sets it, and whatever doesn't fit is clipped. */}
            <div className="relative min-h-[380px] flex-1 lg:min-h-0">
              <ul className="absolute inset-0 space-y-1.5 overflow-hidden p-3">
                {saved ? (
                  <li className="animate-[fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both] rounded-lg border border-lime/30 bg-lime/[0.04] px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: readableTint(ORANGE, 15), color: readableColor(ORANGE) }}>
                        <Terminal className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          Tail pod logs
                          <span className="rounded border border-lime/40 px-1 font-mono text-[9.5px] font-semibold tracking-wide text-lime">NEW</span>
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          <span className="text-lime">$</span> kubectl logs -f deploy/api
                        </p>
                      </div>
                      <span className="flex shrink-0 gap-1 font-mono text-[10.5px]">
                        {["k8s", "logs", "debug"].map((tag, i) => (
                          <span key={tag} className="animate-pop rounded bg-muted px-1.5 text-muted-foreground" style={{ animationDelay: `${300 + i * 120}ms` }}>
                            #{tag}
                          </span>
                        ))}
                      </span>
                    </div>
                  </li>
                ) : null}
                {ROWS.map((row) => {
                  const Icon = row.icon;
                  return (
                    <li key={row.title} className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: readableTint(row.color, 12), color: readableColor(row.color) }}>
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground/90">{row.title}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground/80">{row.preview}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{row.meta}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* The API's side of the conversation */}
            <div className="shrink-0 border-t border-border bg-surface px-4 py-3 font-mono text-[11px]">
              <p className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground/85">
                <span>API log</span>
                <span className="normal-case tracking-normal">tokens are Pro · 60 req/min</span>
              </p>
              <div className="h-[54px] space-y-0.5">
                {REQUESTS.filter((req) => at(req.at)).map((req) => (
                  <p key={req.path} className="flex animate-fade-in gap-3">
                    <span className="w-9" style={{ color: readableColor(req.method === "GET" ? BLUE : ORANGE) }}>
                      {req.method}
                    </span>
                    <span className="flex-1 truncate text-foreground/80">{req.path}</span>
                    <span className="text-lime">{req.status}</span>
                    <span className="w-12 text-right text-muted-foreground">{req.ms}</span>
                  </p>
                ))}
                {!at(REQUESTS[0].at) ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-lime animate-led text-lime" /> waiting for requests…
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
