import { NextResponse } from 'next/server'
import { findUserByEmail } from '@/lib/db/accounts'
import { generatePasswordResetToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import { isTurnstileEnabled, verifyTurnstile } from '@/lib/turnstile'
import { isDemoEmail } from '@/lib/demo'

export async function POST(request: Request) {
  try {
    // Check rate limit (3 attempts per hour by IP)
    const rateLimit = await checkRateLimit('forgotPassword')
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter)
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Bot check, when Turnstile is configured
    if (isTurnstileEnabled()) {
      const verdict = await verifyTurnstile(body?.turnstileToken, await getClientIP())
      if (!verdict.ok) {
        return NextResponse.json({ error: verdict.message }, { status: 400 })
      }
    }

    // At most 3 reset mails an hour to one address, from any number of IPs
    if (typeof email === 'string') {
      const emailLimit = await checkRateLimit('forgotPasswordEmail', email.trim().toLowerCase(), { ignoreIp: true })
      if (!emailLimit.success) {
        return rateLimitResponse(emailLimit.retryAfter)
      }
    }

    // The demo account's password can't be reset (and it has no mailbox); answer as for any other address
    if (typeof email === 'string' && isDemoEmail(email)) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Find user by email
    const user = await findUserByEmail(email)

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Only allow password reset for users with passwords (not OAuth-only users)
    if (!user.password) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Generate token and send email
    const token = await generatePasswordResetToken(email)
    await sendPasswordResetEmail(email, token)

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}
