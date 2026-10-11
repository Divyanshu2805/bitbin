// Uploading something larger than one request can carry. The host refuses request bodies over about
// 4.5 MB before any code runs, so a bigger file is sent as numbered parts of at most UPLOAD_PART_BYTES
// (PUT /api/upload/part from the app, PUT /api/v1/files/part from the desktop app), stored for a moment
// under the user's own folder, and then named by the request that puts them together and checks them:
// POST /api/upload, POST /api/v1/files or POST /api/import. Safe to import in the browser.

/** The largest part: 4 MiB, under the host's limit. A file this size or smaller goes in one request. */
export const UPLOAD_PART_BYTES = 4 * 1024 * 1024;

/** Enough parts for the largest upload: a 20 MB ZIP import (a file or image is at most 10 MB). */
export const MAX_UPLOAD_PARTS = 5;

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
