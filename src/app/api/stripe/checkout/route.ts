import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { stripe, STRIPE_APP_TAG } from '@/lib/stripe'
import { demoBlockedMessage, isDemoEmail } from '@/lib/demo'
import { prisma } from '@/lib/prisma'
import { rejectCrossSite } from '@/lib/same-origin'

const PRICE_MAP: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
}

export async function POST(request: Request) {
  try {
    // A second line of defence behind SameSite=Lax: refuse requests a browser says are cross-site
    const crossSite = rejectCrossSite(request)
    if (crossSite) return crossSite

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // A shared account can't hold a subscription
    if (isDemoEmail(session.user.email)) {
      return NextResponse.json({ error: demoBlockedMessage('be upgraded') }, { status: 403 })
    }

    // 10 checkouts an hour per user: each one creates a Stripe session
    const rateLimit = await checkRateLimit('checkout', session.user.id)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter)
    }

    const body = await request.json()
    const { plan } = body as { plan?: string }

    if (!plan || !PRICE_MAP[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    const priceId = PRICE_MAP[plan]!

    // Find or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true, isPro: true },
    })

    // A second subscription would bill them twice; point them at the portal instead
    if (user?.isPro) {
      return NextResponse.json(
        { error: 'You already have a Pro subscription. Manage it from Settings.' },
        { status: 409 }
      )
    }

    let customerId = user?.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { userId: session.user.id },
      })
      customerId = customer.id

      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?upgraded=true`,
      cancel_url: `${appUrl}/settings`,
      metadata: { userId: session.user.id, app: STRIPE_APP_TAG },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
