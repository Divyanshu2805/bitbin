import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, upload, checkRateLimit, sanitize, getPart, deleteKeys } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upload: vi.fn(),
  checkRateLimit: vi.fn(),
  sanitize: vi.fn(),
  getPart: vi.fn(),
  deleteKeys: vi.fn(),
}));
// The sanitizer has its own tests; here only how the route uses it
vi.mock('@/lib/image-sanitize', () => ({ sanitizeImage: sanitize }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit,
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));
// Keep the real validators; only the network call is replaced
vi.mock('@/lib/r2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/r2')>()),
  uploadToR2: upload,
  getFromR2: getPart,
  deleteR2Keys: deleteKeys,
}));

import { POST } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const session: Session = { user: { id: 'user-1', email: 'u@example.com', isPro: true }, expires: '' };

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function post(fields: { file?: File; itemType?: string }) {
  const form = new FormData();
  if (fields.file) form.set('file', fields.file);
  if (fields.itemType) form.set('itemType', fields.itemType);
  return POST(new Request('http://localhost/api/upload', { method: 'POST', body: form }));
}
const png = (name = 'logo.png') => new File([PNG], name, { type: 'image/png' });

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue({ isPro: true });
    checkRateLimit.mockResolvedValue({ success: true });
    upload.mockResolvedValue({ fileUrl: 'https://r2.example/user-1/abc.png' });
    sanitize.mockImplementation(async (buffer: Buffer) => ({ ok: true, buffer }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await post({ file: png(), itemType: 'image' })).status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });

  it('returns 403 for a Free user, checked on the server', async () => {
    findUnique.mockResolvedValue({ isPro: false });

    const res = await post({ file: png(), itemType: 'image' });

    expect(res.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });

  it('returns 429 when the upload limit is hit', async () => {
    checkRateLimit.mockResolvedValue({ success: false, retryAfter: 60 });

    expect((await post({ file: png(), itemType: 'image' })).status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith('upload', 'user-1');
    expect(upload).not.toHaveBeenCalled();
  });

  it('requires a file', async () => {
    expect((await post({ itemType: 'image' })).status).toBe(400);
  });

  it.each([['missing', undefined], ['unknown', 'video']])('rejects a %s item type', async (_n, itemType) => {
    expect((await post({ file: png(), itemType })).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects a disallowed extension', async () => {
    const exe = new File([PNG], 'malware.exe', { type: 'application/octet-stream' });
    expect((await post({ file: exe, itemType: 'file' })).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects bytes that do not match the extension', async () => {
    const fake = new File(['<script>alert(1)</script>'], 'photo.png', { type: 'image/png' });

    const res = await post({ file: fake, itemType: 'image' });

    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects a client content type that does not match an image', async () => {
    const res = await post({ file: new File([PNG], 'logo.png', { type: 'text/html' }), itemType: 'image' });

    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads under the session user with a content type from the extension', async () => {
    const res = await post({ file: png(), itemType: 'image' });

    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledWith(expect.any(Buffer), 'logo.png', 'image/png', 'user-1');
    expect((await res.json()).data).toEqual({
      fileUrl: 'https://r2.example/user-1/abc.png',
      fileName: 'logo.png',
      fileSize: PNG.length,
    });
  });

  it('stores the sanitized bytes, and reports their size, not the original', async () => {
    const cleaned = Buffer.from('cleaned-image-bytes');
    sanitize.mockResolvedValue({ ok: true, buffer: cleaned });

    const res = await post({ file: png(), itemType: 'image' });

    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledWith(cleaned, 'logo.png', 'image/png', 'user-1');
    expect((await res.json()).data.fileSize).toBe(cleaned.length);
  });

  it('refuses an image that cannot be decoded, and stores nothing', async () => {
    sanitize.mockResolvedValue({ ok: false, error: 'Could not read this image.' });

    const res = await post({ file: png(), itemType: 'image' });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Could not read');
    expect(upload).not.toHaveBeenCalled();
  });

  it('stores the processed bytes, not the original upload', async () => {
    const cleaned = Buffer.from('cleaned');
    sanitize.mockResolvedValue({ ok: true, buffer: cleaned });

    await post({ file: png(), itemType: 'image' });

    expect(upload.mock.calls[0][0]).toBe(cleaned);
  });

  it('returns a generic 500 when storage fails', async () => {
    upload.mockRejectedValue(new Error('R2 key AKIA123 denied'));

    const res = await post({ file: png(), itemType: 'image' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('AKIA123');
  });
});

describe('POST /api/upload, putting a large file together from its parts', () => {
  const UPLOAD_ID = '0f8b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f';
  const PDF = Buffer.from('%PDF-1.7 a document that arrived in parts');

  function finish(fields: Record<string, string>) {
    const form = new FormData();
    form.set('itemType', 'file');
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return POST(new Request('http://localhost/api/upload', { method: 'POST', body: form }));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue({ isPro: true });
    checkRateLimit.mockResolvedValue({ success: true });
    upload.mockResolvedValue({ fileUrl: 'https://r2.example/user-1/1-report.pdf' });
    sanitize.mockImplementation(async (buffer: Buffer) => ({ ok: true, buffer }));
    deleteKeys.mockResolvedValue(2);
    getPart.mockImplementation(async (key: string) => {
      const index = Number(key.split('/').pop());
      return { body: index === 0 ? PDF.subarray(0, 10) : PDF.subarray(10), contentType: 'application/octet-stream' };
    });
  });

  it('joins the caller\'s own parts in order, checks the result like any upload, and deletes the parts', async () => {
    const res = await finish({ uploadId: UPLOAD_ID, partCount: '2', fileName: 'report.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(getPart).toHaveBeenNthCalledWith(1, `user-1/parts/${UPLOAD_ID}/0`);
    expect(getPart).toHaveBeenNthCalledWith(2, `user-1/parts/${UPLOAD_ID}/1`);
    expect(upload).toHaveBeenCalledWith(PDF, 'report.pdf', 'application/pdf', 'user-1');
    expect(deleteKeys).toHaveBeenCalledWith([`user-1/parts/${UPLOAD_ID}/0`, `user-1/parts/${UPLOAD_ID}/1`]);
  });

  it('refuses an upload with a part missing, and cleans up', async () => {
    getPart.mockResolvedValueOnce(null);

    const res = await finish({ uploadId: UPLOAD_ID, partCount: '2', fileName: 'report.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
    expect(deleteKeys).toHaveBeenCalled();
  });

  it('refuses parts that add up to more than the type allows', async () => {
    getPart.mockResolvedValue({ body: new Uint8Array(4 * 1024 * 1024), contentType: 'application/octet-stream' });

    const res = await finish({ uploadId: UPLOAD_ID, partCount: '3', fileName: 'big.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('10 MB');
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses a bad upload id, part count or file name without reading storage', async () => {
    expect((await finish({ uploadId: '../user-2/x', partCount: '1', fileName: 'a.pdf' })).status).toBe(400);
    expect((await finish({ uploadId: UPLOAD_ID, partCount: '6', fileName: 'a.pdf' })).status).toBe(400);
    expect((await finish({ uploadId: UPLOAD_ID, partCount: '1' })).status).toBe(400);
    expect(getPart).not.toHaveBeenCalled();
  });

  it('still refuses bytes that fail the upload checks once joined', async () => {
    getPart.mockResolvedValue({ body: new TextEncoder().encode('not a pdf'), contentType: 'application/octet-stream' });

    const res = await finish({ uploadId: UPLOAD_ID, partCount: '1', fileName: 'fake.pdf', mimeType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
    expect(deleteKeys).toHaveBeenCalledWith([`user-1/parts/${UPLOAD_ID}/0`]);
  });
});

describe('POST /api/upload from another site', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is refused before anything is read or stored', async () => {
    const form = new FormData();
    form.set('file', png());
    form.set('itemType', 'image');

    const res = await POST(
      new Request('http://localhost/api/upload', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' }, body: form })
    );

    expect(res.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });
});
