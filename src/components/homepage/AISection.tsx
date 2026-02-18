import { Check, Sparkles } from "lucide-react";
import ScrollFadeIn from "./ScrollFadeIn";

const CHECKLIST = [
  "Auto-tag suggestions based on content",
  "AI-generated summaries for long snippets",
  "\u201CExplain This Code\u201D one-click breakdowns",
  "Prompt optimizer for better AI results",
];

const AI_TAGS = ["react", "hooks", "debounce", "typescript", "performance"];

export default function AISection() {
  return (
    <section id="ai" className="py-[120px] bg-[#0a0a0f]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 gap-16 items-center max-md:grid-cols-1 max-md:gap-10">
          {/* Left info */}
          <ScrollFadeIn>
            <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-5">
              Pro Feature
            </span>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
              AI-Powered
              <br />
              <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                Productivity
              </span>
            </h2>
            <p className="text-base text-[#8888a4] max-w-[520px] mb-8 leading-relaxed">
              Let AI handle the busywork so you can focus on building.
            </p>
            <ul className="flex flex-col gap-4">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-[#8888a4]">
                  <Check className="size-5 text-[#22c55e] shrink-0" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </ScrollFadeIn>

          {/* Right code mockup */}
          <ScrollFadeIn>
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a28] border-b border-[#1e1e2e]">
                <div className="flex gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
                </div>
                <span className="text-xs text-[#55556a] font-mono">typescript</span>
              </div>

              {/* Code body */}
              <div className="py-4 font-mono text-[0.82rem] leading-relaxed">
                {[
                  { num: 1, code: <><span className="text-[#c678dd]">export</span> <span className="text-[#c678dd]">function</span> <span className="text-[#61afef]">useDebounce</span><span className="text-[#8888a4]">&lt;</span><span className="text-[#e5c07b]">T</span><span className="text-[#8888a4]">&gt;(</span></> },
                  { num: 2, code: <>  <span className="text-[#e06c75]">value</span>: <span className="text-[#e5c07b]">T</span>,</> },
                  { num: 3, code: <>  <span className="text-[#e06c75]">delay</span>: <span className="text-[#e5c07b]">number</span></> },
                  { num: 4, code: <><span className="text-[#8888a4]">):</span> <span className="text-[#e5c07b]">T</span> <span className="text-[#8888a4]">{"{"}</span></> },
                  { num: 5, code: <>  <span className="text-[#c678dd]">const</span> [debounced, setDebounced] =</> },
                  { num: 6, code: <>    <span className="text-[#61afef]">useState</span><span className="text-[#8888a4]">(</span><span className="text-[#e06c75]">value</span><span className="text-[#8888a4]">);</span></> },
                  { num: 7, code: <></> },
                  { num: 8, code: <>  <span className="text-[#61afef]">useEffect</span><span className="text-[#8888a4]">{"(() => {"}</span></> },
                  { num: 9, code: <>    <span className="text-[#c678dd]">const</span> t = <span className="text-[#61afef]">setTimeout</span><span className="text-[#8888a4]">{"(() =>"}</span></> },
                  { num: 10, code: <>      <span className="text-[#61afef]">setDebounced</span><span className="text-[#8888a4]">(</span><span className="text-[#e06c75]">value</span><span className="text-[#8888a4]">),</span> <span className="text-[#e06c75]">delay</span><span className="text-[#8888a4]">);</span></> },
                  { num: 11, code: <>    <span className="text-[#c678dd]">return</span> <span className="text-[#8888a4]">{"() =>"}</span> <span className="text-[#61afef]">clearTimeout</span><span className="text-[#8888a4]">(</span>t<span className="text-[#8888a4]">);</span></> },
                  { num: 12, code: <>  <span className="text-[#8888a4]">{"}, ["}</span><span className="text-[#e06c75]">value</span>, <span className="text-[#e06c75]">delay</span><span className="text-[#8888a4]">{"]);"}</span></> },
                  { num: 13, code: <></> },
                  { num: 14, code: <>  <span className="text-[#c678dd]">return</span> debounced;</> },
                  { num: 15, code: <><span className="text-[#8888a4]">{"}"}</span></> },
                ].map((line) => (
                  <div key={line.num} className="px-4 hover:bg-white/[0.03]">
                    <span className="inline-block w-7 text-right mr-4 text-[#55556a] select-none">
                      {line.num}
                    </span>
                    {line.code}
                  </div>
                ))}
              </div>

              {/* AI Tags */}
              <div className="px-4 py-4 border-t border-[#1e1e2e] bg-[rgba(249,158,11,0.04)]">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b] uppercase tracking-wide mb-2.5">
                  <Sparkles className="size-3.5" />
                  AI Generated Tags
                </span>
                <div className="flex gap-2 flex-wrap">
                  {AI_TAGS.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#1a1a28] border border-[#1e1e2e] text-[#8888a4] px-3 py-1 rounded-full text-xs font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </ScrollFadeIn>
        </div>
      </div>
    </section>
  );
}
