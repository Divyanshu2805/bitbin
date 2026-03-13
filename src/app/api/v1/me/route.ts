import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'

/**
 * Token check for the browser extension's options page.
 */
export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request)
    if (response) return response

    return NextResponse.json({
      data: { email: user.email, name: user.name, isPro: user.isPro },
    })
  } catch (error) {
    console.error('API me error:', error)
    return apiError('An error occurred while checking the token', 500)
  }
}
