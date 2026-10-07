import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { getPasswordRecord, setPasswordAndRevokeSessions } from '@/lib/db/accounts'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { MAX_PASSWORD_LENGTH } from '@/lib/validation'
import { demoBlockedMessage, isDemoEmail } from '@/lib/demo'
import { rejectCrossSite } from '@/lib/same-origin'

export async function POST(request: Request) {
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

    // The public demo account's password is published; it can't be changed
    if (isDemoEmail(session.user.email)) {
      return NextResponse.json({ error: demoBlockedMessage('change its password') }, { status: 403 })
    }

    // 5 attempts per 15 minutes: the current-password check can't be brute-forced from a stolen session
    const rateLimit = await checkRateLimit('changePassword', session.user.id)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter)
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at most ${MAX_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Get user with password
    const user = await getPasswordRecord(session.user.id)

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Password change is not available for OAuth accounts' },
        { status: 400 }
      )
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Also signs out every session, including this one
    await setPasswordAndRevokeSessions(user.id, hashedPassword)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'An error occurred while changing your password' },
      { status: 500 }
    )
  }
}
