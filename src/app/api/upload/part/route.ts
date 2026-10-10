import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getUserPlan } from '@/lib/db/billing';
import { rejectCrossSite } from '@/lib/same-origin';
import { putR2Object } from '@/lib/r2';
import { MAX_UPLOAD_PARTS, UPLOAD_PART_BYTES, isUploadId, uploadPartKey } from '@/lib/upload-parts';

/**
 * Store one part of a file too large for a single request (`?uploadId=<uuid>&index=<n>`, the raw
 * bytes as the body). Parts are only held for POST /api/upload to put together; nothing is checked
 * as a file until then, and the weekly sweep removes parts that were never used.
 */
export async function PUT(request: Request) {
  try {
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserPlan(session.user.id);
    if (!user?.isPro) {
      return NextResponse.json({ error: 'File uploads require a Pro subscription' }, { status: 403 });
    }

    const params = new URL(request.url).searchParams;
    const uploadId = params.get('uploadId');
    const index = Number(params.get('index'));
    if (!isUploadId(uploadId) || !Number.isInteger(index) || index < 0 || index >= MAX_UPLOAD_PARTS) {
      return NextResponse.json({ error: 'Invalid upload part' }, { status: 400 });
    }

    // Refuse an oversized part before reading it
    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > UPLOAD_PART_BYTES) {
      return NextResponse.json({ error: 'Upload part too large' }, { status: 413 });
    }

    const rateLimit = await checkRateLimit('uploadPart', session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0 || bytes.length > UPLOAD_PART_BYTES) {
      return NextResponse.json({ error: 'Invalid upload part' }, { status: 400 });
    }

    await putR2Object(uploadPartKey(session.user.id, uploadId, index), bytes, 'application/octet-stream');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload part error:', error);
    return NextResponse.json({ error: 'An error occurred during upload' }, { status: 500 });
  }
}
