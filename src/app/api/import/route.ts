import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { rejectCrossSite } from '@/lib/same-origin';
import { demoBlockedMessage, isDemoEmail } from '@/lib/demo';
import { importLibrary } from '@/lib/db/import';
import {
  buildImportPreview,
  INVALID_IMPORT_FORMAT,
  parseImportData,
} from '@/lib/import-schema';
import { MAX_IMPORT_ZIP_BYTES, looksLikeZip, readImportZip } from '@/lib/zip-import';
import { restoreZipFiles } from '@/lib/zip-restore';
import { deleteFromR2 } from '@/lib/r2';

// Room for the form fields around the ZIP itself
const FORM_OVERHEAD_BYTES = 64 * 1024;

const tooLarge = () =>
  NextResponse.json(
    { error: `ZIP files up to ${MAX_IMPORT_ZIP_BYTES / (1024 * 1024)} MB can be imported. Import the JSON file instead, or split the export.` },
    { status: 413 }
  );

/**
 * Import from an export ZIP: the manifest plus the files and images inside it. `mode=preview` reads
 * the ZIP and reports what it holds; `mode=import` writes it. A ZIP is bytes, which a server action
 * can't carry, so this is a route handler. Pro only, like ZIP export, because it restores files.
 */
export async function POST(request: Request) {
  try {
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The sandbox account can't import anything: what it saves is shown to the next visitor
    if (isDemoEmail(session.user.email)) {
      return NextResponse.json({ error: demoBlockedMessage('import data') }, { status: 403 });
    }

    if (!(session.user.isPro ?? false)) {
      return NextResponse.json({ error: 'ZIP import requires a Pro subscription' }, { status: 403 });
    }

    // Refuse an oversized body before reading it
    const declared = Number(request.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_IMPORT_ZIP_BYTES + FORM_OVERHEAD_BYTES) {
      return tooLarge();
    }

    const form = await request.formData();
    const mode = form.get('mode');
    if (mode !== 'preview' && mode !== 'import') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(mode === 'preview' ? 'importPreview' : 'import', session.user.id);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_IMPORT_ZIP_BYTES) return tooLarge();

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikeZip(bytes)) {
      return NextResponse.json({ error: 'This is not a ZIP file' }, { status: 400 });
    }

    const zip = readImportZip(bytes);
    if (!zip.ok) {
      return NextResponse.json({ error: zip.error }, { status: 400 });
    }

    const parsed = parseImportData(zip.manifest);
    if (!parsed.ok) {
      return NextResponse.json({ error: INVALID_IMPORT_FORMAT }, { status: 400 });
    }

    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        data: { ...buildImportPreview(parsed.data), fileCount: zip.files.size },
      });
    }

    const skipDuplicates = form.get('skipDuplicates') !== 'false';

    // Files first (each one passes the upload checks), then the library write
    const restored = await restoreZipFiles(session.user.id, parsed.data, zip.files, skipDuplicates);
    try {
      const result = await importLibrary(session.user.id, true, restored.data, skipDuplicates);
      return NextResponse.json({
        success: true,
        data: { ...result, itemsSkipped: result.itemsSkipped + restored.dropped },
        warning: restored.firstError,
      });
    } catch (error) {
      // The import rolled back: don't leave the files it was going to point at
      await Promise.allSettled(restored.uploadedUrls.map((url) => deleteFromR2(url)));
      throw error;
    }
  } catch (error) {
    console.error('ZIP import error:', error);
    return NextResponse.json({ error: 'An error occurred during the import' }, { status: 500 });
  }
}
