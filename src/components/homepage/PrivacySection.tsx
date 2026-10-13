"use client";

import { useEffect, useRef, useState } from "react";
import {
  Ban,
  Check,
  Database,
  Download,
  FileArchive,
  FileImage,
  FileText,
  KeyRound,
  Lock,
  LockOpen,
  MapPin,
  ShieldCheck,
  Smartphone,
  SquareTerminal,
  Upload,
  UserRound,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, useInView, usePagePaused } from "@/hooks/use-motion";
import { Accent, Section, Window } from "./ui";

// What happens to what you save, who can reach it, and how you take it with you.
// Three diagrams, each on its own loop while on screen:
// - the pipeline: a photo is uploaded, checked, cleaned of its location and
//   device details, and stored in your own private folder, one station at a time;
// - access: another account, an API token and you each ask for it, and the
//   check in front of the folder answers 404, 200 and 200;
// - data (Settings → Data): a ZIP export is chosen for import, previewed, imported.
// Every panel has a fixed layout, so nothing moves as it plays; reduced motion
// shows each one finished.

const TICK = 100;

/** A clock that runs from 0 to `loop` while `ref` is on screen and the page isn't paused. */
function useLoop<T extends HTMLElement>(loop: number) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const paused = usePagePaused();
  const [clock, setClock] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setStill(prefersReducedMotion()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!inView || still || paused) return;
    const id = window.setInterval(() => setClock((v) => (v + TICK) % loop), TICK);
    return () => window.clearInterval(id);
  }, [inView, still, paused, loop]);

  return [ref, still ? loop - TICK : clock] as const;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/* ─── The pipeline ─────────────────────────────────────────────────────────── */

const PIPE_LOOP = 10000;
// When each station takes the photo; the connector before it fills in the 500 ms before
const STATION_AT = [200, 1400, 3200, 5000];
const TICKS_AT = [1800, 2200, 2600]; // type, size, signature
const STRIP_AT = 3700;
const CLEAN_AT = 4200;
const FILE_IN_AT = 5400;
const LOCK_AT = 5900;

const STATIONS: { title: string; text: string }[] = [
  { title: "Upload", text: "You drop in a photo. As taken, it still says where it was shot and on what." },
  { title: "Checks", text: "Its type, size and file signature are checked. A file that only pretends to be an image is refused." },
  { title: "Clean", text: "Photos are saved again from scratch, so location and device details are left behind." },
  { title: "Your folder", text: "Stored in a private bucket, in a folder that is yours alone. There is no public link to it." },
];

const CHECKS: [label: string, value: string][] = [
  ["type", "image/jpeg"],
  ["size", "2.4 MB"],
  ["signature", "real JPEG"],
];

const FOLDER: [icon: LucideIcon, name: string][] = [
  [FileText, "notes.md"],
  [SquareTerminal, "deploy.sh"],
];

function Chip({ icon: Icon, children, className }: { icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] whitespace-nowrap", className)}>
      {Icon ? <Icon className="size-3" /> : null}
      {children}
    </span>
  );
}

function UploadVisual({ t }: { t: number }) {
  const progress = clamp((t - STATION_AT[0]) / 900);
  return (
    <div className="w-full max-w-[220px] rounded-md border border-border bg-card p-2.5">
      <p className="flex items-center gap-1.5 text-[12.5px]">
        <FileImage className="size-3.5 shrink-0 text-green" />
        <span className="truncate">photo.jpg</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">2.4 MB</span>
      </p>
      <p className="mt-2 flex flex-wrap gap-1">
        <Chip icon={MapPin} className="border-border bg-surface text-coral">GPS</Chip>
        <Chip icon={Smartphone} className="border-border bg-surface text-coral">device</Chip>
      </p>
      <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-green transition-[width] duration-100 ease-linear" style={{ width: `${progress * 100}%` }} />
      </span>
    </div>
  );
}

