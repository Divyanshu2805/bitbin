import {
  contentTypeForFile,
  uploadToR2,
  validateFile,
  validateFileContent,
} from '@/lib/r2';
import { sanitizeImage } from '@/lib/image-sanitize';
import { checkKnownMalware } from '@/lib/virus-check';

export type IngestResult =
  | { ok: true; fileUrl: string; fileName: string; fileSize: number }
  | { ok: false; error: string };

interface IngestInput {
  userId: string;
  itemType: 'file' | 'image';
  fileName: string;
  bytes: Buffer;
  /** The type the sender claimed; checked against the allowed list, never stored. Defaults to the one the extension implies. */
  mimeType?: string;
}

/**
 * Every check a stored file passes, in one place: size, extension and MIME type, the bytes
 * matching the extension, images re-encoded (metadata stripped), the optional malware lookup,
 * and then the upload under the user's own folder. Uploads, ZIP imports and the token API all
 * go through it so a new way to add a file can't skip a check.
 */
export async function ingestFile({ userId, itemType, fileName, bytes, mimeType }: IngestInput): Promise<IngestResult> {
  const validation = validateFile(
    { name: fileName, size: bytes.length, type: mimeType ?? contentTypeForFile(fileName) },
    itemType
  );
  if (!validation.valid) return { ok: false, error: validation.error ?? 'Invalid file' };

  // The bytes must match the extension; the stored type comes from the extension, not the sender
  const contentCheck = validateFileContent(bytes, fileName);
  if (!contentCheck.valid) return { ok: false, error: contentCheck.error ?? 'Invalid file' };

  // Photos are written out again: metadata (GPS, device) is stripped and anything that isn't a
  // real image is refused. Other types pass through unchanged.
  const sanitized = await sanitizeImage(bytes, fileName);
  if (!sanitized.ok) return { ok: false, error: sanitized.error };

  // Optional: refuse a file whose hash VirusTotal knows as malware (off without VIRUSTOTAL_API_KEY)
  const scan = await checkKnownMalware(sanitized.buffer);
  if (!scan.safe) return { ok: false, error: scan.reason };

  const { fileUrl } = await uploadToR2(sanitized.buffer, fileName, contentTypeForFile(fileName), userId);
  return { ok: true, fileUrl, fileName, fileSize: sanitized.buffer.length };
}
