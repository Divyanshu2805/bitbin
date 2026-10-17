import { describe, it, expect, vi } from 'vitest';
import {
  decodeCursor,
  encodeCursor,
  fetchKeysetRows,
  keysetOrderBy,
  keysetSegments,
  readPageRequest,
  resolvePage,
  type KeysetSegment,
} from './keyset';

const row = (id: string, isPinned: boolean, ms: number) => ({ id, isPinned, updatedAt: new Date(ms) });

describe('cursor', () => {
  it('round-trips a row', () => {
    const cursor = decodeCursor(encodeCursor(row('abc', true, 1_700_000_000_123)));
    expect(cursor).toEqual({ pinned: true, updatedAt: new Date(1_700_000_000_123), id: 'abc' });
  });

  it.each([
    undefined,
    null,
    '',
    'not-base64-json',
    Buffer.from('{}').toString('base64url'),
    Buffer.from('[1,2]').toString('base64url'),
    Buffer.from('[2,1,"a"]').toString('base64url'),
    Buffer.from('[1,"x","a"]').toString('base64url'),
    Buffer.from('[1,1e999,"a"]').toString('base64url'),
    Buffer.from('[1,1,""]').toString('base64url'),
    Buffer.from(`[1,1,"${'a'.repeat(101)}"]`).toString('base64url'),
    'x'.repeat(201),
  ])('treats %j as no cursor', (value) => {
    expect(decodeCursor(value as string | null | undefined)).toBeNull();
  });
});

describe('readPageRequest', () => {
  const token = encodeCursor(row('r1', false, 1000));

  it('is the first page with no cursor or a bad one', () => {
    expect(readPageRequest(undefined)).toEqual({ cursor: null, direction: 'after' });
    expect(readPageRequest({ after: 'junk', before: 'junk' })).toEqual({ cursor: null, direction: 'after' });
  });

  it('reads after and before', () => {
    expect(readPageRequest({ after: token }).direction).toBe('after');
    expect(readPageRequest({ before: token }).direction).toBe('before');
  });

  it('prefers after when both are given', () => {
    expect(readPageRequest({ after: token, before: encodeCursor(row('r2', true, 5)) }).cursor?.id).toBe('r1');
  });
});

describe('keysetSegments', () => {
  const when = new Date(5000);
  const older = { isPinned: true, updatedAt: { lte: when }, OR: [{ updatedAt: { lt: when } }, { id: { lt: 'c' } }] };
  const newer = { isPinned: false, updatedAt: { gte: when }, OR: [{ updatedAt: { gt: when } }, { id: { gt: 'c' } }] };

  it('has no segment for the first page', () => {
    expect(keysetSegments(null, 'after')).toEqual([]);
  });

  it('after a pinned row: older pinned rows, then the unpinned ones', () => {
    expect(keysetSegments({ pinned: true, updatedAt: when, id: 'c' }, 'after')).toEqual([older, { isPinned: false }]);
  });

  it('after an unpinned row: only older unpinned rows', () => {
    expect(keysetSegments({ pinned: false, updatedAt: when, id: 'c' }, 'after')).toEqual([{ ...older, isPinned: false }]);
  });

  it('before an unpinned row: newer unpinned rows, then the pinned ones', () => {
    expect(keysetSegments({ pinned: false, updatedAt: when, id: 'c' }, 'before')).toEqual([newer, { isPinned: true }]);
  });

  it('before a pinned row: only newer pinned rows', () => {
    expect(keysetSegments({ pinned: true, updatedAt: when, id: 'c' }, 'before')).toEqual([{ ...newer, isPinned: true }]);
  });

  it('bounds updatedAt in every segment that continues from the cursor, so an index scan can start there', () => {
    for (const pinned of [true, false]) {
      for (const direction of ['after', 'before'] as const) {
        const [first] = keysetSegments({ pinned, updatedAt: when, id: 'c' }, direction);
        expect(first.updatedAt).toEqual(direction === 'after' ? { lte: when } : { gte: when });
      }
    }
  });
});

