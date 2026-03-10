import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

/**
 * Written to checkout session metadata so the webhook can tell BitBin's
 * checkouts apart from other apps that share the same Stripe account.
 */
export const STRIPE_APP_TAG = 'bitbin'
