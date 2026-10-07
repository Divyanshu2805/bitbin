import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { safeFileName } from '@/lib/export-files';
import { buildExportZip } from '@/lib/export-zip';
import { getCollectionExportData, getUserExportData } from '@/lib/db/export';

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/** A collection's name as part of a download name: plain ASCII, so the header is always valid. */
function asciiSlug(name: string): string {
  return safeFileName(name).replace(/[^\x20-\x7e]/g, '-').replace(/\s+/g, '-').slice(0, 40);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get('format') || 'json';
  const collectionId = request.nextUrl.searchParams.get('collection');

  if (format !== 'json' && format !== 'zip') {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  if (collectionId !== null && (collectionId.length === 0 || collectionId.length > 100)) {
    return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
  }

  // ZIP export is Pro-only
  if (format === 'zip' && !(session.user.isPro ?? false)) {
    return NextResponse.json(
      { error: 'ZIP export requires a Pro subscription' },
      { status: 403 }
    );
  }

  // 10 exports an hour per user: a ZIP reads every file from storage
  const rateLimit = await checkRateLimit('export', session.user.id);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  // The whole library, or one collection and its items (another user's collection is "not found")
  const data = collectionId
    ? await getCollectionExportData(session.user.id, collectionId)
    : await getUserExportData(session.user.id);
  if (!data) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  const label = collectionId ? `bitbin-collection-${asciiSlug(data.collections[0]?.name ?? 'export')}` : 'bitbin-export';
  const baseName = `${label}-${getDateString()}`;

  if (format === 'json') {
    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${baseName}.json"`,
      },
    });
  }

  // ZIP format: JSON manifest + text items as files + the stored files from R2
  const zipBytes = await buildExportZip(session.user.id, data);

  return new Response(zipBytes.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${baseName}.zip"`,
    },
  });
}
