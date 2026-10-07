import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import {
  MAX_DELETES_PER_RUN,
  MIN_AGE_MS,
  MIN_OBJECTS_TO_JUDGE,
  sweepOrphanedFiles,
  type SweepDeps,
} from './orphan-sweep';

const NOW = new Date('2026-10-07T12:00:00.000Z');
const OLD = new Date(NOW.getTime() - MIN_AGE_MS - 60_000);
const FRESH = new Date(NOW.getTime() - MIN_AGE_MS + 60_000);
const BASE = 'https://pub-test.r2.dev';

const upload = (n: number, name = 'a.png') => `user-1/${1_700_000_000_000 + n}-${name}`;
const objectsOf = (items: { key: string; lastModified?: Date }[]) =>
  async function* () {
    for (const item of items) yield { key: item.key, lastModified: item.lastModified ?? OLD };
  };

function deps(items: { key: string; lastModified?: Date }[], referenced: string[]): SweepDeps & { deleteKeys: ReturnType<typeof vi.fn> } {
  return {
    listObjects: objectsOf(items),
    referencedUrls: async () => referenced,
    deleteKeys: vi.fn(async (keys: string[]) => keys.length),
    now: () => NOW,
  };
}

describe('sweepOrphanedFiles', () => {
  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_URL', BASE);
  });

  it('deletes an old upload that no item points at, and keeps one that is referenced', async () => {
    const d = deps([{ key: upload(1, 'orphan.png') }, { key: upload(2, 'kept.png') }], [`${BASE}/${upload(2, 'kept.png')}`]);

    const result = await sweepOrphanedFiles({}, d);

    expect(d.deleteKeys).toHaveBeenCalledWith([upload(1, 'orphan.png')]);
    expect(result).toMatchObject({ scanned: 2, eligible: 2, orphans: 1, deleted: 1, aborted: null, dryRun: false });
  });

  it('leaves a fresh object alone: its item may not be saved yet', async () => {
    const d = deps([{ key: upload(1), lastModified: FRESH }], []);

    const result = await sweepOrphanedFiles({}, d);

    expect(d.deleteKeys).not.toHaveBeenCalled();
    expect(result).toMatchObject({ scanned: 1, eligible: 0, orphans: 0, deleted: 0 });
  });

  it('leaves anything that is not shaped like one of our uploads', async () => {
    const d = deps(
      [{ key: 'README.txt' }, { key: 'backups/db.sql' }, { key: 'user-1/not-a-timestamp.png' }, { key: 'user-1/' }],
      []
    );

    const result = await sweepOrphanedFiles({}, d);

    expect(d.deleteKeys).not.toHaveBeenCalled();
    expect(result.eligible).toBe(0);
  });

  it('counts a reference whether the item stored the full URL or just a path on another host', async () => {
    const d = deps(
      [{ key: upload(1, 'a.png') }, { key: upload(2, 'b.png') }, { key: upload(3, 'c.png') }],
      [`${BASE}/${upload(1, 'a.png')}`, `https://old-domain.example/${upload(2, 'b.png')}`]
    );

    await sweepOrphanedFiles({}, d);

    expect(d.deleteKeys).toHaveBeenCalledWith([upload(3, 'c.png')]);
  });

  it('a dry run reports the orphans and deletes nothing', async () => {
    const d = deps([{ key: upload(1) }], []);

    const result = await sweepOrphanedFiles({ dryRun: true }, d);

    expect(d.deleteKeys).not.toHaveBeenCalled();
    expect(result).toMatchObject({ orphans: 1, deleted: 0, dryRun: true });
  });

  it('refuses to delete when most of a real-sized bucket looks orphaned (the wrong database)', async () => {
    const items = Array.from({ length: MIN_OBJECTS_TO_JUDGE }, (_, i) => ({ key: upload(i) }));
    const d = deps(items, []);

    const result = await sweepOrphanedFiles({}, d);

    expect(d.deleteKeys).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
    expect(result.aborted).toContain('DATABASE_URL');
  });

  it('still cleans up a few orphans among many kept files', async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ key: upload(i) }));
    const referenced = items.slice(3).map((i) => `${BASE}/${i.key}`);
    const d = deps(items, referenced);

    const result = await sweepOrphanedFiles({}, d);

    expect(result).toMatchObject({ eligible: 30, orphans: 3, deleted: 3, aborted: null });
  });

  it('in a bucket too small to judge, deletes its few orphans', async () => {
    const d = deps([{ key: upload(1) }, { key: upload(2) }], []);

    const result = await sweepOrphanedFiles({}, d);

    expect(result.deleted).toBe(2);
  });

  it('deletes at most one batch per run, reporting the real number of orphans', async () => {
    const orphans = MAX_DELETES_PER_RUN + 5;
    const kept = Array.from({ length: orphans * 2 }, (_, i) => ({ key: upload(100_000 + i) }));
    const orphanItems = Array.from({ length: orphans }, (_, i) => ({ key: upload(i) }));
    const d = deps([...orphanItems, ...kept], kept.map((k) => `${BASE}/${k.key}`));

    const result = await sweepOrphanedFiles({}, d);

    expect(d.deleteKeys.mock.calls[0][0]).toHaveLength(MAX_DELETES_PER_RUN);
    expect(result.orphans).toBe(orphans);
    expect(result.deleted).toBe(MAX_DELETES_PER_RUN);
  });

  it('reports only what the store actually deleted', async () => {
    const d = deps([{ key: upload(1) }, { key: upload(2) }], []);
    d.deleteKeys.mockResolvedValue(1);

    expect((await sweepOrphanedFiles({}, d)).deleted).toBe(1);
  });

  it('does nothing for an empty bucket', async () => {
    const d = deps([], []);

    expect(await sweepOrphanedFiles({}, d)).toMatchObject({ scanned: 0, orphans: 0, deleted: 0, aborted: null });
    expect(d.deleteKeys).not.toHaveBeenCalled();
  });
});
