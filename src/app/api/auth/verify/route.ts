import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerificationToken, deleteVerificationToken } from '@/lib/tokens'

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

    const verificationToken = await getVerificationToken(token)

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (new Date() > verificationToken.expires) {
      await deleteVerificationToken(token)
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      await deleteVerificationToken(token)
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      })
    }

    // Update user's emailVerified timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })

    // Delete the used token
    await deleteVerificationToken(token)

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
