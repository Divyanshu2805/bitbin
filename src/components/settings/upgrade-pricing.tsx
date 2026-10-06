'use client';

import { useState } from 'react';
import { SegmentedTabs } from '@/components/shared/segmented-tabs';
import { Check, Infinity as InfinityIcon, Loader2, Minus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { startCheckout } from '@/lib/stripe-client';
import { FREE_FEATURES, PRO_FEATURES } from '@/lib/constants/pricing';
import { MAX_COLLECTIONS, MAX_ITEMS } from '@/lib/constants/plan';
import PageHeader, { TitleAccent } from '@/components/shared/page-header';
import UsageMeter from '@/components/shared/usage-meter';

interface UpgradePricingProps {
  itemCount: number;
  collectionCount: number;
}

/**
 * The in-app upgrade page, drawn like the landing page's pricing section: a
 * sliding billing toggle, Free (with your real usage) next to Pro, whose border
 * has a light running round it.
 */
export default function UpgradePricing({ itemCount, collectionCount }: UpgradePricingProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  async function handleUpgrade(plan: 'monthly' | 'yearly') {
    setLoading(plan);
    try {
      await startCheckout(plan);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  const plan = isYearly ? 'yearly' : 'monthly';

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PageHeader
        path="upgrade"
        title={
          <>
            Go <TitleAccent>Pro</TitleAccent>
          </>
        }
        description="Unlimited items, files and images, AI helpers, the browser extension and API tokens."
      >
        {/* Billing: the same segmented toggle as the editors' */}
        <SegmentedTabs
          className="animate-fade-up [&_[role=tab]]:px-4 [&_[role=tab]]:py-1.5 [&_[role=tab]]:text-[13px]"
          tabs={[
            { id: "monthly", label: "Monthly" },
            { id: "yearly", label: "Yearly", badge: "-25%" },
          ]}
          active={isYearly ? "yearly" : "monthly"}
          onChange={(id) => setIsYearly(id === "yearly")}
        />
      </PageHeader>

      <div className="grid items-stretch gap-4 stagger md:grid-cols-2">
        {/* Free: where you are now */}
        <div className="flex flex-col rounded-xl border border-border bg-card/80 p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Free</p>
            <span className="rounded-md border border-border px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground">
              current plan
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-extrabold tracking-tight">$0</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </p>
          <p className="text-desc mt-1 h-5 text-[13px]">Where your bin is today.</p>

          <div className="mt-4 space-y-1.5">
            <UsageMeter label="items" used={itemCount} limit={MAX_ITEMS} />
            <UsageMeter label="collections" used={collectionCount} limit={MAX_COLLECTIONS} />
          </div>

          <ul className="mb-5 mt-4 flex-1 space-y-2 border-t border-border/60 pt-4">
            {FREE_FEATURES.map((f) => (
              <li
                key={f.text}
                className={cn('flex items-start gap-2.5 text-[13.5px] leading-snug', f.included ? 'text-foreground/85' : 'text-muted-foreground/50')}
              >
                {f.included ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-lime" strokeWidth={2.5} />
                ) : (
                  <Minus className="mt-0.5 size-4 shrink-0" />
                )}
                {f.text}
              </li>
            ))}
          </ul>
          <Button variant="outline" disabled className="h-10 w-full font-mono">
            you&apos;re here
          </Button>
        </div>

        {/* Pro: a light runs slowly round its border */}
        <div className="relative overflow-hidden rounded-xl p-px">
          <span
            aria-hidden
            className="absolute inset-[-60%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,transparent_220deg,var(--brand-lime)_300deg,var(--brand-cyan)_360deg)]"
          />
          <div className="relative flex h-full flex-col rounded-[11px] bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Pro</p>
              <span className="rounded-md border border-lime/30 bg-lime/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-lime">
                recommended
              </span>
            </div>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span
                key={plan}
                className="font-display text-4xl font-extrabold tracking-tight animate-[fade-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
              >
                {isYearly ? '$6' : '$8'}
              </span>
              {isYearly ? <span className="font-display text-xl text-muted-foreground line-through">$8</span> : null}
              <span className="text-sm text-muted-foreground">/month</span>
            </p>
            <p className="text-desc mt-1 h-5 text-[13px]">
              {isYearly ? (
                <span key="y" className="animate-fade-in">
                  Billed $72 a year · <span className="text-lime">save $24</span>
                </span>
              ) : (
                <span key="m" className="animate-fade-in">
                  For developers who keep everything.
                </span>
              )}
            </p>

            <div className="mt-4 flex items-center justify-between rounded-md border border-lime/20 bg-lime/[0.04] px-3 py-2 font-mono text-[11px] text-muted-foreground">
              your bin
              <span className="flex items-center gap-1.5 text-lime">
                <InfinityIcon className="size-4" /> no limits
              </span>
            </div>

            <ul className="mb-5 mt-4 flex-1 space-y-2 border-t border-border/60 pt-4">
              {PRO_FEATURES.map((text) => (
                <li key={text} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-foreground/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-lime" strokeWidth={2.5} />
                  {text}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleUpgrade(plan)}
              disabled={loading !== null}
              className="h-10 w-full font-mono text-sm"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? (
                <>
                  opening checkout
                  <Loader2 className="size-4 animate-spin text-lime" />
                </>
              ) : (
                <>{isYearly ? 'Go Pro for $72 a year' : 'Go Pro for $8 a month'}</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-center font-mono text-xs text-muted-foreground">
        Prices in USD · payments by Stripe · cancel any time from Settings
      </p>
    </div>
  );
}
