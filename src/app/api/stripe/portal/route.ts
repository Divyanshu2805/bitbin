import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { rejectCrossSite } from '@/lib/same-origin'

export async function POST(request?: Request) {
  try {
    // A second line of defence behind SameSite=Lax: refuse requests a browser says are cross-site
    const crossSite = request ? rejectCrossSite(request) : null
    if (crossSite) return crossSite

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 20 portal sessions an hour per user
    const rateLimit = await checkRateLimit('portal', session.user.id)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
