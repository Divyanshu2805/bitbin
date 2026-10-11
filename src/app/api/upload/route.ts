import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ingestFile } from '@/lib/file-ingest';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getUserPlan } from '@/lib/db/billing';
import { rejectCrossSite } from '@/lib/same-origin';
import { FILE_CONSTRAINTS } from '@/lib/r2';
import { deleteUploadParts, readPartFields, readUploadParts } from '@/lib/upload-assembly';

/**
 * Store a file for a new file or image item. The form carries either the whole `file`, or, for a
 * file larger than one request can hold, the `uploadId` and `partCount` of parts already sent to
 * PUT /api/upload/part, with the file's `fileName` and `mimeType`. Either way the bytes go through
 * every upload check (`ingestFile`) before they are kept.
 */
export async function POST(request: Request) {
  try {
    // A second line of defence behind SameSite=Lax: refuse requests a browser says are cross-site
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Pro status (file uploads require Pro)
    const user = await getUserPlan(session.user.id);

    if (!user?.isPro) {
      return NextResponse.json(
        { error: 'File uploads require a Pro subscription' },
        { status: 403 }
      );
    }

    // Check rate limit (10 uploads per hour per user)
    const rateLimit = await checkRateLimit('upload', session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const itemType = formData.get('itemType');

    if (itemType !== 'file' && itemType !== 'image') {
      return NextResponse.json(
        { error: 'Invalid item type. Must be "file" or "image"' },
        { status: 400 }
      );
    }

    let fileName: string;
    let mimeType: string | undefined;
    let bytes: Buffer;
    const parts = file instanceof File ? null : readPartFields(formData);

    if (file instanceof File) {
      fileName = file.name;
      mimeType = file.type;
      bytes = Buffer.from(await file.arrayBuffer());
    } else {
      const name = formData.get('fileName');
      if (!parts) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
        return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
      }

      const assembled = await readUploadParts(session.user.id, parts.uploadId, parts.partCount, FILE_CONSTRAINTS[itemType].maxSize);
      if (!assembled.ok) {
        await deleteUploadParts(session.user.id, parts.uploadId, parts.partCount);
        return NextResponse.json({ error: assembled.error }, { status: 400 });
      }
      fileName = name;
      const declaredType = formData.get('mimeType');
      mimeType = typeof declaredType === 'string' ? declaredType : undefined;
      bytes = assembled.bytes;
    }

    // Size, type, content, image re-encoding and the upload itself
    const result = await ingestFile({ userId: session.user.id, itemType, fileName, bytes, mimeType });

    // The parts have served their purpose either way
    if (parts) await deleteUploadParts(session.user.id, parts.uploadId, parts.partCount);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred during upload' },
      { status: 500 }
    );
  }
}
