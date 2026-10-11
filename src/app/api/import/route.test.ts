import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';
import { strToU8, zipSync } from 'fflate';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

const { checkRateLimit, importLibrary, restore, deleteFromR2, getPart, deleteKeys } = vi.hoisted(() => ({
  getPart: vi.fn(),
  deleteKeys: vi.fn(),
  checkRateLimit: vi.fn(),
  importLibrary: vi.fn(),
  restore: vi.fn(),
  deleteFromR2: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit,
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));
vi.mock('@/lib/db/import', () => ({ importLibrary }));
vi.mock('@/lib/zip-restore', () => ({ restoreZipFiles: restore }));
vi.mock('@/lib/r2', () => ({ deleteFromR2, getFromR2: getPart, deleteR2Keys: deleteKeys }));

import { POST } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const pro: Session = { user: { id: 'user-1', email: 'u@example.com', isPro: true }, expires: '' };

const manifest = { version: 1, items: [{ title: 'Todo', type: 'note', content: 'x' }], collections: [{ name: 'Work' }] };
const zip = (entries: Record<string, Uint8Array> = { 'bitbin-export.json': strToU8(JSON.stringify(manifest)) }) => zipSync(entries);

function post(fields: { file?: Uint8Array | File; mode?: string; skipDuplicates?: string }) {
  const form = new FormData();
  if (fields.file) {
    form.set('file', fields.file instanceof File ? fields.file : new File([fields.file as BlobPart], 'export.zip', { type: 'application/zip' }));
  }
  if (fields.mode) form.set('mode', fields.mode);
  if (fields.skipDuplicates) form.set('skipDuplicates', fields.skipDuplicates);
  return POST(new Request('http://localhost/api/import', { method: 'POST', body: form }));
}

describe('POST /api/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(pro);
    checkRateLimit.mockResolvedValue({ success: true });
    restore.mockImplementation(async (_userId: string, data: unknown) => ({ data, uploadedUrls: ['https://r2.example/user-1/1-a.txt'], dropped: 0, firstError: null }));
    importLibrary.mockResolvedValue({ itemsImported: 1, collectionsImported: 1, itemsSkipped: 0, collectionsSkipped: 0 });
    deleteFromR2.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await post({ file: zip(), mode: 'preview' })).status).toBe(401);
  });

  it('refuses the demo account', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'demo', email: 'demo@bitbin.dev', isPro: true }, expires: '' });
    expect((await post({ file: zip(), mode: 'preview' })).status).toBe(403);
    expect(importLibrary).not.toHaveBeenCalled();
  });

  it('keeps ZIP import Pro-only, checked on the server', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', email: 'u@example.com', isPro: false }, expires: '' });
    const res = await post({ file: zip(), mode: 'import' });
    expect(res.status).toBe(403);
    expect(restore).not.toHaveBeenCalled();
  });

  it('rejects a request from another site', async () => {
    const form = new FormData();
    form.set('mode', 'preview');
    const res = await POST(new Request('http://localhost/api/import', { method: 'POST', body: form, headers: { 'sec-fetch-site': 'cross-site' } }));
    expect(res.status).toBe(403);
  });

  it('answers 429 over the rate limit', async () => {
    checkRateLimit.mockResolvedValue({ success: false, retryAfter: 60 });
    expect((await post({ file: zip(), mode: 'import' })).status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith('import', 'user-1');
    expect(importLibrary).not.toHaveBeenCalled();
  });

  it('rejects an unknown mode, a missing file and something that is not a ZIP', async () => {
    expect((await post({ file: zip(), mode: 'nope' })).status).toBe(400);
    expect((await post({ mode: 'preview' })).status).toBe(400);
    expect((await post({ file: strToU8('{"version":1}'), mode: 'preview' })).status).toBe(400);
  });

  it('refuses a ZIP over the size limit with 413', async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set([0x50, 0x4b, 0x03, 0x04]);
    expect((await post({ file: big, mode: 'preview' })).status).toBe(413);
  });

  it('refuses a ZIP whose manifest is not a BitBin export', async () => {
    const res = await post({ file: zip({ 'bitbin-export.json': strToU8('{"hello":"world"}') }), mode: 'preview' });
    expect(res.status).toBe(400);
  });

  it('previews what the ZIP holds without writing anything', async () => {
    const res = await post({ file: zip({ 'bitbin-export.json': strToU8(JSON.stringify(manifest)), 'files/a.txt': strToU8('x') }), mode: 'preview' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ totalItems: 1, collectionCount: 1, fileCount: 1 });
    expect(importLibrary).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });

  it('restores the files, then imports as a Pro account, counting dropped files as skipped', async () => {
    restore.mockImplementation(async (_userId: string, data: unknown) => ({ data, uploadedUrls: [], dropped: 2, firstError: 'x: bad' }));

    const res = await post({ file: zip(), mode: 'import', skipDuplicates: 'false' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(restore).toHaveBeenCalledWith('user-1', expect.objectContaining({ version: 1 }), expect.any(Map), false);
    expect(importLibrary).toHaveBeenCalledWith('user-1', true, expect.anything(), false);
    expect(body.data.itemsSkipped).toBe(2);
    expect(body.warning).toBe('x: bad');
  });

  it('deletes the files it stored when the import itself fails', async () => {
    importLibrary.mockRejectedValue(new Error('db down'));

    const res = await post({ file: zip(), mode: 'import' });

    expect(res.status).toBe(500);
    expect(deleteFromR2).toHaveBeenCalledWith('https://r2.example/user-1/1-a.txt');
    expect((await res.json()).error).not.toContain('db down');
  });
});

