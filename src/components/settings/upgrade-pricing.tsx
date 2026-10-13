'use client';

import { useState } from 'react';
import { Check, Infinity as InfinityIcon, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { startCheckout } from '@/lib/stripe-client';
import { FREE_FEATURES, PRO_FEATURES } from '@/lib/constants/pricing';
import { MAX_COLLECTIONS, MAX_ITEMS } from '@/lib/constants/plan';
import PageHeader, { TitleAccent } from '@/components/shared/page-header';
import PlanCompare from '@/components/shared/plan-compare';

interface UpgradePricingProps {
  itemCount: number;
  collectionCount: number;
}

/**
 * The in-app upgrade page, drawn like the landing page's pricing section: a
 * sliding billing toggle, Free (with your real usage) next to Pro, whose border
 * has a light running round it, then the same row-by-row comparison.
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
        title={
          <>
            Go <TitleAccent>Pro</TitleAccent>
          </>
        }
        description="Unlimited items, files and images, AI helpers, the browser extension and API tokens."
      >
      </PageHeader>

      {/* Billing: a thumb slides under the chosen option, as on the landing page */}
      <div className="plan-billing !mb-9 !mt-0" data-yearly={isYearly || undefined}>
        <span aria-hidden className="plan-billing-thumb" />
        {[
          { label: 'Monthly', value: false },
          { label: 'Yearly', value: true },
        ].map((opt) => (
          <button key={opt.label} type="button" aria-pressed={isYearly === opt.value} onClick={() => setIsYearly(opt.value)}>
            {opt.label}
            {opt.value ? <span className="plan-badge">-25%</span> : null}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-3xl items-stretch gap-4 stagger md:grid-cols-2">
        {/* Free: plain ink, no colour; your real usage in the meters */}
        <div className="plan-card">
          <p className="plan-kicker flex h-[22px] items-center">Plan 01</p>
          <h3 className="mt-2 font-display text-[25px] font-normal leading-[1.1] tracking-[-0.035em]">Free</h3>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="plan-price">$0</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </p>
          <p className="mt-2 min-h-5 text-sm text-muted-foreground">Where your bin is today.</p>

          <div className="mt-5 space-y-2">
            <PlanMeter label="items" used={itemCount} limit={MAX_ITEMS} />
            <PlanMeter label="collections" used={collectionCount} limit={MAX_COLLECTIONS} />
          </div>

          <PlanList features={FREE_FEATURES} />
          <Button variant="outline" disabled className="h-10 w-full">
            You&apos;re here
          </Button>
        </div>

        {/* Pro: the same card as a solid block of the brand colour */}
        <div data-featured className="plan-card" style={{ '--tone': 'var(--brand-lime)' } as React.CSSProperties}>
          <div className="flex h-[22px] items-center justify-between">
            <p className="plan-kicker">Plan 02</p>
            <span className="plan-badge">Recommended</span>
          </div>
          <h3 className="mt-2 font-display text-[25px] font-normal leading-[1.1] tracking-[-0.035em]">Pro</h3>
          <p className="mt-5 flex items-baseline gap-2">
            <span key={plan} className="plan-price animate-[fade-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]">
              {isYearly ? '$6' : '$8'}
            </span>
            {isYearly ? <span className="text-xl text-faint line-through dark:text-muted-foreground/60">$8</span> : null}
            <span className="text-sm text-muted-foreground">/ month</span>
          </p>
          <p className="mt-2 min-h-5 text-sm text-muted-foreground">
            {isYearly ? (
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

          <PlanList features={PRO_FEATURES} />
          <Button onClick={() => handleUpgrade(plan)} disabled={loading !== null} className="h-10 w-full text-sm">
            <Sparkles className="h-4 w-4" />
            {loading ? (
              <>
                Opening checkout
                <Loader2 className="size-4 animate-spin" />
              </>
            ) : (
              <>{isYearly ? 'Go Pro for $72 a year' : 'Go Pro for $8 a month'}</>
            )}
          </Button>
        </div>
      </div>

      <PlanCompare />

      <p className="text-center font-mono text-xs text-muted-foreground">
        Prices in USD · payments by Stripe · cancel any time from Settings
      </p>
    </div>
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

function PlanMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const ratio = Math.min(1, limit > 0 ? used / limit : 0);
  return (
    <div className="plan-meter">
      <p className="flex items-center justify-between">
        {label}
        <span>
          <span className="text-foreground">{used}</span> / {limit}
        </span>
      </p>
      <span
        className="plan-meter-bar"
        role="meter"
        aria-label={`${label}: ${used} of ${limit}`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
      >
        <span style={{ transform: `scaleX(${ratio})` }} />
      </span>
    </div>
  );
}
