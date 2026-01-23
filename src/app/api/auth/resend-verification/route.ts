import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      })
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified. You can sign in.',
      })
    }

    // Generate new token and send email
    const token = await generateVerificationToken(email)
    await sendVerificationEmail(email, token)

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred while sending the verification email' },
      { status: 500 }
    )
  }
}
