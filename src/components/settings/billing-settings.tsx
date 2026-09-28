'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Panel from '@/components/shared/panel';
import UsageMeter from '@/components/shared/usage-meter';
import { MAX_COLLECTIONS, MAX_ITEMS } from '@/lib/constants/plan';
import { CreditCard, Loader2, Sparkles, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { startCheckout } from '@/lib/stripe-client';

interface BillingSettingsProps {
  isPro: boolean;
  itemCount: number;
  collectionCount: number;
}

export default function BillingSettings({ isPro, itemCount, collectionCount }: BillingSettingsProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null);

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast.success('Welcome to BitBin Pro!');
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

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

  async function handleManageBilling() {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Panel
      id="billing"
      icon={<CreditCard />}
      title="Billing"
      description="Your plan, and your subscription if you have one."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          {isPro ? (
            <span className="rounded-md border border-lime/35 bg-lime/10 px-2 py-0.5 font-mono text-xs text-lime">● pro</span>
          ) : (
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">free</span>
          )}
          <p className="text-desc text-sm">
            {isPro
              ? 'Unlimited items and collections, files, AI and the extension.'
              : 'Upgrade when your bin gets full. Cancel whenever you like.'}
          </p>
        </div>

        {!isPro && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <UsageMeter label="items" used={itemCount} limit={MAX_ITEMS} />
              <UsageMeter label="collections" used={collectionCount} limit={MAX_COLLECTIONS} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleUpgrade('monthly')} disabled={loading !== null}>
                {loading !== 'monthly' && <Sparkles className="h-4 w-4" />}
                {loading === 'monthly' && <Loader2 className="h-4 w-4 animate-spin" />}
                Go Pro · $8/mo
              </Button>
              <Button variant="outline" onClick={() => handleUpgrade('yearly')} disabled={loading !== null}>
                {loading === 'yearly' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                $72/yr
                <span className="rounded bg-lime/15 px-1.5 font-mono text-[10.5px] font-bold text-lime">-25%</span>
              </Button>
            </div>
          </>
        )}

        {isPro && (
          <Button variant="outline" onClick={handleManageBilling} disabled={loading !== null}>
            {loading === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Manage billing
          </Button>
        )}
      </div>
    </Panel>
  );
}
