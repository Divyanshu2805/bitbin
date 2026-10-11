import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getUserPlan } from '@/lib/db/billing';
import { rejectCrossSite } from '@/lib/same-origin';
import { storeUploadPart } from '@/lib/upload-assembly';

/**
 * Store one part of a file or ZIP too large for a single request (`?uploadId=<uuid>&index=<n>`, the
 * raw bytes as the body). Parts are only held for POST /api/upload or POST /api/import to put
 * together; nothing is checked as a file until then, and the weekly sweep removes unused parts.
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

    const rateLimit = await checkRateLimit('uploadPart', session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const stored = await storeUploadPart(session.user.id, request);
    if (!stored.ok) {
      return NextResponse.json({ error: stored.error }, { status: stored.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload part error:', error);
    return NextResponse.json({ error: 'An error occurred during upload' }, { status: 500 });
  }
}
