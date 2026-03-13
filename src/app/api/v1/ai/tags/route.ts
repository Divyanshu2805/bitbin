import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { suggestTagsForUser } from '@/lib/ai-tags'

/**
 * AI tag suggestions for the extension's popup. Shares its prompt, parsing
 * and the `ai` rate limit with the `generateAutoTags` server action.
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request)
    if (response) return response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError('Request body must be JSON', 400)
    }

    const result = await suggestTagsForUser(user.id, body)

    if (!result.success || !result.data) {
      const error = result.error ?? 'Failed to generate tags'
      if (error === 'Validation failed') return apiError(error, 400)
      if (error.startsWith('Too many')) return apiError(error, 429)
      return apiError(error, 502)
    }

    return NextResponse.json({ data: { tags: result.data } })
  } catch (error) {
    console.error('API AI tags error:', error)
    return apiError('An error occurred while generating tags', 500)
  }
}
