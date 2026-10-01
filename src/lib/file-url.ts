/**
 * Helpers for the `fileUrl` stored on file and image items. Safe to import
 * from client components (no storage SDK).
 *
 * The bucket is private: the stored URL only identifies the object. Nothing
 * fetches it directly; every read goes through `/api/download/{key}`, which
 * checks that the key lives in the signed-in user's folder.
 */

/** The object key (`{userId}/{timestamp}-{name}`) inside a stored file URL. */
export function fileKeyFromUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  try {
    const key = decodeURIComponent(new URL(fileUrl).pathname.slice(1));
    return key || null;
  } catch {
    return null;
  }
}

/** Where a signed-in owner downloads the file (`attachment`). */
export function fileDownloadPath(fileUrl: string | null | undefined): string | null {
  const key = fileKeyFromUrl(fileUrl);
  return key ? `/api/download/${key}` : null;
}

/** Where the app shows the file inline: image previews, PDF and text viewers. */
export function fileViewPath(fileUrl: string | null | undefined): string | null {
  const path = fileDownloadPath(fileUrl);
  return path ? `${path}?inline=1` : null;
}
