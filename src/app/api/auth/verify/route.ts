import { NextResponse } from 'next/server'
import { findUserByEmail, markEmailVerified } from '@/lib/db/accounts'
import { consumeVerificationToken } from '@/lib/tokens'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Missing verification token' },
        { status: 400 }
      )
    }

    // Use the link up first: it works once
    const verified = await consumeVerificationToken(token)

    if (!verified) {
      return NextResponse.json(
        { error: 'This verification link is invalid, expired or already used' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await findUserByEmail(verified.email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      })
    }

    // Update user's emailVerified timestamp
    await markEmailVerified(user.id)

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}
