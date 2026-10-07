import { ingestFile } from '@/lib/file-ingest';
import { getItemIdentities } from '@/lib/db/import';
import { isDuplicateItem, type ItemIdentity } from '@/lib/import-utils';
import { ZIP_FILES_FOLDER } from '@/lib/zip-format';
import type { ImportData } from '@/lib/import-schema';

export interface RestoreResult {
  /** The import with every restored file's `fileUrl` pointing at the user's own storage; unrestorable file items are gone */
  data: ImportData;
  /** Storage URLs written by this restore, to delete again if the import itself fails */
  uploadedUrls: string[];
  /** File items left out because their file was missing from the ZIP or refused */
  dropped: number;
  /** Why the first file was refused, if one was */
  firstError: string | null;
}

/**
 * Put the files of an export ZIP back into storage for this user and point the matching items at
 * them. Every file goes through the same checks as an upload (`ingestFile`). Items that the import
 * would skip as duplicates are not restored, so nothing is written for them. A file item whose bytes
 * are missing or refused is dropped from the import instead of arriving as an empty shell.
 */
export async function restoreZipFiles(
  userId: string,
  data: ImportData,
  zipFiles: Map<string, Uint8Array>,
  skipDuplicates: boolean
): Promise<RestoreResult> {
  const seen: ItemIdentity[] = skipDuplicates ? await getItemIdentities(userId) : [];
  const uploadedUrls: string[] = [];
  const items: ImportData['items'] = [];
  let dropped = 0;
  let firstError: string | null = null;

  for (const item of data.items) {
    const identity: ItemIdentity = {
      title: item.title,
      type: item.type,
      content: item.content,
      url: item.url,
      fileName: item.fileName,
    };
    const isDuplicate = skipDuplicates && seen.some((existing) => isDuplicateItem(existing, identity));

    if (item.type !== 'file' && item.type !== 'image') {
      if (skipDuplicates && !isDuplicate) seen.push(identity);
      items.push(item);
      continue;
    }

    // A duplicate is skipped by the import anyway: restore nothing for it
    if (isDuplicate) {
      items.push(item);
      continue;
    }

    // Exports record where each file sits; older ones only have the name
    const entryName = item.zipPath ?? (item.fileName ? `${ZIP_FILES_FOLDER}${item.fileName}` : null);
    const bytes = entryName ? zipFiles.get(entryName) : undefined;
    if (!bytes || !item.fileName) {
      dropped++;
      firstError ??= `${item.title}: the file is not in this ZIP`;
      continue;
    }

    const stored = await ingestFile({
      userId,
      itemType: item.type,
      fileName: item.fileName,
      bytes: Buffer.from(bytes),
    });
    if (!stored.ok) {
      dropped++;
      firstError ??= `${item.title}: ${stored.error}`;
      continue;
    }

    uploadedUrls.push(stored.fileUrl);
    if (skipDuplicates) seen.push(identity);
    items.push({ ...item, fileUrl: stored.fileUrl, fileName: stored.fileName, fileSize: stored.fileSize });
  }

  return { data: { ...data, items }, uploadedUrls, dropped, firstError };
}
