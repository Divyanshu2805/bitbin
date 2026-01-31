import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePasswordResetToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

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
