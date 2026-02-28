"use client";

import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChaosAnimation from "./ChaosAnimation";
import DashboardPreview from "./DashboardPreview";
import ScrollFadeIn from "./ScrollFadeIn";

export default function HeroSection() {
  return (
    <section className="noise relative flex min-h-screen flex-col items-center px-6 pb-24 pt-36 max-md:px-5 max-md:pt-28">
      {/* Backdrop */}
      <div className="bg-grid mask-radial pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-lime/[0.07] blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-[1120px]">
        <div className="max-w-[760px]">
          <a
            href="#ai"
            className="group mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 py-1 pl-1.5 pr-3 text-xs text-muted-foreground backdrop-blur transition-colors hover:border-lime/40 hover:text-foreground animate-fade-up"
          >
            <span className="rounded-full bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary-foreground">
              New
            </span>
            AI auto-tagging &amp; code explain for Pro
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1
            className="text-[clamp(2.5rem,6vw,4.6rem)] font-bold leading-[1.02] tracking-[-0.035em] animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            Every snippet, prompt
            <br className="max-sm:hidden" /> &amp; command —{" "}
            <span className="relative whitespace-nowrap">
              <span className="text-brand-gradient">in one bin.</span>
              <svg
                className="absolute -bottom-2 left-0 w-full text-lime/60"
                viewBox="0 0 300 12"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M2 9c60-6 130-8 296-4"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="[stroke-dasharray:320] [stroke-dashoffset:320] animate-[draw_1.2s_0.6s_ease-out_forwards]"
                />
              </svg>
            </span>
          </h1>

          <p
            className="mt-6 max-w-[560px] text-lg leading-relaxed text-muted-foreground animate-fade-up max-sm:text-base"
            style={{ animationDelay: "160ms" }}
          >
            Your best work is scattered across Notion, gists, Slack threads and a
            dozen browser tabs. BitBin pulls it into one fast, searchable place
            you&apos;ll actually open.
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl px-7 text-base font-semibold shadow-[0_0_0_1px_rgba(194,242,75,0.4),0_12px_40px_-10px_rgba(194,242,75,0.55)] transition-all hover:-translate-y-0.5"
            >
              <Link href="/register">
                Start binning — it&apos;s free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              size="lg"
              className="h-12 rounded-xl border-border bg-transparent px-6 text-base text-muted-foreground hover:text-foreground"
            >
              <a href="#features">
                See how it works
                <kbd className="ml-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px]">⌘K</kbd>
              </a>
            </Button>
          </div>
        </div>

        {/* Before / after */}
        <ScrollFadeIn className="mt-20 flex w-full items-center gap-6 max-md:flex-col max-md:gap-5">
          <div className="flex-1 max-md:w-full">
            <span className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
              before · 14 tabs, 3 apps
            </span>
            <ChaosAnimation />
          </div>

          <div
            className="shrink-0 text-lime max-md:rotate-0"
            style={{ animation: "pulse-arrow 2s ease-in-out infinite" }}
          >
            <ArrowRight className="size-9 max-md:hidden" />
            <ArrowDown className="size-9 md:hidden" />
          </div>

          <div className="flex-1 max-md:w-full">
            <span className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              after · one bin
            </span>
            <DashboardPreview />
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
