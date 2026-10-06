import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const GENERIC_MESSAGE =
  'If an unverified account exists with this email, a verification link has been sent.'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (typeof email !== 'string' || !email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check rate limit (3 attempts per 15 min by IP + email)
    const rateLimit = await checkRateLimit('resendVerification', email)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter)
    }

    // And at most 3 an hour per address whatever the IP
    const emailLimit = await checkRateLimit('resendVerificationEmail', email.trim().toLowerCase(), { ignoreIp: true })
    if (!emailLimit.success) {
      return rateLimitResponse(emailLimit.retryAfter)
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: GENERIC_MESSAGE,
      })
    }

    // Verified accounts get the generic answer too, so the response never says whether an address is registered
    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
    }

    // Generate new token and send email
    const token = await generateVerificationToken(email)
    await sendVerificationEmail(email, token)

    return NextResponse.json({
      success: true,
      message: GENERIC_MESSAGE,
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred while sending the verification email' },
      { status: 500 }
    )
  }
}
