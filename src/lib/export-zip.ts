import archiver from 'archiver';
import { PassThrough } from 'stream';
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
 */
export async function buildExportZip(userId: string, data: ExportData): Promise<Uint8Array> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  const done = new Promise<Uint8Array>((resolve, reject) => {
    const passthrough = new PassThrough();
    archive.pipe(passthrough);
    passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passthrough.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    passthrough.on('error', reject);
    archive.on('error', reject);
  });

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

  await archive.finalize();
  return done;
}
