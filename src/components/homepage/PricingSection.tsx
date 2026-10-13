"use client";

import { useRef, useState } from "react";
import { Check, Infinity as InfinityIcon } from "lucide-react";
import { useInView } from "@/hooks/use-motion";
import { MAX_ITEMS } from "@/lib/constants/plan";
import { FREE_FEATURES as FREE, PRO_FEATURES as PRO } from "@/lib/constants/pricing";
import PlanCompare from "@/components/shared/plan-compare";
import { Accent, CtaLink, Section } from "./ui";

// Free and Pro, side by side, then a row-by-row comparison (`PlanCompare`). The feature lists
// and the comparison are shared with the upgrade page (lib/constants/pricing.ts).

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const meterRef = useRef<HTMLDivElement>(null);
  const meterSeen = useInView(meterRef, { once: true, threshold: 0.6 });

  return (
    <Section
      id="pricing"
      index="03"
      label="pricing"
      align="center"
      title={
        <>
          Room to begin. <Accent>Space to grow.</Accent>
        </>
      }
      description="Upgrade when your bin gets full. Cancel whenever you like."
    >
      {/* Billing: a thumb slides under the chosen option */}
      <div className="plan-billing" data-yearly={yearly || undefined}>
        <span aria-hidden className="plan-billing-thumb" />
        {[
          { label: "Monthly", value: false },
          { label: "Yearly", value: true },
        ].map((opt) => (
          <button key={opt.label} type="button" aria-pressed={yearly === opt.value} onClick={() => setYearly(opt.value)}>
            {opt.label}
            {opt.value ? <span className="plan-badge">-25%</span> : null}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-3xl items-stretch gap-4 text-left md:grid-cols-2">
        {/* Free: plain ink, no colour */}
        <div data-scroll="book-left" className="plan-card">
          <p className="plan-kicker flex h-[22px] items-center">Plan 01</p>
          <h3 className="mt-2">Free</h3>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="plan-price">$0</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </p>
          <p className="mt-2 min-h-5 text-sm text-muted-foreground">For getting your bin started.</p>

          {/* How the limit feels */}
          <div ref={meterRef} className="plan-meter mt-5">
            <p className="flex items-center justify-between">
              Your bin
              <span>
                <span className="text-foreground">38</span> / {MAX_ITEMS} items
              </span>
            </p>
            <span className="plan-meter-bar">
              <span style={{ transform: `scaleX(${meterSeen ? 38 / MAX_ITEMS : 0})` }} />
            </span>
          </div>

          <PlanList features={FREE} />
          <CtaLink href="/register" variant="secondary" className="w-full">
            Start for free
          </CtaLink>
        </div>

        {/* Pro: the same card as a solid block of the brand colour */}
        <div data-scroll="book-right" data-featured className="plan-card" style={{ "--tone": "var(--brand-lime)" } as React.CSSProperties}>
          <div className="flex h-[22px] items-center justify-between">
            <p className="plan-kicker">Plan 02</p>
            <span className="plan-badge">Recommended</span>
          </div>
          <h3 className="mt-2">Pro</h3>
          <p className="mt-5 flex items-baseline gap-2">
            <span key={String(yearly)} className="plan-price animate-[fade-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">
              {yearly ? "$6" : "$8"}
            </span>
            {yearly ? <span className="text-xl text-faint line-through dark:text-muted-foreground/60">$8</span> : null}
            <span className="text-sm text-muted-foreground">/ month</span>
          </p>
          <p className="mt-2 min-h-5 text-sm text-muted-foreground">
            {yearly ? (
              <span key="y" className="animate-fade-in">
                Billed $72 a year · <span className="text-[var(--tone)]">save $24</span>
              </span>
            ) : (
              <span key="m" className="animate-fade-in">
                For developers who keep everything.
              </span>
            )}
          </p>

          <div className="plan-meter mt-5 flex items-center justify-between">
            Your bin
            <span className="flex items-center gap-1.5 text-[var(--tone)]">
              <InfinityIcon className="size-4" /> no limits
            </span>
          </div>

          <PlanList features={PRO} />
          <CtaLink href="/register" variant="primary" className="w-full">
            {yearly ? "Go Pro for $72 a year" : "Go Pro for $8 a month"}
          </CtaLink>
        </div>
      </div>

      <PlanCompare className="mt-10" />

      <p className="mt-6 text-center font-mono text-xs text-muted-foreground">Prices in USD · payments by Stripe · cancel any time from Settings</p>
    </Section>
  );
}

function PlanList({ features }: { features: readonly string[] }) {
  return (
    <ul className="plan-list my-6 flex-1 text-foreground/90">
      {features.map((text) => (
        <li key={text}>
          <span aria-hidden className="plan-tick">
            <Check className="size-3" strokeWidth={3} />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}
