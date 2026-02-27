import { Code, Sparkles, Terminal, StickyNote, Link as LinkIcon } from "lucide-react";

const LINES = [
  { prompt: "bin", text: "add --type command", tone: "text-foreground" },
  { prompt: "›", text: 'docker compose up -d --build', tone: "text-cyan" },
  { prompt: "✓", text: "saved to Commands · tagged docker, devops", tone: "text-lime" },
  { prompt: "bin", text: 'search "debounce"', tone: "text-foreground" },
  { prompt: "›", text: "useDebounce.ts  ·  snippet  ·  2d ago", tone: "text-muted-foreground" },
];

const TYPES = [
  { icon: Code, label: "Snippets", color: "#3b82f6" },
  { icon: Sparkles, label: "Prompts", color: "#8b5cf6" },
  { icon: Terminal, label: "Commands", color: "#f97316" },
  { icon: StickyNote, label: "Notes", color: "#fde047" },
  { icon: LinkIcon, label: "Links", color: "#10b981" },
];

/**
 * Decorative panel on the left side of the auth screens: a faux terminal
 * session that types itself out, plus the item types BitBin stores.
 */
export default function AuthShowcase() {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-6 rounded-3xl bg-lime/10 blur-3xl animate-glow" aria-hidden />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">~/bitbin</span>
        </div>

        <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed stagger">
          {LINES.map((line, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-6 shrink-0 text-right text-coral">{line.prompt}</span>
              <span className={line.tone}>{line.text}</span>
            </div>
          ))}
          <div className="flex gap-3">
            <span className="w-6 shrink-0 text-right text-coral">bin</span>
            <span className="inline-block h-4 w-2 translate-y-0.5 bg-lime animate-blink" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        {TYPES.map((t, i) => (
          <span
            key={t.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground animate-fade-up"
            style={{ animationDelay: `${400 + i * 70}ms` }}
          >
            <t.icon className="h-3.5 w-3.5" style={{ color: t.color }} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
