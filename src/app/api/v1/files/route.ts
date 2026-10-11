import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { createItemForUser } from '@/lib/item-create'
import { ingestFile } from '@/lib/file-ingest'
import { FILE_CONSTRAINTS, deleteFromR2 } from '@/lib/r2'
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit'
import { deleteUploadParts, readPartFields, readUploadParts } from '@/lib/upload-assembly'
import { UPLOAD_PART_BYTES } from '@/lib/upload-parts'

// One request carries at most one part's worth (the host refuses more); a bigger file comes in parts
const FORM_OVERHEAD_BYTES = 64 * 1024
const MAX_BODY_BYTES = UPLOAD_PART_BYTES + FORM_OVERHEAD_BYTES

/** The tags field: a comma-separated string, as the desktop app sends it. */
function readTags(value: FormDataEntryValue | null): string[] {
  return typeof value === 'string' ? value.split(',').map((tag) => tag.trim()).filter(Boolean) : []
}

function readText(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Save a file or an image as a new item (multipart form: `file`, `itemType` "file" | "image", and
 * optionally `title`, `description`, `tags`, `collectionId`). A file over 4 MB is sent first to
 * `PUT /api/v1/files/part`, and this form then carries `uploadId`, `partCount` and `fileName`
 * instead of `file`. The bytes go through the same checks as a web upload (`ingestFile`) and the
 * item through the same creation path as `POST /api/v1/items`. Needs the `files:write` scope.
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request, 'files:write')
    if (response) return response

    // 10 uploads an hour per user, the same budget as the web uploader
    const rateLimit = await checkRateLimit('upload', user.id)
    if (!rateLimit.success) {
      return apiError(
        `Too many uploads. Please try again in ${formatRetryTime(rateLimit.retryAfter)}.`,
        429,
        { 'Retry-After': String(rateLimit.retryAfter) }
      )
    }

    // Refuse an oversized body before reading it
    const declared = Number(request.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return apiError('That file is too large', 413)
    }

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return apiError('Request body must be a multipart form', 400)
    }

    const itemType = form.get('itemType')
    if (itemType !== 'file' && itemType !== 'image') {
      return apiError('itemType must be "file" or "image"', 400)
    }

    const file = form.get('file')
    const parts = file instanceof File ? null : readPartFields(form)
    let fileName: string
    let mimeType: string | undefined
    let bytes: Buffer
    if (file instanceof File) {
      fileName = file.name
      mimeType = file.type || undefined
      bytes = Buffer.from(await file.arrayBuffer())
    } else if (parts) {
      const name = form.get('fileName')
      if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
        return apiError('fileName is required for an upload sent in parts', 400)
      }
      const assembled = await readUploadParts(user.id, parts.uploadId, parts.partCount, FILE_CONSTRAINTS[itemType].maxSize)
      await deleteUploadParts(user.id, parts.uploadId, parts.partCount)
      if (!assembled.ok) return apiError(assembled.error, 400)
      fileName = name
      mimeType = undefined
      bytes = assembled.bytes
    } else {
      return apiError('No file provided', 400)
    }

    const stored = await ingestFile({ userId: user.id, itemType, fileName, bytes, mimeType })
    if (!stored.ok) return apiError(stored.error, 400)

    const collectionId = readText(form.get('collectionId'))
    const result = await createItemForUser(user.id, user.isPro, {
      typeName: itemType,
      title: readText(form.get('title')) ?? stored.fileName,
      description: readText(form.get('description')),
      tags: readTags(form.get('tags')),
      collectionIds: collectionId ? [collectionId] : [],
      fileUrl: stored.fileUrl,
      fileName: stored.fileName,
      fileSize: stored.fileSize,
    })

    if (!result.success || !result.data) {
      // Don't leave an object in storage that no item points at
      await deleteFromR2(stored.fileUrl).catch((error) => console.error('API upload cleanup failed:', error))
      if (result.fieldErrors) {
        return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: 400 })
      }
      return apiError(result.error ?? 'Failed to create item', 500)
    }

    const item = result.data
    return NextResponse.json(
      { data: { id: item.id, title: item.title, typeName: item.itemType.name } },
      { status: 201 }
    )
  } catch (error) {
    console.error('API file upload error:', error)
    return apiError('An error occurred while saving the file', 500)
  }
}
