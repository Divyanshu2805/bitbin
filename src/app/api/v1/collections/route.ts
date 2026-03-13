import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { getUserCollections } from '@/lib/db/collections'

/**
 * The caller's collections (id and name), for the extension's picker.
 */
export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request)
    if (response) return response

    const collections = await getUserCollections(user.id)

    return NextResponse.json({ data: collections })
  } catch (error) {
    console.error('API collections error:', error)
    return apiError('An error occurred while loading collections', 500)
  }
}
