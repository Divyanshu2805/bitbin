import archiver from 'archiver';
import { Readable } from 'stream';
import { getFromR2, isOwnedFileUrl } from '@/lib/r2';
import { fileKeyFromUrl } from '@/lib/file-url';
import { buildTextEntries, safeFileName } from '@/lib/export-files';
import { ZIP_FILES_FOLDER, ZIP_MANIFEST } from '@/lib/zip-format';
import type { ExportData, ExportItem } from '@/lib/db/export';

/**
 * Build the ZIP for an export: the JSON manifest (the part that can be imported again), the text
 * items as ordinary files, and the user's stored files and images read from private storage by
 * key. Each file is named uniquely, and the manifest records that name (`zipPath`) so an import
 * can put the right bytes back on the right item even when two files share a name.
 *
 * The ZIP is returned as a stream and written as it is sent: a streamed response isn't held to the
 * host's 4.5 MB response limit, so an export of any size downloads.
 */
export async function buildExportZip(userId: string, data: ExportData): Promise<ReadableStream<Uint8Array>> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('warning', (error) => console.error('Export ZIP warning:', error));

  const taken = new Set<string>();
  const fileEntries: { path: string; body: Uint8Array }[] = [];
  const items: ExportItem[] = [];

  for (const item of data.items) {
    const isFile = (item.type === 'file' || item.type === 'image') && isOwnedFileUrl(userId, item.fileUrl);
    if (!isFile) {
      items.push(item);
      continue;
    }

    let zipPath: string | null = null;
    try {
      // The bucket is private: read the object with our credentials, by its key
      const object = await getFromR2(fileKeyFromUrl(item.fileUrl)!);
      if (object) {
        const base = safeFileName(item.fileName || 'file');
        const dot = base.lastIndexOf('.');
        const stem = dot > 0 ? base.slice(0, dot) : base;
        const ext = dot > 0 ? base.slice(dot) : '';
        let name = `${stem}${ext}`;
        // The same name twice: name.ext, name-2.ext, ... (case-insensitively, for Windows and macOS)
        for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${stem}-${n}${ext}`;
        taken.add(name.toLowerCase());

        zipPath = `${ZIP_FILES_FOLDER}${name}`;
        fileEntries.push({ path: zipPath, body: object.body });
      }
    } catch {
      // Skip files that can't be fetched
    }
    items.push({ ...item, zipPath });
  }

  archive.append(JSON.stringify({ ...data, items }, null, 2), { name: ZIP_MANIFEST });

  // Snippets, prompts, commands, notes and links as plain files next to the manifest
  for (const entry of buildTextEntries(data.items)) {
    archive.append(entry.content, { name: entry.path });
  }

  for (const entry of fileEntries) {
    archive.append(Buffer.from(entry.body), { name: entry.path });
  }

  // Not awaited: finalize() resolves once everything has been read, which only happens as the
  // response consumes the stream
  archive.finalize().catch((error) => console.error('Export ZIP failed:', error));
  return Readable.toWeb(archive) as ReadableStream<Uint8Array>;
}
