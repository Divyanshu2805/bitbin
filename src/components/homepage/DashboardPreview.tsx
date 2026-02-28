import { LogoMark } from "@/components/shared/logo";

const SIDEBAR_ITEMS = [
  { label: "Snippets", color: "#3b82f6", active: true },
  { label: "Prompts", color: "#8b5cf6" },
  { label: "Commands", color: "#f97316" },
  { label: "Notes", color: "#fde047" },
  { label: "Files", color: "#6b7280" },
  { label: "Images", color: "#ec4899" },
  { label: "Links", color: "#10b981" },
];

const COLLECTION_CARDS = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981"];
const RECENT_CARDS = ["#ec4899", "#3b82f6", "#fde047", "#6b7280"];

function DashCard({ color }: { color: string }) {
  return (
    <div className="relative flex flex-col gap-1.5 overflow-hidden rounded-md border border-border bg-surface-2 p-2">
      <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: color }} />
      <div className="flex items-center gap-1">
        <span className="h-[5px] w-[5px] rounded-sm" style={{ background: color }} />
        <div className="h-[5px] w-[55%] rounded-sm bg-muted-foreground/50" />
      </div>
      <div className="h-[3px] w-[90%] rounded-sm bg-border" />
      <div className="h-[3px] w-[50%] rounded-sm bg-border" />
    </div>
  );
}

/** Miniature, non-interactive mock of the BitBin dashboard used in the hero */
export default function DashboardPreview() {
  return (
    <div className="relative flex h-[280px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(194,242,75,0.25)] max-md:h-[220px]">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <LogoMark className="h-3.5 w-3.5" animated />
        <div className="flex h-3.5 flex-1 items-center rounded border border-border bg-background px-1.5">
          <div className="h-[3px] w-10 rounded bg-muted-foreground/40" />
          <span className="ml-auto font-mono text-[6px] text-muted-foreground">⌘K</span>
        </div>
        <div className="h-3.5 w-8 rounded bg-lime" />
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <div className="flex w-[92px] shrink-0 flex-col gap-0.5 border-r border-border bg-sidebar p-2">
          <span className="mb-1 px-1.5 font-mono text-[0.4rem] uppercase tracking-widest text-muted-foreground/70">
            Types
          </span>
          {SIDEBAR_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`relative flex items-center gap-1.5 rounded px-1.5 py-[3px] ${
                item.active ? "bg-accent" : ""
              }`}
            >
              {item.active && (
                <span className="absolute -left-2 top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded-full bg-lime" />
              )}
              <span
                className="h-[5px] w-[5px] shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <span
                className={`whitespace-nowrap text-[0.45rem] font-medium leading-none ${
                  item.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-2.5">
          <div className="grid grid-cols-4 gap-1">
            {["#c2f24b", "#ff7a4d", "#5ee6d8", "#a78bfa"].map((c) => (
              <div key={c} className="rounded border border-border bg-surface-2 p-1">
                <div className="h-[5px] w-3 rounded-sm" style={{ background: c }} />
                <div className="mt-1 h-[3px] w-6 rounded-sm bg-border" />
              </div>
            ))}
          </div>
          <div className="font-mono text-[0.42rem] font-bold uppercase tracking-wider text-muted-foreground">
            Collections
          </div>
          <div className="grid grid-cols-2 gap-1.5 stagger">
            {COLLECTION_CARDS.map((c) => (
              <DashCard key={`col-${c}`} color={c} />
            ))}
          </div>
          <div className="font-mono text-[0.42rem] font-bold uppercase tracking-wider text-muted-foreground">
            Recent
          </div>
          <div className="grid grid-cols-2 gap-1.5 stagger">
            {RECENT_CARDS.map((c) => (
              <DashCard key={`rec-${c}`} color={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
