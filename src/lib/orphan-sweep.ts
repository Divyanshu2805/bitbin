import { getAllReferencedFileUrls } from '@/lib/db/files';
import { deleteR2Keys, listR2Objects, type StoredObject } from '@/lib/r2';
import { fileKeyFromUrl } from '@/lib/file-url';

/**
 * Removes stored files that no item points at: an upload whose item was never created, a delete that
 * failed on the storage side, an account whose cleanup failed. Deleting an item deletes its file, so
 * these are the leftovers.
 *
 * Deleting from storage can't be undone, so the sweep is cautious:
 * - Only objects older than a day. A file is uploaded before its item exists, so a fresh object
 *   with no item may simply be mid-save.
 * - Only keys shaped like our uploads (`{userId}/{timestamp}-{name}`); anything else in the bucket is left.
 * - It refuses to run when most of the bucket would go. A healthy bucket has few orphans; "most of it"
 *   means the database being read isn't the one these files belong to (a wrong DATABASE_URL).
 * - At most a fixed number of deletions per run, so a mistake is bounded; the next run continues.
 */

export const MIN_AGE_MS = 24 * 60 * 60 * 1000;
export const MAX_DELETES_PER_RUN = 1000;
/** The share of eligible objects above which the run aborts, once there are enough of them to judge */
export const MAX_ORPHAN_SHARE = 0.5;
export const MIN_OBJECTS_TO_JUDGE = 20;

// {userId}/{timestamp}-{sanitised name}: what uploadToR2 writes
const UPLOAD_KEY = /^[A-Za-z0-9_-]+\/\d{10,}-[A-Za-z0-9._-]+$/;

export interface SweepResult {
  /** Objects looked at */
  scanned: number;
  /** Of those, uploads old enough to judge */
  eligible: number;
  /** Eligible objects with no item (capped at MAX_DELETES_PER_RUN per run) */
  orphans: number;
  deleted: number;
  dryRun: boolean;
  /** Set when the run stopped without deleting anything, and why */
  aborted: string | null;
}

export interface SweepDeps {
  listObjects: () => AsyncIterable<StoredObject>;
  referencedUrls: () => Promise<string[]>;
  deleteKeys: (keys: string[]) => Promise<number>;
  now: () => Date;
}

const defaultDeps: SweepDeps = {
  listObjects: listR2Objects,
  referencedUrls: getAllReferencedFileUrls,
  deleteKeys: deleteR2Keys,
  now: () => new Date(),
};

/** The storage keys an item's `fileUrl` could mean: stripped of the configured public URL, and read from the path. */
function keysOf(fileUrl: string): string[] {
  const keys: string[] = [];
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (publicUrl && fileUrl.startsWith(`${publicUrl}/`)) keys.push(fileUrl.slice(publicUrl.length + 1));
  const fromPath = fileKeyFromUrl(fileUrl);
  if (fromPath) keys.push(fromPath);
  return keys;
}

export async function sweepOrphanedFiles(
  { dryRun = false }: { dryRun?: boolean } = {},
  deps: SweepDeps = defaultDeps
): Promise<SweepResult> {
  // Read the references first: anything saved after this is newer than the age cut-off anyway
  const referenced = new Set((await deps.referencedUrls()).flatMap(keysOf));
  const cutoff = deps.now().getTime() - MIN_AGE_MS;

  let scanned = 0;
  let eligible = 0;
  let orphanCount = 0;
  const toDelete: string[] = [];

  for await (const object of deps.listObjects()) {
    scanned++;
    if (!UPLOAD_KEY.test(object.key)) continue;
    if (object.lastModified.getTime() > cutoff) continue;
    eligible++;
    if (referenced.has(object.key)) continue;

    orphanCount++;
    if (toDelete.length < MAX_DELETES_PER_RUN) toDelete.push(object.key);
  }

  const result: SweepResult = { scanned, eligible, orphans: orphanCount, deleted: 0, dryRun, aborted: null };

  if (eligible >= MIN_OBJECTS_TO_JUDGE && orphanCount / eligible > MAX_ORPHAN_SHARE) {
    result.aborted = `${orphanCount} of ${eligible} old files have no item; that is too many to be leftovers, so nothing was deleted. Check that DATABASE_URL is the database these files belong to.`;
    return result;
  }

  if (!dryRun && toDelete.length > 0) {
    result.deleted = await deps.deleteKeys(toDelete);
  }
  return result;
}
