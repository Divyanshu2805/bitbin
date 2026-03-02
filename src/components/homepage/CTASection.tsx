import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";
import ScrollFadeIn from "./ScrollFadeIn";

export default function CTASection() {
  return (
    <section className="px-6 pb-[120px]">
      <ScrollFadeIn className="mx-auto max-w-[1120px]">
        <div className="noise relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-20 text-center">
          <div className="bg-grid mask-radial absolute inset-0" aria-hidden />
          <div
            className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-lime/10 blur-[100px] animate-glow"
            aria-hidden
          />

          <div className="relative">
            <div className="mx-auto mb-6 w-fit animate-float">
              <LogoMark animated className="h-14 w-14" />
            </div>
            <h2 className="mx-auto max-w-[620px] text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              Your future self will thank you for binning it.
            </h2>
            <p className="mx-auto mt-4 max-w-[460px] text-muted-foreground">
              Join developers who stopped losing their best work to closed tabs.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-9 h-12 rounded-xl px-7 text-base font-semibold transition-all hover:-translate-y-0.5"
            >
              <Link href="/register">
                Create your bin
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </ScrollFadeIn>
    </section>
  );
}
