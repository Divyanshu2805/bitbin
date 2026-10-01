import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { contentTypeForFile, getFromR2, isOwnedKey } from '@/lib/r2';

// Image types the app may show inline. The type is chosen from the file
// extension, never from what was stored, and everything is served sandboxed.
const INLINE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

/**
 * The only way to read a stored file: the bucket is private, so every read
 * goes through here, after checking that the object is in the signed-in
 * user's own folder, and is fetched with the server's own credentials.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await params;
    const key = path.join('/');

    // The key must be a plain path under `{userId}/`: no other user's folder, no `..`
    if (!isOwnedKey(session.user.id, key)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const object = await getFromR2(key);

    if (!object) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Copy into a plain ArrayBuffer for the response body
    const data = object.body.slice().buffer as ArrayBuffer;
    const contentType = object.contentType || 'application/octet-stream';

    // Extract filename from path
    const fileName = key.split('/').pop() || 'download';
    // Remove timestamp prefix if present (format: timestamp-filename)
    const cleanFileName = fileName.replace(/^\d+-/, '');

    // `?inline=1`: shown in the item panel's preview instead of downloaded. A PDF
    // keeps its type and an image is shown as an image; everything else goes out
    // as plain text, and nothing may be sniffed or run scripts on our origin (an
    // uploaded .xml, .md or .svg is user content).
    const inline = new URL(request.url).searchParams.get('inline') === '1';
    if (inline) {
      const isPdf = contentType.startsWith('application/pdf');
      const imageType = contentTypeForFile(cleanFileName);
      const isImage = INLINE_IMAGE_TYPES.has(imageType);
      const servedType = isPdf ? 'application/pdf' : isImage ? imageType : 'text/plain; charset=utf-8';
      return new NextResponse(data, {
        headers: {
          'Content-Type': servedType,
          'Content-Disposition': `inline; filename="${cleanFileName}"`,
          'X-Content-Type-Options': 'nosniff',
          ...(isPdf ? {} : { 'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'" }),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'An error occurred during download' },
      { status: 500 }
    );
  }
}
