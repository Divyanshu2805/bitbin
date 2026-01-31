import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Pre-login rate limit check endpoint.
 * Called by the sign-in form before attempting credentials login.
 * This consumes a rate limit slot to prevent brute force attacks.
 */
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

    // Check rate limit (5 attempts per 15 min by IP + email)
    const rateLimit = await checkRateLimit('login', email)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter)
    }

    return NextResponse.json({
      success: true,
      remaining: rateLimit.remaining,
    })
  } catch (error) {
    console.error('Login rate limit check error:', error)
    // Fail open - allow the login attempt if rate limit check fails
    return NextResponse.json({ success: true })
  }
}