describe('fetchKeysetRows', () => {
  const cursor = { pinned: true, updatedAt: new Date(5000), id: 'c' };

  it('reads the first page in one query, with no condition', async () => {
    const fetch = vi.fn().mockResolvedValue(['a', 'b']);

    expect(await fetchKeysetRows(null, 'after', 4, fetch)).toEqual(['a', 'b']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(undefined, 4);
  });

  it('stops after the first segment when it fills the page', async () => {
    const fetch = vi.fn().mockResolvedValue(['a', 'b', 'c', 'd']);

    expect(await fetchKeysetRows(cursor, 'after', 4, fetch)).toHaveLength(4);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('asks the next segment only for the rows still missing', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(['p1']).mockResolvedValueOnce(['a', 'b', 'c']);

    expect(await fetchKeysetRows(cursor, 'after', 4, fetch)).toEqual(['p1', 'a', 'b', 'c']);
    expect(fetch).toHaveBeenNthCalledWith(1, keysetSegments(cursor, 'after')[0], 4);
    expect(fetch).toHaveBeenNthCalledWith(2, { isPinned: false }, 3);
  });
});

describe('keysetOrderBy', () => {
  it('runs the list order forward and its reverse backward', () => {
    expect(keysetOrderBy('after')).toEqual([{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }]);
    expect(keysetOrderBy('before')).toEqual([{ isPinned: 'asc' }, { updatedAt: 'asc' }, { id: 'asc' }]);
  });
});

type Row = ReturnType<typeof row>;

/** Whether a row satisfies a segment, as Prisma would read the condition */
function inSegment(segment: KeysetSegment, r: Row): boolean {
  if (segment.isPinned !== r.isPinned) return false;
  const time = r.updatedAt.getTime();
  if (segment.updatedAt && 'lte' in segment.updatedAt && !(time <= segment.updatedAt.lte.getTime())) return false;
  if (segment.updatedAt && 'gte' in segment.updatedAt && !(time >= segment.updatedAt.gte.getTime())) return false;
  return (
    !segment.OR ||
    segment.OR.some((c) => {
      if ('updatedAt' in c) return 'lt' in c.updatedAt ? time < c.updatedAt.lt.getTime() : time > c.updatedAt.gt.getTime();
      return 'lt' in c.id ? r.id < c.id.lt : r.id > c.id.gt;
    })
  );
}

/** The same segments, order and limits Prisma would apply, run in memory, to prove the pieces fit together */
async function simulate(all: Row[], cursorToken: string | undefined, direction: 'after' | 'before', limit: number) {
  const ordered = [...all].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.getTime() - a.updatedAt.getTime() || (a.id < b.id ? 1 : -1));
  const inQueryOrder = direction === 'after' ? ordered : [...ordered].reverse();
  const { cursor } = readPageRequest(direction === 'after' ? { after: cursorToken } : { before: cursorToken });
  const fetched = await fetchKeysetRows(cursor, direction, limit + 1, async (position, take) =>
    inQueryOrder.filter((r) => !position || inSegment(position, r)).slice(0, take)
  );
  return resolvePage(fetched, limit, direction, Boolean(cursor));
}

describe('resolvePage, walking a whole list', () => {
  // 7 rows: two pinned, five unpinned, two with identical timestamps
  const all = [
    row('p1', true, 900), row('p2', true, 800),
    row('a', false, 700), row('b', false, 600), row('c', false, 600), row('d', false, 500), row('e', false, 400),
  ];
  const expectedOrder = ['p1', 'p2', 'a', 'c', 'b', 'd', 'e'];

  it('walks forward and sees every row exactly once, in order', async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 10; guard++) {
      const { rows, pageInfo } = await simulate(all, cursor, 'after', 3);
      seen.push(...rows.map((r) => r.id));
      if (!pageInfo.hasNext) break;
      cursor = pageInfo.nextCursor!;
    }
    expect(seen).toEqual(expectedOrder);
  });

  it('walks forward one row at a time across the pinned/unpinned boundary', async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 10; guard++) {
      const { rows, pageInfo } = await simulate(all, cursor, 'after', 1);
      seen.push(...rows.map((r) => r.id));
      if (!pageInfo.hasNext) break;
      cursor = pageInfo.nextCursor!;
    }
    expect(seen).toEqual(expectedOrder);
  });

  it('walks backward from the end through the same pages', async () => {
    const pages: string[][] = [];
    // Start at the last page: the row after "d" is just "e"
    let page = await simulate(all, undefined, 'after', 3);
    while (page.pageInfo.hasNext) page = await simulate(all, page.pageInfo.nextCursor!, 'after', 3);
    pages.unshift(page.rows.map((r) => r.id));
    while (page.pageInfo.hasPrev) {
      page = await simulate(all, page.pageInfo.prevCursor!, 'before', 3);
      pages.unshift(page.rows.map((r) => r.id));
    }
    expect(pages).toEqual([['p1', 'p2', 'a'], ['c', 'b', 'd'], ['e']]);
  });

  it('going back from the first unpinned rows reaches up into the pinned ones', async () => {
    const page = await simulate(all, encodeCursor(row('c', false, 600)), 'before', 3);
    expect(page.rows.map((r) => r.id)).toEqual(['p1', 'p2', 'a']);
    expect(page.pageInfo.hasPrev).toBe(false);
  });

  it('flags the first page as having no previous page, and the last as having no next', async () => {
    const first = await simulate(all, undefined, 'after', 3);
    expect(first.pageInfo.hasPrev).toBe(false);
    expect(first.pageInfo.hasNext).toBe(true);

    const last = await simulate(all, encodeCursor(row('d', false, 500)), 'after', 3);
    expect(last.rows.map((r) => r.id)).toEqual(['e']);
    expect(last.pageInfo).toMatchObject({ hasNext: false, hasPrev: true, nextCursor: null });
  });

  it('a list that fits one page has no links at all', async () => {
    const { pageInfo } = await simulate(all.slice(0, 2), undefined, 'after', 3);
    expect(pageInfo).toEqual({ hasNext: false, hasPrev: false, nextCursor: null, prevCursor: null });
  });

  it('stays put when a row is edited elsewhere while paging', async () => {
    const first = await simulate(all, undefined, 'after', 3);
    // Row "e" is edited and jumps to the top of the unpinned rows; page two continues from "a" regardless
    const edited = all.map((r) => (r.id === 'e' ? row('e', false, 5000) : r));
    const second = await simulate(edited, first.pageInfo.nextCursor!, 'after', 3);
    expect(second.rows.map((r) => r.id)).toEqual(['c', 'b', 'd']);
  });
});
