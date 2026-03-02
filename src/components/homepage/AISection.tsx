import { Check, Sparkles, Wand2 } from "lucide-react";
import ScrollFadeIn from "./ScrollFadeIn";
import SectionHeading from "./SectionHeading";

const CHECKLIST = [
  "Auto-tag suggestions based on content",
  "AI-generated summaries for long snippets",
  "“Explain this code” one-click breakdowns",
  "Prompt optimizer for better AI results",
];

const AI_TAGS = ["react", "hooks", "debounce", "typescript", "performance"];

const CODE_LINES = [
  <><span className="text-[#c678dd]">export</span> <span className="text-[#c678dd]">function</span> <span className="text-[#61afef]">useDebounce</span><span className="text-muted-foreground">&lt;</span><span className="text-[#e5c07b]">T</span><span className="text-muted-foreground">&gt;(</span></>,
  <>  <span className="text-[#e06c75]">value</span>: <span className="text-[#e5c07b]">T</span>,</>,
  <>  <span className="text-[#e06c75]">delay</span>: <span className="text-[#e5c07b]">number</span></>,
  <><span className="text-muted-foreground">):</span> <span className="text-[#e5c07b]">T</span> <span className="text-muted-foreground">{"{"}</span></>,
  <>  <span className="text-[#c678dd]">const</span> [debounced, setDebounced] =</>,
  <>    <span className="text-[#61afef]">useState</span><span className="text-muted-foreground">(</span><span className="text-[#e06c75]">value</span><span className="text-muted-foreground">);</span></>,
  <></>,
  <>  <span className="text-[#61afef]">useEffect</span><span className="text-muted-foreground">{"(() => {"}</span></>,
  <>    <span className="text-[#c678dd]">const</span> t = <span className="text-[#61afef]">setTimeout</span><span className="text-muted-foreground">{"(() =>"}</span></>,
  <>      <span className="text-[#61afef]">setDebounced</span><span className="text-muted-foreground">(</span><span className="text-[#e06c75]">value</span><span className="text-muted-foreground">),</span> <span className="text-[#e06c75]">delay</span><span className="text-muted-foreground">);</span></>,
  <>    <span className="text-[#c678dd]">return</span> <span className="text-muted-foreground">{"() =>"}</span> <span className="text-[#61afef]">clearTimeout</span><span className="text-muted-foreground">(</span>t<span className="text-muted-foreground">);</span></>,
  <>  <span className="text-muted-foreground">{"}, ["}</span><span className="text-[#e06c75]">value</span>, <span className="text-[#e06c75]">delay</span><span className="text-muted-foreground">{"]);"}</span></>,
  <></>,
  <>  <span className="text-[#c678dd]">return</span> debounced;</>,
  <><span className="text-muted-foreground">{"}"}</span></>,
];

export default function AISection() {
  return (
    <section id="ai" className="relative border-y border-border bg-surface py-[120px]">
      <div className="bg-dots mask-radial pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[1120px] px-6">
        <div className="grid grid-cols-[1fr_1.15fr] items-center gap-16 max-md:grid-cols-1 max-md:gap-12">
          {/* Left info */}
          <div>
            <SectionHeading
              eyebrow="Pro · AI inside"
              title={
                <>
                  Let the bin
                  <br />
                  <span className="text-brand-gradient">do the busywork.</span>
                </>
              }
              description="BitBin reads what you save and does the boring bits for you — tags, descriptions and plain-English explanations."
            />
            <ul className="mt-8 flex flex-col gap-3">
              {CHECKLIST.map((item, i) => (
                <ScrollFadeIn key={item} delay={i * 80}>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-lime/15 text-lime">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                </ScrollFadeIn>
              ))}
            </ul>
          </div>

          {/* Right code mockup */}
          <ScrollFadeIn delay={120}>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-lime/[0.06] blur-2xl" aria-hidden />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">useDebounce.ts</span>
                </div>

                <div className="py-4 font-mono text-[0.8rem] leading-relaxed">
                  {CODE_LINES.map((code, i) => (
                    <div key={i} className="px-4 transition-colors hover:bg-lime/[0.04]">
                      <span className="mr-4 inline-block w-6 select-none text-right text-muted-foreground/50">
                        {i + 1}
                      </span>
                      {code}
                    </div>
                  ))}
                </div>

                <div className="border-t border-border bg-lime/[0.03] px-4 py-4">
                  <span className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-lime">
                    <Sparkles className="size-3.5" />
                    AI suggested tags
                  </span>
                  <div className="flex flex-wrap gap-2 stagger">
                    {AI_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-lime/20 bg-lime/[0.07] px-2.5 py-1 font-mono text-xs text-lime"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating "explain" bubble */}
              <div className="absolute -right-5 top-[38%] hidden max-w-[220px] rounded-xl border border-border bg-popover p-3 shadow-2xl animate-float sm:block">
                <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-coral">
                  <Wand2 className="size-3.5" />
                  Explain
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Delays updating a value until it stops changing for{" "}
                  <code className="font-mono text-foreground">delay</code> ms.
                </p>
              </div>
            </div>
          </ScrollFadeIn>
        </div>
      </div>
    </section>
  );
}
