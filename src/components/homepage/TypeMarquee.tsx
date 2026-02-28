import { Code, Sparkles, Terminal, StickyNote, File, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

const ENTRIES = [
  { icon: Code, color: "#3b82f6", text: "useDebounce.ts" },
  { icon: Terminal, color: "#f97316", text: "git rebase -i HEAD~3" },
  { icon: Sparkles, color: "#8b5cf6", text: "Refactor for readability" },
  { icon: StickyNote, color: "#fde047", text: "Postgres index cheatsheet" },
  { icon: LinkIcon, color: "#10b981", text: "tailwindcss.com/docs" },
  { icon: File, color: "#6b7280", text: "nginx.conf" },
  { icon: ImageIcon, color: "#ec4899", text: "architecture-v2.png" },
  { icon: Code, color: "#3b82f6", text: "zod schema helpers" },
  { icon: Terminal, color: "#f97316", text: "docker system prune -af" },
  { icon: Sparkles, color: "#8b5cf6", text: "Write unit tests for…" },
];

/** Infinite ticker of example items — sits between the hero and features */
export default function TypeMarquee() {
  const row = [...ENTRIES, ...ENTRIES];

  return (
    <div className="relative overflow-hidden border-y border-border bg-surface py-4 [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max gap-3 animate-marquee hover:[animation-play-state:paused]">
        {row.map((entry, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground"
          >
            <entry.icon className="h-3.5 w-3.5" style={{ color: entry.color }} />
            {entry.text}
          </span>
        ))}
      </div>
    </div>
  );
}
