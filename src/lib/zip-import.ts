import { Unzip, UnzipInflate, UnzipPassThrough } from 'fflate';
import { ZIP_FILES_FOLDER, ZIP_MANIFEST } from '@/lib/zip-format';

/**
 * Reading an export ZIP back. The archive comes from the user, so every limit is enforced while
 * it is inflated, not after: a small file that expands to gigabytes (a ZIP bomb) is stopped at the
 * byte count, not trusted to declare its own size.
 */

/** Largest ZIP accepted. Vercel functions refuse a request body above about 4.5 MB, so this stays under it. */
export const MAX_IMPORT_ZIP_BYTES = 4 * 1024 * 1024;
/** Largest manifest once inflated */
export const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
/** Largest single stored file (the same cap as an upload) */
export const MAX_ZIP_FILE_BYTES = 10 * 1024 * 1024;
/** Most files one ZIP may restore */
export const MAX_ZIP_FILES = 100;
/** All inflated bytes together */
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

export type ZipReadResult =
  | { ok: true; manifest: unknown; files: Map<string, Uint8Array> }
  | { ok: false; error: string };

/** Whether the bytes start like a ZIP (local file header, or an empty archive). */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05);
}

export function readImportZip(zip: Uint8Array): ZipReadResult {
  if (!looksLikeZip(zip)) return { ok: false, error: 'This is not a ZIP file' };

  let failure: string | null = null;
  let total = 0;
  let manifestBytes: Uint8Array | null = null;
  const files = new Map<string, Uint8Array>();

  const fail = (message: string) => {
    failure ??= message;
  };

  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  unzip.register(UnzipPassThrough);

  unzip.onfile = (entry) => {
    if (failure) return;

    const name = entry.name;
    const isManifest = name === ZIP_MANIFEST;
    const isStoredFile = name.startsWith(ZIP_FILES_FOLDER) && !name.endsWith('/');
    // Text items and everything else are for reading in a file manager; only these two matter
    if (!isManifest && !isStoredFile) return;

    if (isStoredFile && files.size >= MAX_ZIP_FILES) {
      fail(`A ZIP can restore at most ${MAX_ZIP_FILES} files`);
      return;
    }

    const limit = isManifest ? MAX_MANIFEST_BYTES : MAX_ZIP_FILE_BYTES;
    const parts: Uint8Array[] = [];
    let size = 0;

    entry.ondata = (error, chunk, final) => {
      if (failure) return;
      if (error) {
        fail('This ZIP could not be read');
        return;
      }
      size += chunk.length;
      total += chunk.length;
      if (size > limit || total > MAX_TOTAL_BYTES) {
        fail(isManifest ? 'The export manifest is too large' : 'A file in this ZIP is too large');
        entry.terminate();
        return;
      }
      parts.push(chunk);
      if (final) {
        const whole = new Uint8Array(size);
        let offset = 0;
        for (const part of parts) {
          whole.set(part, offset);
          offset += part.length;
        }
        if (isManifest) manifestBytes = whole;
        else files.set(name, whole);
      }
    };
    entry.start();
  };

  try {
    unzip.push(zip, true);
  } catch {
    return { ok: false, error: 'This ZIP could not be read' };
  }

  if (failure) return { ok: false, error: failure };
  if (!manifestBytes) return { ok: false, error: `This ZIP has no ${ZIP_MANIFEST}. Use a ZIP exported from BitBin.` };

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes);
    return { ok: true, manifest: JSON.parse(text), files };
  } catch {
    return { ok: false, error: `${ZIP_MANIFEST} in this ZIP is not valid JSON` };
  }
}
