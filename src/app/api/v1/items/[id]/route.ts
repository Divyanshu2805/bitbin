import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { toApiItem } from '@/lib/api-item'
import { getItemById } from '@/lib/db/items'

/**
 * One item in full, for a script or an assistant that found it with `GET /api/v1/items`.
 * Someone else's item is reported as not found, like one that doesn't exist.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await authenticateApiRequest(request, 'items:read')
    if (response) return response

    const { id } = await params
    const item = id ? await getItemById(user.id, id) : null
    if (!item) return apiError('Item not found', 404)

    return NextResponse.json({ data: toApiItem(item) })
  } catch (error) {
    console.error('API get item error:', error)
    return apiError('An error occurred while loading the item', 500)
  }
}
