"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ScrollFadeIn from "./ScrollFadeIn";
import SectionHeading from "./SectionHeading";

const FREE_FEATURES = [
  { text: "50 items", included: true },
  { text: "3 collections", included: true },
  { text: "Snippets, prompts, commands, notes, links", included: true },
  { text: "Basic search", included: true },
  { text: "File & image uploads", included: false },
  { text: "AI features", included: false },
];

const PRO_FEATURES = [
  "Unlimited items",
  "Unlimited collections",
  "All item types including files & images",
  "AI auto-tagging & summaries",
  "“Explain this code”",
  "AI prompt optimizer",
  "Data export (JSON/ZIP)",
];

const BILLING_OPTIONS = [
  { label: "Monthly", yearly: false },
  { label: "Yearly", yearly: true },
];

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-[120px]">
      <div className="mx-auto max-w-[1120px] px-6">
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title="Free to start. Cheap to keep."
          description="Upgrade when your bin gets full. Cancel whenever."
        />

        {/* Billing toggle */}
        <ScrollFadeIn delay={80}>
          <div className="mx-auto mb-12 mt-10 flex w-fit items-center rounded-xl border border-border bg-card p-1">
            {BILLING_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setIsYearly(opt.yearly)}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                  isYearly === opt.yearly
                    ? "bg-accent text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={isYearly === opt.yearly}
              >
                {opt.label}
                {opt.yearly && (
                  <span className="rounded-md bg-lime/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-lime">
                    -25%
                  </span>
                )}
              </button>
            ))}
          </div>
        </ScrollFadeIn>

        <div className="mx-auto grid max-w-[780px] grid-cols-2 gap-5 max-md:grid-cols-1">
          {/* Free */}
          <ScrollFadeIn>
            <div className="card-lift flex h-full flex-col rounded-2xl border border-border bg-card p-8 text-left">
              <h3 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Free</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold tracking-tight">$0</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Perfect for getting started</p>

              <ul className="my-8 flex flex-1 flex-col gap-3">
                {FREE_FEATURES.map((f) => (
                  <li
                    key={f.text}
                    className={cn(
                      "flex items-center gap-2.5 text-sm",
                      f.included ? "text-muted-foreground" : "text-muted-foreground/45 line-through"
                    )}
                  >
                    {f.included ? (
                      <Check className="size-4 shrink-0 text-lime" strokeWidth={2.5} />
                    ) : (
                      <Minus className="size-4 shrink-0" />
                    )}
                    {f.text}
                  </li>
                ))}
              </ul>
              <Button variant="outline" asChild className="w-full rounded-xl">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          </ScrollFadeIn>

          {/* Pro with a slowly rotating gradient border */}
          <ScrollFadeIn delay={100}>
            <div className="relative h-full overflow-hidden rounded-2xl p-px">
              <div
                className="absolute inset-[-60%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,var(--brand-lime)_320deg,var(--brand-cyan)_360deg)]"
                aria-hidden
              />
              <div className="relative flex h-full flex-col rounded-[15px] bg-card p-8 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm uppercase tracking-widest text-lime">Pro</h3>
                  <span className="rounded-full bg-coral/15 px-2.5 py-0.5 text-xs font-semibold text-coral">
                    Most popular
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    key={isYearly ? "yearly" : "monthly"}
                    className="font-display text-5xl font-bold tracking-tight animate-fade-up"
                  >
                    {isYearly ? "$6" : "$8"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {isYearly ? "/month, billed $72/yr" : "/month"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">For serious developers</p>

                <ul className="my-8 flex flex-1 flex-col gap-3">
                  {PRO_FEATURES.map((text) => (
                    <li key={text} className="flex items-center gap-2.5 text-sm text-foreground/85">
                      <Check className="size-4 shrink-0 text-lime" strokeWidth={2.5} />
                      {text}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full rounded-xl font-semibold">
                  <Link href="/register">Go Pro</Link>
                </Button>
              </div>
            </div>
          </ScrollFadeIn>
        </div>
      </div>
    </section>
  );
}
