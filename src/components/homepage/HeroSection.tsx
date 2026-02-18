"use client";

import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChaosAnimation from "./ChaosAnimation";
import DashboardPreview from "./DashboardPreview";
import ScrollFadeIn from "./ScrollFadeIn";

export default function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-[120px] pb-20 max-md:px-5 max-md:pt-[100px] max-md:pb-[60px] text-center bg-[#0a0a0f]">
      <ScrollFadeIn className="max-w-[720px] mb-16">
        <h1 className="text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[1.15] mb-5 tracking-tight max-sm:text-[1.8rem]">
          Stop Losing Your
          <br />
          <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 bg-clip-text text-transparent">
            Developer Knowledge
          </span>
        </h1>
        <p className="text-lg text-[#8888a4] max-w-[560px] mx-auto mb-8 leading-relaxed max-sm:text-base">
          Your snippets, prompts, commands, and notes are scattered across Notion, GitHub, Slack,
          and a dozen browser tabs. BitBin brings them all into one fast, searchable hub.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg" className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400 text-white border-0 px-8 py-3 text-base hover:opacity-90 hover:-translate-y-0.5 transition-all">
            <Link href="/register">Get Started Free</Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="border-[#1e1e2e] text-[#8888a4] hover:text-[#e4e4ef] hover:border-[#8888a4] bg-transparent px-8 py-3 text-base">
            <a href="#features">See Features</a>
          </Button>
        </div>
      </ScrollFadeIn>

      <ScrollFadeIn className="flex items-center gap-8 w-full max-w-[960px] max-md:flex-col max-md:gap-6">
        {/* Chaos side */}
        <div className="flex-1 max-md:w-full">
          <span className="block text-center text-xs text-[#55556a] mb-3 uppercase tracking-widest font-semibold">
            Your knowledge today...
          </span>
          <ChaosAnimation />
        </div>

        {/* Arrow */}
        <div className="shrink-0 text-[#55556a]" style={{ animation: "pulse-arrow 2s ease-in-out infinite" }}>
          <ArrowRight className="size-12 max-md:hidden" />
          <ArrowDown className="size-12 md:hidden" />
        </div>

        {/* Dashboard side */}
        <div className="flex-1 max-md:w-full">
          <span className="block text-center text-xs text-[#55556a] mb-3 uppercase tracking-widest font-semibold">
            ...with BitBin
          </span>
          <DashboardPreview />
        </div>
      </ScrollFadeIn>
    </section>
  );
}
