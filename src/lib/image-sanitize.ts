import sharp from 'sharp';
import { FILE_CONSTRAINTS } from '@/lib/r2';

// Uploaded photos are decoded and written out again before they are stored. That does three things:
//
// - strips metadata: a phone photo carries GPS coordinates, the device model and a timestamp, and
//   those would otherwise be stored (and downloadable) with the image;
// - proves the bytes really are an image of that type, not a file with a PNG header and something
//   else behind it, because anything that doesn't decode is refused;
// - bounds the work: sharp refuses an image with more than 50 million pixels (a decompression bomb).
//
// GIF and SVG are left as they are: an SVG is checked for script elsewhere (validateFileContent),
// and re-encoding an animated GIF would flatten it.

const MAX_PIXELS = 50_000_000;
const REENCODED = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export type SanitizeResult = { ok: true; buffer: Buffer } | { ok: false; error: string };

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

export async function sanitizeImage(buffer: Buffer, fileName: string): Promise<SanitizeResult> {
  const ext = extensionOf(fileName);
  if (!REENCODED.has(ext)) return { ok: true, buffer };

  try {
    // rotate() applies the EXIF orientation first, so dropping the metadata can't turn a photo sideways
    const image = sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).rotate();

    let output: Buffer;
    if (ext === '.png') output = await image.png().toBuffer();
    else if (ext === '.webp') output = await image.webp({ quality: 90 }).toBuffer();
    else output = await image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();

    if (output.length > FILE_CONSTRAINTS.image.maxSize) {
      return { ok: false, error: 'Image is too large after processing. Try a smaller one.' };
    }
    return { ok: true, buffer: output };
  } catch {
    return { ok: false, error: 'Could not read this image. It may be damaged or not a real image file.' };
  }
}
