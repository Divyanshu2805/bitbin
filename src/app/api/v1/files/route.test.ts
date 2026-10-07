import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number, headers?: HeadersInit) => NextResponse.json({ error }, { status, headers }),
  };
});

const { ingest, createItem, checkRateLimit, deleteFromR2 } = vi.hoisted(() => ({
  ingest: vi.fn(),
  createItem: vi.fn(),
  checkRateLimit: vi.fn(),
  deleteFromR2: vi.fn(),
}));
vi.mock('@/lib/file-ingest', () => ({ ingestFile: ingest }));
vi.mock('@/lib/item-create', () => ({ createItemForUser: createItem }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit, formatRetryTime: (s: number) => `${s} seconds` }));
vi.mock('@/lib/r2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/r2')>()),
  deleteFromR2,
}));

import { POST } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const apiUser = { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true as const, scopes: ['files:write' as const] };

function post(fields: Record<string, string | File>, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return POST(new Request('http://localhost/api/v1/files', { method: 'POST', headers: { authorization: 'Bearer bb_x', ...headers }, body: form }));
}
const pdf = (name = 'spec.pdf') => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: 'application/pdf' });

describe('POST /api/v1/files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
    checkRateLimit.mockResolvedValue({ success: true });
    ingest.mockResolvedValue({ ok: true, fileUrl: 'https://r2.example/user-1/1-spec.pdf', fileName: 'spec.pdf', fileSize: 4 });
    createItem.mockResolvedValue({ success: true, data: { id: 'item-1', title: 'spec.pdf', itemType: { name: 'file' } } });
    deleteFromR2.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('asks for the files:write scope and returns the auth failure as-is', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'nope' }, { status: 403 }) });

    const res = await post({ file: pdf(), itemType: 'file' });

    expect(res.status).toBe(403);
    expect(mockAuthenticate).toHaveBeenCalledWith(expect.anything(), 'files:write');
    expect(ingest).not.toHaveBeenCalled();
  });

  it('is rate limited like a web upload', async () => {
    checkRateLimit.mockResolvedValue({ success: false, retryAfter: 90 });

    const res = await post({ file: pdf(), itemType: 'file' });

    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('90');
    expect(checkRateLimit).toHaveBeenCalledWith('upload', 'user-1');
    expect(ingest).not.toHaveBeenCalled();
  });

  it('rejects a missing file, a bad itemType and a body that is not a form', async () => {
    expect((await post({ itemType: 'file' })).status).toBe(400);
    expect((await post({ file: pdf(), itemType: 'note' })).status).toBe(400);
    const notForm = await POST(new Request('http://localhost/api/v1/files', { method: 'POST', headers: { authorization: 'Bearer bb_x', 'content-type': 'application/json' }, body: '{}' }));
    expect(notForm.status).toBe(400);
  });

  it('refuses an oversized body before reading it', async () => {
    const res = await post({ file: pdf(), itemType: 'file' }, { 'content-length': String(50 * 1024 * 1024) });
    expect(res.status).toBe(413);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('answers 400 with the reason when the file fails the upload checks', async () => {
    ingest.mockResolvedValue({ ok: false, error: 'File contents do not match its extension' });

    const res = await post({ file: pdf(), itemType: 'file' });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('File contents do not match its extension');
    expect(createItem).not.toHaveBeenCalled();
  });

  it('stores the file under the token\'s user and creates the item from the stored reference', async () => {
    const res = await post({ file: pdf(), itemType: 'file', title: ' Spec ', tags: 'a, b,,', collectionId: 'col-1', description: 'The spec' });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { id: 'item-1', title: 'spec.pdf', typeName: 'file' } });
    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', itemType: 'file', fileName: 'spec.pdf' }));
    expect(createItem).toHaveBeenCalledWith('user-1', true, {
      typeName: 'file',
      title: 'Spec',
      description: 'The spec',
      tags: ['a', 'b'],
      collectionIds: ['col-1'],
      fileUrl: 'https://r2.example/user-1/1-spec.pdf',
      fileName: 'spec.pdf',
      fileSize: 4,
    });
  });

  it('titles the item after the file when no title is given', async () => {
    await post({ file: pdf(), itemType: 'file' });
    expect(createItem).toHaveBeenCalledWith('user-1', true, expect.objectContaining({ title: 'spec.pdf', collectionIds: [], tags: [] }));
  });

  it('deletes the stored file when the item can not be created', async () => {
    createItem.mockResolvedValue({ success: false, error: 'You have reached the free tier limit of 50 items.' });

    const res = await post({ file: pdf(), itemType: 'file' });

    expect(res.status).toBe(500);
    expect(deleteFromR2).toHaveBeenCalledWith('https://r2.example/user-1/1-spec.pdf');
  });

  it('passes field errors on as a 400', async () => {
    createItem.mockResolvedValue({ success: false, error: 'Validation failed', fieldErrors: { title: ['Title is required'] } });

    const res = await post({ file: pdf(), itemType: 'file' });

    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors).toEqual({ title: ['Title is required'] });
    expect(deleteFromR2).toHaveBeenCalled();
  });

  it('hides an unexpected failure behind a generic message', async () => {
    ingest.mockRejectedValue(new Error('R2 credentials not configured'));

    const res = await post({ file: pdf(), itemType: 'file' });

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('An error occurred while saving the file');
  });
});
