import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { describeItemForUser } from '@/lib/ai-description'

/**
 * An AI-written description for the extension's popup. Shares its prompt,
 * parsing and the `ai` rate limit with the `generateDescription` server action.
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request, 'ai')
    if (response) return response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError('Request body must be JSON', 400)
    }

    const result = await describeItemForUser(user.id, body)

    if (!result.success || !result.data) {
      const error = result.error ?? 'Failed to generate a description'
      if (error === 'Validation failed') return apiError(error, 400)
      if (error.startsWith('Too many')) return apiError(error, 429)
      return apiError(error, 502)
    }

    return NextResponse.json({ data: { description: result.data } })
  } catch (error) {
    console.error('API AI description error:', error)
    return apiError('An error occurred while generating a description', 500)
  }
}
