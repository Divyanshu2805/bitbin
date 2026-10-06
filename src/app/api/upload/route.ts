import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { contentTypeForFile, uploadToR2, validateFile, validateFileContent } from '@/lib/r2';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { rejectCrossSite } from '@/lib/same-origin';
import { sanitizeImage } from '@/lib/image-sanitize';
import { checkKnownMalware } from '@/lib/virus-check';

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
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPro: true },
    });

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

    // Validate file
    const validation = validateFile(
      { name: file.name, size: file.size, type: file.type },
      itemType
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // The bytes must match the extension; the stored type comes from the extension, not the client
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentCheck = validateFileContent(buffer, file.name);
    if (!contentCheck.valid) {
      return NextResponse.json({ error: contentCheck.error }, { status: 400 });
    }

    // Photos are written out again: metadata (GPS, device) is stripped and anything that isn't a
    // real image is refused. Other types pass through unchanged.
    const sanitized = await sanitizeImage(buffer, file.name);
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }
    const bytes = sanitized.buffer;

    // Optional: refuse a file whose hash VirusTotal knows as malware (off without VIRUSTOTAL_API_KEY)
    const scan = await checkKnownMalware(bytes);
    if (!scan.safe) {
      return NextResponse.json({ error: scan.reason }, { status: 400 });
    }

    const { fileUrl } = await uploadToR2(
      bytes,
      file.name,
      contentTypeForFile(file.name),
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        fileName: file.name,
        fileSize: bytes.length,
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
