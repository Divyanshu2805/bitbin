import { Code, Sparkles, Search, Terminal, FileText, FolderOpen } from "lucide-react";
import ScrollFadeIn from "./ScrollFadeIn";
import SectionHeading from "./SectionHeading";

const FEATURES = [
  {
    icon: Code,
    title: "Code snippets",
    description:
      "Save reusable code with syntax highlighting, language detection and one-click copy. Never rewrite the same function twice.",
    accent: "#3b82f6",
    span: "md:col-span-2",
    preview: (
      <pre className="mt-6 overflow-hidden rounded-lg border border-border bg-background p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
        <span className="text-[#c678dd]">const</span> <span className="text-[#61afef]">sleep</span> = (ms: <span className="text-[#e5c07b]">number</span>) =&gt;{"\n"}
        {"  "}<span className="text-[#c678dd]">new</span> <span className="text-[#e5c07b]">Promise</span>((r) =&gt; <span className="text-[#61afef]">setTimeout</span>(r, ms));
      </pre>
    ),
  },
  {
    icon: Search,
    title: "Instant search",
    description:
      "Find anything in milliseconds across titles, content, tags and types. Hit ⌘K from anywhere.",
    accent: "#5ee6d8",
    span: "",
    preview: (
      <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        <span className="text-foreground">docker</span>
        <span className="h-3.5 w-1.5 bg-cyan animate-blink" />
        <span className="ml-auto rounded border border-border px-1">⌘K</span>
      </div>
    ),
  },
  {
    icon: Sparkles,
    title: "AI prompts",
    description:
      "Build a personal prompt library for ChatGPT, Claude and friends, right next to your code.",
    accent: "#a78bfa",
    span: "",
  },
  {
    icon: Terminal,
    title: "Commands",
    description:
      "Keep your most-used terminal incantations one copy away. No more digging through shell history.",
    accent: "#ff7a4d",
    span: "",
  },
  {
    icon: FileText,
    title: "Files & docs",
    description:
      "Upload files, images and docs and keep project assets alongside the code that uses them.",
    accent: "#8b919b",
    span: "",
  },
  {
    icon: FolderOpen,
    title: "Collections",
    description:
      "Group related items by project, topic or workflow. An item can live in as many collections as you need.",
    accent: "#c2f24b",
    span: "md:col-span-2 lg:col-span-3",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-[120px]">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="What goes in the bin"
            title={
              <>
                Everything you reach for,
                <br />
                <span className="text-muted-foreground">in one place.</span>
              </>
            }
          />
          <ScrollFadeIn delay={120}>
            <p className="max-w-[340px] text-sm leading-relaxed text-muted-foreground">
              Stop context-switching between tools. BitBin keeps every developer
              resource organized, tagged and searchable.
            </p>
          </ScrollFadeIn>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <ScrollFadeIn key={f.title} delay={i * 70} className={f.span}>
              <div
                className="card-lift group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6"
                style={{ "--accent-color": f.accent } as React.CSSProperties}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `color-mix(in srgb, ${f.accent} 22%, transparent)` }}
                />
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                    style={{
                      background: `color-mix(in srgb, ${f.accent} 12%, transparent)`,
                      borderColor: `color-mix(in srgb, ${f.accent} 25%, transparent)`,
                      color: f.accent,
                    }}
                  >
                    <f.icon className="size-5" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
                {f.preview}
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
