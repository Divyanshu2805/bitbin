// Uploading a file larger than one request can carry. The host refuses request bodies over about
// 4.5 MB before any code runs, so the web uploader sends a bigger file as numbered parts of at most
// UPLOAD_PART_BYTES (PUT /api/upload/part), stored for a moment under the user's own folder, and then
// asks POST /api/upload to put them together and run the usual checks. Safe to import in the browser.

/** The largest part: 4 MiB, under the host's limit. A file this size or smaller goes in one request. */
export const UPLOAD_PART_BYTES = 4 * 1024 * 1024;

/** Enough parts for the largest file the upload rules allow (10 MB). */
export const MAX_UPLOAD_PARTS = 3;

const UPLOAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** An upload id is a UUID the browser makes (`crypto.randomUUID()`). */
export function isUploadId(value: unknown): value is string {
  return typeof value === 'string' && UPLOAD_ID.test(value);
}

/** Where a part waits, inside the user's own folder, until the upload is put together. */
export function uploadPartKey(userId: string, uploadId: string, index: number): string {
  return `${userId}/parts/${uploadId}/${index}`;
}

/** A part's key, as the orphan sweep recognises it. */
export const UPLOAD_PART_KEY = /^[A-Za-z0-9_-]+\/parts\/[0-9a-f-]{36}\/\d+$/;
