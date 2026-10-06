import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: 0, retryAfter: 0 }),
}));
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: mockCheckRateLimit,
}));
const overLimit = { success: false, remaining: 0, reset: 0, retryAfter: 180 };
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    item: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    collection: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    itemType: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { previewImport, importData } from './import';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

const validExportJson = JSON.stringify({
  version: 1,
  exportedAt: '2026-03-11T00:00:00.000Z',
  items: [
    {
      title: 'useAuth hook',
      type: 'snippet',
      content: 'export function useAuth() {}',
      language: 'typescript',
      description: 'Custom auth hook',
      tags: ['react', 'auth'],
      collections: ['React Patterns'],
      isFavorite: true,
      isPinned: false,
    },
    {
      title: 'Git reset',
      type: 'command',
      content: 'git reset --hard HEAD~1',
      tags: ['git'],
      collections: [],
      isFavorite: false,
      isPinned: false,
    },
    {
      title: 'My Prompt',
      type: 'prompt',
      content: 'You are a helpful assistant',
      tags: [],
      collections: ['AI Workflows'],
      isFavorite: false,
      isPinned: false,
    },
  ],
  collections: [
    { name: 'React Patterns', description: 'Common patterns', isFavorite: false },
    { name: 'AI Workflows', description: null, isFavorite: true },
  ],
});

describe('previewImport server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await previewImport('{}');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for invalid JSON', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport('not json');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid JSON file');
  });

  it('returns error for invalid export format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({ foo: 'bar' }));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('returns preview with correct counts', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(validExportJson);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      itemCountsByType: { snippet: 1, command: 1, prompt: 1 },
      collectionCount: 2,
      tagCount: 3, // react, auth, git
      totalItems: 3,
    });
  });

  it('returns error for missing version field', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({
      items: [],
      collections: [],
    }));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('returns error for invalid item type', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({
      version: 1,
      items: [{ title: 'Test', type: 'invalid-type', content: 'hello' }],
      collections: [],
    }));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('handles empty export', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await previewImport(JSON.stringify({
      version: 1,
      items: [],
      collections: [],
    }));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      itemCountsByType: {},
      collectionCount: 0,
      tagCount: 0,
      totalItems: 0,
    });
  });
});

describe('importData server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await importData('{}', true);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error for invalid JSON', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await importData('not json', true);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid JSON file');
  });

  it('returns error for invalid export format', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const result = await importData(JSON.stringify({ foo: 'bar' }), true);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid export format');
  });

  it('calls transaction with correct data for valid import', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: true },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
      { id: 'type-2', name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true, userId: null },
      { id: 'type-3', name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true, userId: null },
    ]);

    // Mock transaction to execute the callback
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
          count: (...args: Parameters<typeof prisma.collection.count>) => prisma.collection.count(...args),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
          count: (...args: Parameters<typeof prisma.item.count>) => prisma.item.count(...args),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(validExportJson, false);

    expect(result.success).toBe(true);
    expect(result.data?.itemsImported).toBe(3);
    expect(result.data?.collectionsImported).toBe(2);
  });

  it('filters file/image types for free users', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    const jsonWithFiles = JSON.stringify({
      version: 1,
      items: [
        { title: 'Snippet', type: 'snippet', content: 'code', tags: [], collections: [] },
        { title: 'Image', type: 'image', content: null, tags: [], collections: [] },
        { title: 'File', type: 'file', content: null, tags: [], collections: [] },
      ],
      collections: [],
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
    ]);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
          count: (...args: Parameters<typeof prisma.collection.count>) => prisma.collection.count(...args),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
          count: (...args: Parameters<typeof prisma.item.count>) => prisma.item.count(...args),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(jsonWithFiles, false);

    expect(result.success).toBe(true);
    // Only the snippet should be imported, file and image filtered out
    expect(result.data?.itemsImported).toBe(1);
  });

  it('enforces free tier item limit', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    // User already has 49 items
    vi.mocked(prisma.item.count).mockResolvedValue(49);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
      { id: 'type-2', name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true, userId: null },
      { id: 'type-3', name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true, userId: null },
    ]);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
          count: (...args: Parameters<typeof prisma.collection.count>) => prisma.collection.count(...args),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
          count: (...args: Parameters<typeof prisma.item.count>) => prisma.item.count(...args),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(validExportJson, false);

    expect(result.success).toBe(true);
    // Only 1 item can fit (50 - 49 = 1)
    expect(result.data?.itemsImported).toBe(1);
    expect(result.data?.itemsSkipped).toBe(2);
  });

  it('enforces free tier collection limit', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-123', isPro: false },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.item.count).mockResolvedValue(0);
    // User already has 2 collections
    vi.mocked(prisma.collection.count).mockResolvedValue(2);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true, userId: null },
      { id: 'type-2', name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true, userId: null },
      { id: 'type-3', name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true, userId: null },
    ]);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const txClient = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        collection: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'new-coll', name: 'Test' }),
          count: (...args: Parameters<typeof prisma.collection.count>) => prisma.collection.count(...args),
        },
        item: {
          create: vi.fn().mockResolvedValue({ id: 'new-item' }),
          count: (...args: Parameters<typeof prisma.item.count>) => prisma.item.count(...args),
        },
      };
      return (fn as (tx: typeof txClient) => Promise<void>)(txClient);
    });

    const result = await importData(validExportJson, false);

    expect(result.success).toBe(true);
    // Only 1 collection can fit (3 - 2 = 1)
    expect(result.data?.collectionsImported).toBe(1);
    expect(result.data?.collectionsSkipped).toBe(1);
  });
});

