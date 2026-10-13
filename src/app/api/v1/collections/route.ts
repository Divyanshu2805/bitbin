import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { getUserCollections } from '@/lib/db/collections'
import { COLLECTION_LIMIT_MESSAGE, createCollectionForUser, createCollectionSchema } from '@/lib/collection-create'
import { parseZodErrors } from '@/lib/validation'

/**
 * The caller's collections (id and name), for the extension's picker.
 */
export async function GET(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request, 'collections:read')
    if (response) return response

    const collections = await getUserCollections(user.id)

    return NextResponse.json({ data: collections })
  } catch (error) {
    console.error('API collections error:', error)
    return apiError('An error occurred while loading collections', 500)
  }
}

/**
 * Create a collection, so the extension and the desktop app can file a save into a new one.
 * Takes `items:write` (it is part of saving), so existing tokens keep working. Validation and
 * the plan check are shared with the `createCollection` server action.
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request, 'items:write')
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

    const parsed = createCollectionSchema.safeParse({ name: (body as Record<string, unknown>).name })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) },
        { status: 400 }
      )
    }

    const result = await createCollectionForUser(user.id, user.isPro, parsed.data)
    if (!result.success) return apiError(result.error, result.error === COLLECTION_LIMIT_MESSAGE ? 403 : 500)

    return NextResponse.json({ data: { id: result.data.id, name: result.data.name } }, { status: 201 })
  } catch (error) {
    console.error('API create collection error:', error)
    return apiError('An error occurred while creating the collection', 500)
  }
}
