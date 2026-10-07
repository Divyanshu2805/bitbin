import { describe, it, expect } from 'vitest';
import {
  decodeCursor,
  encodeCursor,
  keysetOrderBy,
  keysetWhere,
  readPageRequest,
  resolvePage,
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

describe('keysetWhere', () => {
  const when = new Date(5000);

  it('has no condition for the first page', () => {
    expect(keysetWhere(null, 'after')).toBeUndefined();
  });

  it('after a pinned row: the unpinned rows, plus older pinned ones', () => {
    expect(keysetWhere({ pinned: true, updatedAt: when, id: 'c' }, 'after')).toEqual({
      OR: [
        { isPinned: false },
        { isPinned: true, updatedAt: { lt: when } },
        { isPinned: true, updatedAt: when, id: { lt: 'c' } },
      ],
    });
  });

  it('after an unpinned row: only older unpinned rows', () => {
    expect(keysetWhere({ pinned: false, updatedAt: when, id: 'c' }, 'after')).toEqual({
      OR: [
        { isPinned: false, updatedAt: { lt: when } },
        { isPinned: false, updatedAt: when, id: { lt: 'c' } },
      ],
    });
  });

  it('before an unpinned row: all the pinned rows, plus newer unpinned ones', () => {
    expect(keysetWhere({ pinned: false, updatedAt: when, id: 'c' }, 'before')).toEqual({
      OR: [
        { isPinned: true },
        { isPinned: false, updatedAt: { gt: when } },
        { isPinned: false, updatedAt: when, id: { gt: 'c' } },
      ],
    });
  });

  it('before a pinned row: only newer pinned rows', () => {
    expect(keysetWhere({ pinned: true, updatedAt: when, id: 'c' }, 'before')).toEqual({
      OR: [
        { isPinned: true, updatedAt: { gt: when } },
        { isPinned: true, updatedAt: when, id: { gt: 'c' } },
      ],
    });
  });
});

describe('keysetOrderBy', () => {
  it('runs the list order forward and its reverse backward', () => {
    expect(keysetOrderBy('after')).toEqual([{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }]);
    expect(keysetOrderBy('before')).toEqual([{ isPinned: 'asc' }, { updatedAt: 'asc' }, { id: 'asc' }]);
  });
});

/** The same predicate and order Prisma would apply, run in memory, to prove the pieces fit together */
function simulate(all: ReturnType<typeof row>[], cursorToken: string | undefined, direction: 'after' | 'before', limit: number) {
  const ordered = [...all].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.getTime() - a.updatedAt.getTime() || (a.id < b.id ? 1 : -1));
  const { cursor } = readPageRequest(direction === 'after' ? { after: cursorToken } : { before: cursorToken });
  const where = keysetWhere(cursor, direction);
  const matches = (r: ReturnType<typeof row>) =>
    !where ||
    where.OR.some((c) => {
      if (c.isPinned !== r.isPinned) return false;
      if (c.updatedAt instanceof Date) {
        if (c.updatedAt.getTime() !== r.updatedAt.getTime()) return false;
      } else if (c.updatedAt && 'lt' in c.updatedAt) {
        if (!(r.updatedAt < c.updatedAt.lt)) return false;
      } else if (c.updatedAt && 'gt' in c.updatedAt) {
        if (!(r.updatedAt > c.updatedAt.gt)) return false;
      }
      if (c.id && 'lt' in c.id && !(r.id < c.id.lt)) return false;
      if (c.id && 'gt' in c.id && !(r.id > c.id.gt)) return false;
      return true;
    });
  const filtered = ordered.filter(matches);
  const fetched = direction === 'after' ? filtered : filtered.reverse();
  return resolvePage(fetched.slice(0, limit + 1), limit, direction, Boolean(cursor));
}

describe('resolvePage, walking a whole list', () => {
  // 7 rows: two pinned, five unpinned, two with identical timestamps
  const all = [
    row('p1', true, 900), row('p2', true, 800),
    row('a', false, 700), row('b', false, 600), row('c', false, 600), row('d', false, 500), row('e', false, 400),
  ];
  const expectedOrder = ['p1', 'p2', 'a', 'c', 'b', 'd', 'e'];

  it('walks forward and sees every row exactly once, in order', () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 10; guard++) {
      const { rows, pageInfo } = simulate(all, cursor, 'after', 3);
      seen.push(...rows.map((r) => r.id));
      if (!pageInfo.hasNext) break;
      cursor = pageInfo.nextCursor!;
    }
    expect(seen).toEqual(expectedOrder);
  });

  it('walks backward from the end through the same pages', () => {
    const pages: string[][] = [];
    // Start at the last page: the row after "d" is just "e"
    let page = simulate(all, undefined, 'after', 3);
    while (page.pageInfo.hasNext) page = simulate(all, page.pageInfo.nextCursor!, 'after', 3);
    pages.unshift(page.rows.map((r) => r.id));
    while (page.pageInfo.hasPrev) {
      page = simulate(all, page.pageInfo.prevCursor!, 'before', 3);
      pages.unshift(page.rows.map((r) => r.id));
    }
    expect(pages).toEqual([['p1', 'p2', 'a'], ['c', 'b', 'd'], ['e']]);
  });

  it('flags the first page as having no previous page, and the last as having no next', () => {
    const first = simulate(all, undefined, 'after', 3);
    expect(first.pageInfo.hasPrev).toBe(false);
    expect(first.pageInfo.hasNext).toBe(true);

    const last = simulate(all, encodeCursor(row('d', false, 500)), 'after', 3);
    expect(last.rows.map((r) => r.id)).toEqual(['e']);
    expect(last.pageInfo).toMatchObject({ hasNext: false, hasPrev: true, nextCursor: null });
  });

  it('a list that fits one page has no links at all', () => {
    const { pageInfo } = simulate(all.slice(0, 2), undefined, 'after', 3);
    expect(pageInfo).toEqual({ hasNext: false, hasPrev: false, nextCursor: null, prevCursor: null });
  });

  it('stays put when a row is edited elsewhere while paging', () => {
    const first = simulate(all, undefined, 'after', 3);
    // Row "e" is edited and jumps to the top of the unpinned rows; page two continues from "a" regardless
    const edited = all.map((r) => (r.id === 'e' ? row('e', false, 5000) : r));
    const second = simulate(edited, first.pageInfo.nextCursor!, 'after', 3);
    expect(second.rows.map((r) => r.id)).toEqual(['c', 'b', 'd']);
  });
});
