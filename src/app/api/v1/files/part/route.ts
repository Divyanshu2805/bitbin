import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit'
import { storeUploadPart } from '@/lib/upload-assembly'

/**
 * Store one part of a file too large for a single request (`?uploadId=<uuid>&index=<n>`, the raw
 * bytes as the body), for `POST /api/v1/files` to put together. Needs the `files:write` scope. The
 * same parts protocol as the web uploader (lib/upload-parts.ts).
 */
export async function PUT(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request, 'files:write')
    if (response) return response

    const rateLimit = await checkRateLimit('uploadPart', user.id)
    if (!rateLimit.success) {
      return apiError(
        `Too many uploads. Please try again in ${formatRetryTime(rateLimit.retryAfter)}.`,
        429,
        { 'Retry-After': String(rateLimit.retryAfter) }
      )
    }

    const stored = await storeUploadPart(user.id, request)
    if (!stored.ok) return apiError(stored.error, stored.status)
    return NextResponse.json({ data: { stored: true } })
  } catch (error) {
    console.error('API upload part error:', error)
    return apiError('An error occurred while saving the file', 500)
  }
}
