import { toast } from 'sonner';

/**
 * Initiates a Stripe checkout session and redirects to the checkout page.
 */
export async function startCheckout(plan: 'monthly' | 'yearly'): Promise<void> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();

  if (!res.ok) {
    toast.error(data.error || 'Failed to start checkout');
    return;
  }

  window.location.href = data.url;
}
