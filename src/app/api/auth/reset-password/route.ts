import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getPasswordResetToken, deletePasswordResetToken } from '@/lib/tokens'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Check rate limit (5 attempts per 15 min by IP)
    const rateLimit = await checkRateLimit('resetPassword')
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter)
    }

    const body = await request.json()
    const { token, password, confirmPassword } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      )
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Password and confirm password are required' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Get and validate the token
    const resetToken = await getPasswordResetToken(token)

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (new Date() > resetToken.expires) {
      await deletePasswordResetToken(token)
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // Delete the used token
    await deletePasswordResetToken(token)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    )
  }
}