function ChecksVisual({ t }: { t: number }) {
  return (
    <ul className="w-full max-w-[220px] space-y-1.5">
      {CHECKS.map(([label, value], i) => {
        const done = t >= TICKS_AT[i];
        const checking = !done && t >= STATION_AT[1] && (i === 0 || t >= TICKS_AT[i - 1]);
        return (
          <li key={label} className="flex h-6 items-center gap-2 rounded-md border border-border bg-card px-2 font-mono text-[11px]">
            <span className="grid size-3.5 shrink-0 place-items-center">
              {done ? (
                <Check key="done" className="size-3.5 animate-pop text-green" strokeWidth={3} />
              ) : (
                <span className={cn("size-1.5 rounded-full", checking ? "animate-pulse bg-green" : "bg-muted-foreground/40")} />
              )}
            </span>
            <span className="text-foreground">{label}</span>
            <span className={cn("ml-auto truncate transition-opacity duration-300", done ? "text-muted-foreground opacity-100" : "opacity-0")}>{value}</span>
          </li>
        );
      })}
    </ul>
  );
}

function CleanVisual({ t }: { t: number }) {
  const stripped = t >= STRIP_AT;
  const clean = t >= CLEAN_AT;
  const rows: [LucideIcon, string][] = [
    [MapPin, "GPS 51.50, -0.12"],
    [Smartphone, "device · Pixel 8"],
  ];
  return (
    <div className="w-full max-w-[220px]">
      <ul className="space-y-1.5">
        {rows.map(([Icon, label]) => (
          <li
            key={label}
            className={cn(
              "flex h-6 items-center gap-2 rounded-md border px-2 font-mono text-[11px] transition-[opacity,border-color,color,translate] duration-500",
              stripped ? "translate-x-2 border-border bg-card text-muted-foreground/60 line-through" : "border-border bg-card text-coral"
            )}
          >
            <Icon className="size-3 shrink-0" />
            <span className="truncate">{label}</span>
            {stripped ? <X className="ml-auto size-3 shrink-0" /> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 h-5">
        {clean ? (
          <Chip icon={Check} className="animate-pop border-border bg-card text-green">
            saved again · clean
          </Chip>
        ) : null}
      </p>
    </div>
  );
}

function FolderVisual({ t }: { t: number }) {
  const fileIn = t >= FILE_IN_AT;
  const locked = t >= LOCK_AT;
  return (
    <div className={cn("w-full max-w-[220px] rounded-md border border-border bg-card p-2")}>
      <p className="flex items-center gap-1.5 font-mono text-[11px]">
        {locked ? <Lock key="locked" className="size-3 animate-pop text-green" /> : <LockOpen className="size-3 text-muted-foreground" />}
        you/
        <span className="ml-auto text-[10px] text-muted-foreground">private</span>
      </p>
      <ul className="mt-1.5 space-y-0.5 font-mono text-[10.5px] text-muted-foreground">
        {FOLDER.map(([Icon, name]) => (
          <li key={name} className="flex h-[18px] items-center gap-1.5 px-1">
            <Icon className="size-3" /> {name}
          </li>
        ))}
        <li
          className={cn(
            "flex h-[18px] items-center gap-1.5 rounded px-1 transition-[opacity,translate] duration-500",
            fileIn ? "translate-y-0 bg-surface text-green opacity-100" : "-translate-y-2 opacity-0"
          )}
        >
          <FileImage className="size-3" /> photo.jpg
          <span className="ml-auto text-[9.5px]">new</span>
        </li>
      </ul>
    </div>
  );
}

const VISUALS = [UploadVisual, ChecksVisual, CleanVisual, FolderVisual];

function PipelinePanel() {
  const [ref, t] = useLoop<HTMLDivElement>(PIPE_LOOP);
  const current = STATION_AT.findLastIndex((at) => t >= at);

  return (
    <div ref={ref}>
      <Window title="~/your-bin · what happens to a file" right={<ShieldCheck className="size-3.5 text-muted-foreground" />}>
        <ol className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-4">
          {STATIONS.map((station, i) => {
            const reached = i <= current;
            const now = i === current && i < STATIONS.length - 1 ? t < STATION_AT[i + 1] : i === current;
            const done = reached && !now;
            const Visual = VISUALS[i];
            // The connector into the next station fills as the photo moves on
            const filled = i < STATIONS.length - 1 && t >= STATION_AT[i + 1] - 500;
            return (
              <li
                key={station.title}
                className={cn(
                  "relative flex flex-col rounded-lg border border-border bg-surface p-3.5",
                  !reached && "[&>*]:opacity-55"
                )}
              >
                <p className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[10px] transition-colors duration-300",
                      reached ? "border-green bg-green text-primary-foreground" : "border-border text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="text-[13.5px] font-medium">{station.title}</span>
                  <span className={cn("ml-auto font-mono text-[10px]", now ? "text-green" : "text-muted-foreground")}>
                    {now ? "now" : done ? "done" : "next"}
                  </span>
                </p>
                <div className="mt-3 flex h-[96px] items-center justify-center">
                  <Visual t={t} />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">{station.text}</p>

                {/* Down to the next station on a phone, across on a wide screen */}
                {i < STATIONS.length - 1 ? (
                  <span aria-hidden className="absolute top-full left-1/2 h-5 w-px bg-border lg:top-[22px] lg:left-full lg:h-px lg:w-5">
                    <span
                      className={cn(
                        "absolute inset-0 origin-top bg-green transition-transform duration-500 lg:origin-left",
                        filled ? "scale-100" : "scale-y-0 lg:scale-x-0 lg:scale-y-100"
                      )}
                    />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Window>
    </div>
  );
}

/* ─── Who can open it ──────────────────────────────────────────────────────── */

const ACCESS_LOOP = 12500;
const LEG = 700; // requester ↔ check
const ROW = 300; // each thing the check looks at
const DECIDE = 200;
const LEG2 = 500; // check ↔ folder
const FLASH = 600;

type Verdict = "ok" | "bad";
type Requester = {
  name: string;
  sub: string;
  icon: LucideIcon;
  tone: string;
  at: number;
  pass: boolean;
  code: string;
  result: string;
  rows: [label: string, value: string, verdict: Verdict][];
  text: string;
};

// Top to bottom on the diagram; they ask bottom to top
const REQUESTERS: Requester[] = [
  {
    name: "You",
    sub: "signed in",
    icon: UserRound,
    tone: "text-green",
    at: 7300,
    pass: true,
    code: "200",
    result: "200 · photo.jpg sent",
    rows: [
      ["session", "valid", "ok"],
      ["owner", "you", "ok"],
    ],
    text: "Your files are only ever served through the app, after checking they're yours.",
  },
  {
    name: "API token",
    sub: "bb_…3f2a",
    icon: KeyRound,
    tone: "text-violet",
    at: 3200,
    pass: true,
    code: "200",
    result: "200 · within its scope",
    rows: [
      ["token", "matches its stored hash", "ok"],
      ["scope", "items:read", "ok"],
      ["expires", "in 87 days", "ok"],
    ],
    text: "Tokens for the extension, desktop app and MCP reach only what their scopes allow, and always expire.",
  },
  {
    name: "Another account",
    sub: "signed in",
    icon: UserX,
    tone: "text-muted-foreground",
    at: 400,
    pass: false,
    code: "404",
    result: "404 not found",
    rows: [
      ["session", "valid", "ok"],
      ["owner", "someone else", "bad"],
    ],
    text: "Not yours is answered exactly like doesn't exist, so nobody can probe for what you keep.",
  },
];

// The vertical centres of the three requester cards, in a diagram this tall
const CARD_H = 46;
const CARD_GAP = 12;
const DIAGRAM_H = CARD_H * 3 + CARD_GAP * 2;
const ROW_Y = [0, 1, 2].map((i) => i * (CARD_H + CARD_GAP) + CARD_H / 2);
const MID_Y = ROW_Y[1];

function timing(r: Requester) {
  const arrive = r.at + LEG;
  const decide = arrive + r.rows.length * ROW + DECIDE;
  const atFolder = decide + LEG2;
  const end = r.pass ? atFolder + LEG2 + LEG : decide + LEG;
  return { arrive, decide, atFolder, end };
}

type Wire = { kind: "request" | "denied" | "file"; leg1?: number; leg2?: number } | { kind: "checking"; leg1?: undefined; leg2?: undefined };

/** Where the request is: on the line to the check (`leg1`) or to the folder (`leg2`), 0 at the near end. */
function wire(r: Requester, t: number): Wire | null {
  const { arrive, decide, atFolder, end } = timing(r);
  if (t < r.at || t >= end) return null;
  if (t < arrive) return { leg1: (t - r.at) / LEG, kind: "request" };
  if (t < decide) return { kind: "checking" };
  if (!r.pass) return { leg1: 1 - (t - decide) / LEG, kind: "denied" };
  if (t < atFolder) return { leg2: (t - decide) / LEG2, kind: "request" };
  if (t < atFolder + LEG2) return { leg2: 1 - (t - atFolder) / LEG2, kind: "file" };
  return { leg1: 1 - (t - atFolder - LEG2) / LEG, kind: "file" };
}

function Packet({ kind, style }: { kind: "request" | "denied" | "file"; style: React.CSSProperties }) {
  return (
    <span
      className={cn(
        "absolute z-10 grid -translate-1/2 place-items-center transition-[left,top] duration-100 ease-linear",
        kind === "request" && "size-2.5 rounded-full bg-foreground",
        kind === "denied" && "size-5 rounded-full bg-destructive text-white",
        kind === "file" && "size-5 rounded-md bg-green text-primary-foreground"
      )}
      style={style}
    >
      {kind === "denied" ? <X className="size-3" strokeWidth={3} /> : kind === "file" ? <FileImage className="size-3" /> : null}
    </span>
  );
}

function AccessPanel() {
  const [ref, t] = useLoop<HTMLDivElement>(ACCESS_LOOP);

  const active = REQUESTERS.findIndex((r) => wire(r, t) !== null);
  const now = active >= 0 ? wire(REQUESTERS[active], t) : null;
  // The inspector shows the request on the wire, or the last one answered
  let shownIndex = active;
  if (shownIndex < 0) {
    REQUESTERS.forEach((r, i) => {
      if (t >= r.at && (shownIndex < 0 || r.at > REQUESTERS[shownIndex].at)) shownIndex = i;
    });
  }
  const shown = shownIndex >= 0 ? REQUESTERS[shownIndex] : null;
  const shownTime = shown ? timing(shown) : null;

  const checking = now?.kind === "checking";
  const denied = REQUESTERS.some((r) => !r.pass && t >= timing(r).decide && t < timing(r).decide + FLASH);
  const passed = REQUESTERS.some((r) => r.pass && t >= timing(r).decide && t < timing(r).decide + FLASH);
  const reached = REQUESTERS.some((r) => r.pass && t >= timing(r).atFolder && t < timing(r).atFolder + FLASH);
  const served = REQUESTERS.some((r) => r.pass && t >= timing(r).end);

  const lineTone = (r: Requester, i: number) => {
    const { decide, end } = timing(r);
    if (active === i) return t >= decide ? (r.pass ? "stroke-green" : "stroke-destructive") : "stroke-foreground/60";
    if (t >= end) return r.pass ? "stroke-green/45" : "stroke-destructive/45";
    return "stroke-border";
  };

  const y = active >= 0 && now?.leg1 !== undefined ? ROW_Y[active] + (MID_Y - ROW_Y[active]) * now.leg1 : MID_Y;

  return (
    <div ref={ref}>
      <Window title="~/your-bin · who can open it" right={<Lock className="size-3.5 text-muted-foreground" />}>
        <div className="p-4 lg:h-[392px]">
          <div className="grid grid-cols-[auto_minmax(24px,1fr)_auto_minmax(16px,0.6fr)_auto] items-center" style={{ height: DIAGRAM_H }}>
            {/* Who is asking */}
            <ul className="flex h-full flex-col justify-between">
              {REQUESTERS.map((r, i) => {
                const answered = t >= timing(r).end;
                return (
                  <li
                    key={r.name}
                    style={{ height: CARD_H }}
                    className={cn(
                      "flex w-[118px] flex-col justify-center rounded-lg border border-border px-2.5 transition-colors duration-300 sm:w-[172px]",
                      active === i ? "bg-muted" : "bg-surface"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[11.5px] font-medium">
                      <r.icon className={cn("size-3.5 shrink-0", r.tone)} />
                      <span className="truncate">{r.name}</span>
                      {answered ? (
                        <span key="code" className={cn("ml-auto animate-pop font-mono text-[10px]", r.pass ? "text-green" : "text-destructive")}>
                          {r.code}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 truncate pl-5 font-mono text-[9.5px] text-muted-foreground">{r.sub}</span>
                  </li>
                );
              })}
            </ul>

            {/* Three lines into the check */}
            <div className="relative h-full">
              <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 100 ${DIAGRAM_H}`} preserveAspectRatio="none">
                {REQUESTERS.map((r, i) => (
                  <line
                    key={r.name}
                    x1="0"
                    y1={ROW_Y[i]}
                    x2="100"
                    y2={MID_Y}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={active === i || t >= timing(r).end ? undefined : "3 3"}
                    strokeWidth="1.25"
                    className={cn("transition-[stroke] duration-300", lineTone(r, i))}
                  />
                ))}
              </svg>
              {now && now.kind !== "checking" && now.leg1 !== undefined ? (
                <Packet kind={now.kind} style={{ left: `${100 * now.leg1}%`, top: `${(y / DIAGRAM_H) * 100}%` }} />
              ) : null}
            </div>

            {/* The check: session or token, and whose the file is */}
            <div className="relative flex flex-col items-center">
                            <span
                className={cn(
                  "relative grid size-12 place-items-center rounded-full border border-border transition-colors duration-300",
                  denied ? "bg-surface text-destructive" : passed ? "bg-surface text-green" : checking ? "bg-muted text-foreground" : "bg-surface text-muted-foreground"
                )}
              >
                {denied ? <Ban className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <span className="absolute top-full mt-1.5 font-mono text-[10px] whitespace-nowrap text-muted-foreground">check</span>
            </div>

            {/* On to the folder */}
            <div className="relative h-full">
              <span
                className={cn(
                  "absolute inset-x-0 top-1/2 border-t transition-colors duration-300",
                  now?.leg2 !== undefined ? "border-solid border-green" : served ? "border-solid border-green/45" : "border-dashed border-border"
                )}
              />
              {now && now.kind !== "checking" && now.leg2 !== undefined ? <Packet kind={now.kind} style={{ left: `${100 * now.leg2}%`, top: "50%" }} /> : null}
            </div>

            <div
              className={cn(
                "w-[84px] rounded-lg border border-border bg-surface p-2 font-mono text-[10px] sm:w-[104px]"
              )}
            >
              <p className="flex items-center gap-1 text-[10.5px] text-foreground">
                <Lock className="size-3 shrink-0 text-green" /> you/
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-muted-foreground">
                <FileText className="size-3 shrink-0" /> <span className="truncate">notes.md</span>
              </p>
              <p className={cn("mt-1 flex items-center gap-1 transition-colors duration-300", reached ? "text-green" : "text-muted-foreground")}>
                <FileImage className="size-3 shrink-0" /> <span className="truncate">photo.jpg</span>
              </p>
            </div>
          </div>

          {/* The inspector: what the check looks at for the request shown, and its answer */}
          <div className="mt-5 min-h-[200px] rounded-lg lg:h-[176px] lg:min-h-0 border border-border bg-surface p-3">
            {shown && shownTime ? (
              <div key={shown.name} className="animate-fade-in">
                <p className="flex items-center gap-2 font-mono text-[11px]">
                  <shown.icon className={cn("size-3.5 shrink-0", shown.tone)} />
                  <span className="truncate">{shown.name.toLowerCase()}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">GET photo.jpg</span>
                </p>
                <ul className="mt-2 h-[60px] space-y-0.5 font-mono text-[11px]">
                  {shown.rows.map(([label, value, verdict], i) => {
                    const visible = t >= shownTime.arrive + i * ROW;
                    const ticked = t >= shownTime.arrive + (i + 1) * ROW;
                    return (
                      <li key={label} className={cn("flex h-[19px] items-center gap-2 transition-opacity duration-200", visible ? "opacity-100" : "opacity-0")}>
                        <span className="w-[56px] shrink-0 text-muted-foreground">{label}</span>
                        <span className={cn("truncate", ticked && verdict === "bad" ? "text-destructive" : "text-foreground")}>{value}</span>
                        <span className="ml-auto grid size-3.5 shrink-0 place-items-center">
                          {ticked ? (
                            verdict === "ok" ? (
                              <Check className="size-3.5 animate-pop text-green" strokeWidth={3} />
                            ) : (
                              <X className="size-3.5 animate-pop text-destructive" strokeWidth={3} />
                            )
                          ) : (
                            <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className={cn("mt-1.5 border-t border-border pt-2 transition-opacity duration-300", t >= shownTime.decide ? "opacity-100" : "opacity-0")}>
                  <p className={cn("font-mono text-[11px] font-medium", shown.pass ? "text-green" : "text-destructive")}>→ {shown.result}</p>
                  <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{shown.text}</p>
                </div>
              </div>
            ) : (
              <p className="font-mono text-[11px] text-muted-foreground">waiting for a request…</p>
            )}
          </div>
        </div>
      </Window>
    </div>
  );
}

/* ─── Export and import ────────────────────────────────────────────────────── */

const DATA_LOOP = 9000;
const PICK_AT = 1000;
const READ_AT = 1700;
const PREVIEW_AT = 2800;
const IMPORT_AT = 5600;
const DONE_AT = 6500;

const PREVIEW = ["42 snippets", "18 prompts", "67 commands", "12 notes", "29 links", "13 files and images", "6 collections", "31 unique tags", "13 stored files to restore"];

function DataPanel() {
  const [ref, t] = useLoop<HTMLDivElement>(DATA_LOOP);
  const dialog = t >= PICK_AT && t < DONE_AT;
  const reading = t >= READ_AT && t < PREVIEW_AT;
  const preview = t >= PREVIEW_AT;
  const importing = t >= IMPORT_AT && t < DONE_AT;
  const done = t >= DONE_AT;
  const shown = Math.min(PREVIEW.length, Math.max(0, Math.floor((t - PREVIEW_AT) / 130)));
  const button = "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[12.5px] whitespace-nowrap";

  return (
    <div ref={ref}>
      <Window title="~/settings · data" right={<Database className="size-3.5 text-muted-foreground" />}>
        <div className="relative h-[330px] p-4 lg:h-[392px]">
          <p className="text-[13px] font-medium">Export</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={button}>
              <Download className="size-3.5" /> Export JSON
            </span>
            <span className={button}>
              <Download className="size-3.5" /> Export ZIP
            </span>
            <span className="rounded border border-coral/30 bg-coral/10 px-1.5 font-mono text-[10px] font-semibold text-coral">PRO</span>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            JSON holds every item and collection. The ZIP adds your text items as readable files and every upload. One collection exports the same two ways.
          </p>

          <div className="mt-4">
            <p className="text-[13px] font-medium">Import</p>
            <span className={cn(button, "mt-2 transition-[scale,border-color,color] duration-150", t >= PICK_AT - 300 && t < PICK_AT + 200 && "scale-95 border-lime/50 text-lime")}>
              <Upload className="size-3.5" /> Import from JSON or ZIP
            </span>
            <p key={String(done)} className={cn("mt-2 flex items-center gap-2 text-[12.5px]", done ? "animate-pop text-lime" : "text-muted-foreground")}>
              {done ? (
                <>
                  <Check className="size-3.5" strokeWidth={3} /> Imported 181 items, 6 collections, 12 duplicates skipped
                </>
              ) : (
                "Original dates are kept, and an import either completes or changes nothing."
              )}
            </p>
          </div>

          {/* The Import Data dialog: the file, what it holds, then Import */}
          <div className={cn("absolute inset-0 grid place-items-center bg-black/35 p-4 transition-opacity duration-300", dialog ? "opacity-100" : "pointer-events-none opacity-0")}>
            <div className={cn("w-full max-w-[340px] rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-lift)] transition-[scale,translate] duration-300", dialog ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.97]")}>
              <p className="flex items-center text-[13.5px] font-semibold">
                Import Data
                <X className="ml-auto size-3.5 text-muted-foreground" />
              </p>
              <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <FileArchive className="size-3.5" /> bitbin-export.zip
              </p>
              <div className="mt-2.5 h-[128px] rounded-lg border border-border bg-surface px-3 py-2.5">
                {reading ? (
                  <p className="animate-pulse text-[12.5px] text-muted-foreground">Reading file...</p>
                ) : preview ? (
                  <>
                    <p className="text-[12.5px] font-medium">Preview</p>
                    <p className="mt-1 grid grid-cols-2 gap-x-3 text-[11.5px] leading-[1.55] text-muted-foreground">
                      {PREVIEW.slice(0, shown).map((line) => (
                        <span key={line} className="animate-fade-in truncate">
                          {line}
                        </span>
                      ))}
                    </p>
                  </>
                ) : null}
              </div>
              <p className="mt-2.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <span className="grid size-3.5 shrink-0 place-items-center rounded-[3px] bg-lime text-primary-foreground">
                  <Check className="size-2.5" strokeWidth={3.5} />
                </span>
                Skip duplicates (matches on title + type + content)
              </p>
              <p className="mt-3 flex justify-end">
                <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-md bg-lime px-3 text-[12.5px] font-semibold text-primary-foreground transition-[scale,filter] duration-150", importing && "scale-95 brightness-90")}>
                  <Upload className="size-3.5" /> {importing ? "Importing…" : "Import"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </Window>
    </div>
  );
}

/* ─── The rest, as an audit ────────────────────────────────────────────────── */

const AUDIT_LOOP = 10000;
const COMMAND = "bitbin audit --privacy";
const TYPE_AT = 300;
const CHAR = 45;
const LINES_AT = TYPE_AT + COMMAND.length * CHAR + 400;
const LINE = 520; // one line every LINE ms, each checked RUN ms after it appears
const RUN = 280;

const AUDIT: [key: string, value: string][] = [
  ["passwords", "kept only as a bcrypt hash, never as typed"],
  ["sessions", "Sign out everywhere ends every one at once"],
  ["tokens", "stored hashed, scoped, expire in 30, 90 or 365 days"],
  ["page", "no third-party scripts, no ad or tracking cookies"],
  ["training", "your content never trains a model"],
  ["delete", "removes every item and file, and cancels billing"],
];
const SUMMARY_AT = LINES_AT + AUDIT.length * LINE + 300;

function AuditPanel() {
  const [ref, t] = useLoop<HTMLDivElement>(AUDIT_LOOP);
  const typed = COMMAND.slice(0, Math.max(0, Math.floor((t - TYPE_AT) / CHAR)));
  const typing = typed.length < COMMAND.length;

  return (
    <div ref={ref}>
      <Window title="~/your-bin · audit" right={<ShieldCheck className="size-3.5 text-muted-foreground" />}>
        <div className="p-4 font-mono text-[12px] sm:p-5">
          <p className="flex items-center gap-2">
            <span className="text-green">$</span>
            <span>{typed}</span>
            {typing || t < LINES_AT ? <span className="caret" /> : null}
          </p>
          <ul className="mt-3 space-y-1.5">
            {AUDIT.map(([key, value], i) => {
              const at = LINES_AT + i * LINE;
              const shown = t >= at;
              const passed = t >= at + RUN;
              return (
                <li
                  key={key}
                  className={cn(
                    "grid grid-cols-[16px_76px_minmax(0,1fr)] items-start gap-x-2 transition-[opacity,translate] duration-300 sm:grid-cols-[16px_96px_minmax(0,1fr)]",
                    shown ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                  )}
                >
                  <span className="grid h-[18px] place-items-center">
                    {passed ? (
                      <Check key="ok" className="size-3.5 animate-pop text-green" strokeWidth={3} />
                    ) : (
                      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                    )}
                  </span>
                  <span className="leading-[18px] text-foreground">{key}</span>
                  <span className={cn("leading-[18px] transition-colors duration-300", passed ? "text-muted-foreground" : "text-faint dark:text-muted-foreground/50")}>
                    {passed ? value : "checking…"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p key={String(t >= SUMMARY_AT)} className={cn("mt-3 flex items-center gap-2 border-t border-border pt-3", t >= SUMMARY_AT ? "animate-fade-in text-green" : "opacity-0")}>
            <ShieldCheck className="size-3.5 shrink-0" />
            {AUDIT.length} of {AUDIT.length} passed · your bin stays yours
          </p>
        </div>
      </Window>
    </div>
  );
}

export default function PrivacySection() {
  return (
    <Section
      id="privacy"
      index="02"
      label="data and privacy"
      accent="var(--brand-green)"
      title={
        <>
          Private by default. <Accent>Yours to take.</Accent>
        </>
      }
      description="Only your account can open what you save, and all of it leaves with you whenever you like. Here is what happens to a file, who can reach it, and how you take your bin elsewhere."
    >
      <div className="space-y-5">
        <div data-scroll="unfold">
          <PipelinePanel />
        </div>

        {/* The two panels open like the pages of a book */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div data-scroll="book-left">
            <AccessPanel />
          </div>
          <div data-scroll="book-right">
            <DataPanel />
          </div>
        </div>

        <div data-scroll="unfold">
          <AuditPanel />
        </div>
      </div>
    </Section>
  );
}