describe('importData input hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: true }, expires: new Date().toISOString() });
    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'link', icon: 'Link', color: '#fff', isSystem: true, userId: null },
      { id: 'type-2', name: 'image', icon: 'Image', color: '#fff', isSystem: true, userId: null },
    ]);
  });

  function captureCreates() {
    const create = vi.fn().mockResolvedValue({ id: 'new-item' });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        collection: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
        item: { create },
      };
      return (fn as (t: typeof tx) => Promise<void>)(tx);
    });
    return create;
  }

  const exportOf = (items: object[]) => JSON.stringify({ version: 1, items, collections: [] });

  it('drops non-http URLs instead of storing them', async () => {
    const create = captureCreates();
    await importData(
      exportOf([
        { title: 'Bad', type: 'link', url: 'javascript:alert(1)', tags: [], collections: [] },
        { title: 'Good', type: 'link', url: 'https://example.com', tags: [], collections: [] },
      ]),
      false
    );

    expect(create.mock.calls[0][0].data.url).toBeNull();
    expect(create.mock.calls[1][0].data.url).toBe('https://example.com');
  });

  it("drops a file URL that isn't in the importer's own folder", async () => {
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-test.r2.dev');
    const create = captureCreates();
    await importData(
      exportOf([
        { title: 'Theirs', type: 'image', fileUrl: 'https://pub-test.r2.dev/other-user/1-a.png', tags: [], collections: [] },
        { title: 'Mine', type: 'image', fileUrl: 'https://pub-test.r2.dev/user-123/1-b.png', tags: [], collections: [] },
      ]),
      false
    );

    expect(create.mock.calls[0][0].data.fileUrl).toBeNull();
    expect(create.mock.calls[1][0].data.fileUrl).toBe('https://pub-test.r2.dev/user-123/1-b.png');
  });

  it('rejects oversized fields', async () => {
    const result = await importData(
      exportOf([{ title: 't'.repeat(201), type: 'link', tags: [], collections: [] }]),
      false
    );

    expect(result.success).toBe(false);
  });
});

