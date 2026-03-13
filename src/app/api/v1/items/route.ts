import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { createItemForUser } from '@/lib/item-create'

/** Item types the token API can create. Files and images need an upload. */
const API_ITEM_TYPES = ['snippet', 'prompt', 'command', 'note', 'link']

/**
 * Create an item from the browser extension. Validation, plan limits and the
 * insert are shared with the `createItem` server action.
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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return apiError('Request body must be a JSON object', 400)
    }

    const input = body as Record<string, unknown>
    if (typeof input.typeName !== 'string' || !API_ITEM_TYPES.includes(input.typeName)) {
      return apiError(`typeName must be one of: ${API_ITEM_TYPES.join(', ')}`, 400)
    }

    // File fields only make sense for uploads, which this endpoint doesn't take
    const result = await createItemForUser(user.id, user.isPro, {
      typeName: input.typeName,
      title: input.title,
      description: input.description,
      content: input.content,
      url: input.url,
      language: input.language,
      tags: input.tags ?? [],
      collectionIds: input.collectionIds,
    })

    if (!result.success || !result.data) {
      if (result.fieldErrors) {
        return NextResponse.json(
          { error: result.error, fieldErrors: result.fieldErrors },
          { status: 400 }
        )
      }
      return apiError(result.error ?? 'Failed to create item', 500)
    }

    const item = result.data
    return NextResponse.json(
      { data: { id: item.id, title: item.title, typeName: item.itemType.name } },
      { status: 201 }
    )
  } catch (error) {
    console.error('API create item error:', error)
    return apiError('An error occurred while saving the item', 500)
  }
}