describe('POST /api/import with a ZIP sent in parts', () => {
  const UPLOAD_ID = '0f8b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f';
  const bytes = zipSync({ 'bitbin-export.json': strToU8(JSON.stringify(manifest)) });

  function postParts(mode: string, partCount = '2') {
    const form = new FormData();
    form.set('mode', mode);
    form.set('uploadId', UPLOAD_ID);
    form.set('partCount', partCount);
    return POST(new Request('http://localhost/api/import', { method: 'POST', body: form }));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(pro);
    checkRateLimit.mockResolvedValue({ success: true });
    restore.mockImplementation(async (_userId: string, data: unknown) => ({ data, uploadedUrls: [], dropped: 0, firstError: null }));
    importLibrary.mockResolvedValue({ itemsImported: 1, collectionsImported: 1, itemsSkipped: 0, collectionsSkipped: 0 });
    deleteKeys.mockResolvedValue(2);
    const half = Math.ceil(bytes.length / 2);
    getPart.mockImplementation(async (key: string) => ({
      body: key.endsWith('/0') ? bytes.subarray(0, half) : bytes.subarray(half),
      contentType: 'application/octet-stream',
    }));
  });

  it('previews from the parts in the user folder and keeps them for the import', async () => {
    const res = await postParts('preview');

    expect(res.status).toBe(200);
    expect(getPart).toHaveBeenCalledWith(`user-1/parts/${UPLOAD_ID}/0`);
    expect((await res.json()).data.totalItems).toBe(1);
    expect(deleteKeys).not.toHaveBeenCalled();
  });

  it('imports from the parts and deletes them', async () => {
    const res = await postParts('import');

    expect(res.status).toBe(200);
    expect(importLibrary).toHaveBeenCalled();
    expect(deleteKeys).toHaveBeenCalledWith([`user-1/parts/${UPLOAD_ID}/0`, `user-1/parts/${UPLOAD_ID}/1`]);
  });

  it('refuses an upload with a part missing', async () => {
    getPart.mockResolvedValueOnce(null);

    expect((await postParts('import')).status).toBe(400);
    expect(importLibrary).not.toHaveBeenCalled();
  });

  it('refuses a bad part count without reading storage', async () => {
    expect((await postParts('preview', '9')).status).toBe(400);
    expect(getPart).not.toHaveBeenCalled();
  });
});

