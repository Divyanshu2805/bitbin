import { NextResponse } from 'next/server'
import { stripe, STRIPE_APP_TAG } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import type Stripe from 'stripe'

type CustomerRef = string | { id: string } | null | undefined

function customerIdOf(customer: CustomerRef): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing'])

/**
 * Sets a customer's plan from their subscriptions as Stripe has them right
 * now, not from the event that woke us. Events can arrive twice or out of
 * order (a late invoice.paid after a cancellation); reading the current state
 * makes every handler idempotent and order-independent.
 */
async function syncPlanFromStripe(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 20,
  })
  const active = subscriptions.data.find((sub) => ACTIVE_STATUSES.has(sub.status))

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      isPro: Boolean(active),
      stripeSubscriptionId: active?.id ?? null,
    },
  })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // The Stripe account may be shared with other apps. Their checkouts reach
  // this endpoint too; skip them instead of failing, or Stripe keeps retrying
  // and may eventually disable the endpoint.
  if (session.metadata?.app !== STRIPE_APP_TAG) {
    return
  }

  const userId = session.metadata?.userId
  if (!userId) {
    console.warn('checkout.session.completed: missing metadata.userId')
    return
  }

  const customerId = customerIdOf(session.customer)
  if (!customerId) {
    console.warn('checkout.session.completed: missing customer')
    return
  }

  // updateMany: the user may have deleted their account between paying and
  // this event, and a thrown error would make Stripe retry for days
  await prisma.user.updateMany({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  })
  await syncPlanFromStripe(customerId)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = customerIdOf(invoice.customer)
  if (customerId) await syncPlanFromStripe(customerId)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.warn(
    `invoice.payment_failed for customer ${customerIdOf(invoice.customer) ?? 'unknown'}`
  )
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  const customerId = customerIdOf(subscription.customer)
  if (customerId) await syncPlanFromStripe(customerId)
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription
        )
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription
        )
        break
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
