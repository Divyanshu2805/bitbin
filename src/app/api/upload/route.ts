import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ingestFile } from '@/lib/file-ingest';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getUserPlan } from '@/lib/db/billing';
import { rejectCrossSite } from '@/lib/same-origin';

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
    const file = formData.get('file') as File | null;
    const itemType = formData.get('itemType') as 'file' | 'image' | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!itemType || !['file', 'image'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid item type. Must be "file" or "image"' },
        { status: 400 }
      );
    }

    // Size, type, content, image re-encoding, malware lookup and the upload itself
    const result = await ingestFile({
      userId: session.user.id,
      itemType,
      fileName: file.name,
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    });
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