describe('importData duplicates and dates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: true }, expires: new Date().toISOString() });
    vi.mocked(prisma.item.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.itemType.findMany).mockResolvedValue([
      { id: 'type-1', name: 'note', icon: 'StickyNote', color: '#fde047', isSystem: true, userId: null },
      { id: 'type-2', name: 'link', icon: 'Link', color: '#10b981', isSystem: true, userId: null },
    ]);
  });

  function captureCreates() {
    const create = vi.fn().mockResolvedValue({ id: 'new-item' });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        $queryRaw: vi.fn(),
        collection: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), count: vi.fn() },
        item: { create, count: vi.fn() },
      };
      return (fn as (t: typeof tx) => Promise<void>)(tx);
    });
    return create;
  }

  const exportOf = (items: object[]) => JSON.stringify({ version: 1, items, collections: [] });
  const note = (over: object) => ({ title: 'Shopping', type: 'note', tags: [], collections: [], ...over });

  it('imports a note that has the same title as a saved one but different text', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([
      { title: 'Shopping', content: 'milk', url: null, fileName: null, itemType: { name: 'note' } },
    ] as never);
    const create = captureCreates();

    const result = await importData(exportOf([note({ content: 'eggs' })]), true);

    expect(result.data?.itemsImported).toBe(1);
    expect(result.data?.itemsSkipped).toBe(0);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('skips a note that really is already saved', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([
      { title: 'Shopping', content: 'milk', url: null, fileName: null, itemType: { name: 'note' } },
    ] as never);
    const create = captureCreates();

    const result = await importData(exportOf([note({ content: 'milk' })]), true);

    expect(result.data?.itemsSkipped).toBe(1);
    expect(create).not.toHaveBeenCalled();
  });

  it('skips a repeat inside the same file', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    const create = captureCreates();

    const result = await importData(exportOf([note({ content: 'milk' }), note({ content: 'milk' })]), true);

    expect(result.data?.itemsImported).toBe(1);
    expect(result.data?.itemsSkipped).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('keeps the dates from the file', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    const create = captureCreates();

    await importData(
      exportOf([note({ content: 'a', createdAt: '2025-01-02T03:04:05.000Z', updatedAt: '2025-02-03T04:05:06.000Z' })]),
      false
    );

    const data = create.mock.calls[0][0].data;
    expect(data.createdAt).toEqual(new Date('2025-01-02T03:04:05.000Z'));
    expect(data.updatedAt).toEqual(new Date('2025-02-03T04:05:06.000Z'));
  });

  it('uses the creation date for updatedAt when the file has no other, and defaults when it has neither', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    const create = captureCreates();

    await importData(
      exportOf([note({ content: 'a', createdAt: '2025-01-02T03:04:05.000Z' }), note({ title: 'Two', content: 'b' })]),
      false
    );

    expect(create.mock.calls[0][0].data.updatedAt).toEqual(new Date('2025-01-02T03:04:05.000Z'));
    expect(create.mock.calls[1][0].data.createdAt).toBeUndefined();
    expect(create.mock.calls[1][0].data.updatedAt).toBeUndefined();
  });

  it('ignores an unreadable date instead of failing the import', async () => {
    vi.mocked(prisma.item.findMany).mockResolvedValue([]);
    const create = captureCreates();

    const result = await importData(exportOf([note({ content: 'a', createdAt: 'garbage' })]), false);

    expect(result.success).toBe(true);
    expect(create.mock.calls[0][0].data.createdAt).toBeUndefined();
  });
});

describe('import rate limits', () => {
  const exportJson = JSON.stringify({ version: 1, items: [], collections: [] });

  beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: 'user-123', isPro: true }, expires: new Date().toISOString() });
  });

  it('refuses an import over the limit before reading the file or touching the database', async () => {
    mockCheckRateLimit.mockResolvedValueOnce(overLimit);
    vi.mocked(prisma.item.count).mockClear();

    const result = await importData(exportJson, true);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Too many imports. Please try again in 3 minutes.');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('import', 'user-123');
    expect(prisma.item.count).not.toHaveBeenCalled();
  });

  it('refuses a preview over its own, looser limit', async () => {
    mockCheckRateLimit.mockResolvedValueOnce(overLimit);

    const result = await previewImport(exportJson);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Too many import previews. Please try again in 3 minutes.');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('importPreview', 'user-123');
  });
});

describe('imports on the shared demo account', () => {
  const demo = { user: { id: 'demo-1', email: 'demo@bitbin.dev', isPro: false }, expires: '' } as Session;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(demo);
  });

  it('are refused, preview included, before the file is read', async () => {
    const preview = await previewImport(validExportJson);
    const run = await importData(validExportJson, false);

    expect(preview.success).toBe(false);
    expect(run.success).toBe(false);
    expect(run.error).toContain("The demo account can't import data");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
