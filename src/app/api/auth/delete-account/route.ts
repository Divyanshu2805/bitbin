import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { deleteUserFilesFromR2 } from '@/lib/r2'
import { demoBlockedMessage, isDemoEmail } from '@/lib/demo'
import { rejectCrossSite } from '@/lib/same-origin'

export async function DELETE(request: Request) {
  try {
    // A second line of defence behind SameSite=Lax: refuse requests a browser says are cross-site
    const crossSite = rejectCrossSite(request)
    if (crossSite) return crossSite

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Deleting the shared demo account would end the demo for everyone
    if (isDemoEmail(session.user.email)) {
      return NextResponse.json({ error: demoBlockedMessage('be deleted') }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, stripeSubscriptionId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // A password account must prove it knows the password; a stolen session alone can't delete it
    if (user.password) {
      const body = await request.json().catch(() => ({}))
      const password = typeof body?.password === 'string' ? body.password : ''
      if (!password || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json(
          { error: 'Password is incorrect' },
          { status: 400 }
        )
      }
    }

    // Stop billing first: if this fails the account stays, so nobody is charged for a deleted user
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId)
      } catch (error) {
        const code = (error as { code?: string }).code
        if (code !== 'resource_missing') {
          console.error('Delete account: failed to cancel subscription:', error)
          return NextResponse.json(
            { error: 'Could not cancel your subscription. Please try again or contact support.' },
            { status: 500 }
          )
        }
      }
    }

    // Best effort: an R2 failure shouldn't block deletion, but it is logged
    try {
      await deleteUserFilesFromR2(session.user.id)
    } catch (error) {
      console.error('Delete account: failed to delete files from R2:', error)
    }

    // Delete the user - cascade will handle related data
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'An error occurred while deleting your account' },
      { status: 500 }
    )
  }
}
