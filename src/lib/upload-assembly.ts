import { deleteR2Keys, getFromR2, putR2Object } from '@/lib/r2';
import { MAX_UPLOAD_PARTS, UPLOAD_PART_BYTES, isUploadId, uploadPartKey } from '@/lib/upload-parts';

// The server side of uploads sent in parts (lib/upload-parts.ts): storing a part, and reading an
// upload's parts back as one buffer. Shared by the web uploader (/api/upload), the token API
// (/api/v1/files) and the ZIP import (/api/import), so every large upload follows the same rules.

export type PartResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Store one part (`?uploadId=<uuid>&index=<n>`, the raw bytes as the body) under the user's own
 * folder. The caller has already authenticated the user and checked the plan and rate limit.
 */
export async function storeUploadPart(userId: string, request: Request): Promise<PartResult> {
  const params = new URL(request.url).searchParams;
  const uploadId = params.get('uploadId');
  const index = Number(params.get('index'));
  if (!isUploadId(uploadId) || !Number.isInteger(index) || index < 0 || index >= MAX_UPLOAD_PARTS) {
    return { ok: false, status: 400, error: 'Invalid upload part' };
  }

  // Refuse an oversized part before reading it
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > UPLOAD_PART_BYTES) {
    return { ok: false, status: 413, error: 'Upload part too large' };
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > UPLOAD_PART_BYTES) {
    return { ok: false, status: 400, error: 'Invalid upload part' };
  }

  await putR2Object(uploadPartKey(userId, uploadId, index), bytes, 'application/octet-stream');
  return { ok: true };
}

/** Whether a form names an upload sent in parts, and how many: `{ uploadId, partCount }` or null. */
export function readPartFields(form: FormData): { uploadId: string; partCount: number } | null {
  const uploadId = form.get('uploadId');
  const partCount = Number(form.get('partCount'));
  if (!isUploadId(uploadId) || !Number.isInteger(partCount) || partCount < 1 || partCount > MAX_UPLOAD_PARTS) {
    return null;
  }
  return { uploadId, partCount };
}

/** The keys an upload's parts are stored under. */
export function uploadPartKeys(userId: string, uploadId: string, partCount: number): string[] {
  return Array.from({ length: partCount }, (_, index) => uploadPartKey(userId, uploadId, index));
}

export type Assembled = { ok: true; bytes: Buffer } | { ok: false; error: string };

/** Read an upload's parts back from storage, in order, and join them. Nothing over `maxSize` is held. */
export async function readUploadParts(
  userId: string,
  uploadId: string,
  partCount: number,
  maxSize: number
): Promise<Assembled> {
  const parts: Uint8Array[] = [];
  let total = 0;
  for (const key of uploadPartKeys(userId, uploadId, partCount)) {
    const part = await getFromR2(key);
    if (!part) return { ok: false, error: 'The upload is incomplete. Please try again.' };
    total += part.body.length;
    if (total > maxSize) return { ok: false, error: `File size exceeds ${maxSize / (1024 * 1024)} MB limit` };
    parts.push(part.body);
  }
  return { ok: true, bytes: Buffer.concat(parts) };
}

/** Delete an upload's parts, best effort: the weekly sweep removes any this misses. */
export async function deleteUploadParts(userId: string, uploadId: string, partCount: number): Promise<void> {
  await deleteR2Keys(uploadPartKeys(userId, uploadId, partCount)).catch((error) =>
    console.error('Upload part cleanup failed:', error)
  );
}
