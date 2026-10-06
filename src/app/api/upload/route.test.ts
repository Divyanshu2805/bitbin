import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, upload, checkRateLimit, sanitize, scan } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upload: vi.fn(),
  checkRateLimit: vi.fn(),
  sanitize: vi.fn(),
  scan: vi.fn(),
}));
// The sanitizer and the malware check have their own tests; here only how the route uses them
vi.mock('@/lib/image-sanitize', () => ({ sanitizeImage: sanitize }));
vi.mock('@/lib/virus-check', () => ({ checkKnownMalware: scan }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit,
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));
// Keep the real validators; only the network call is replaced
vi.mock('@/lib/r2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/r2')>()),
  uploadToR2: upload,
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
    scan.mockResolvedValue({ safe: true, checked: false });
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

  it('refuses a file flagged as known malware, and stores nothing', async () => {
    scan.mockResolvedValue({ safe: false, reason: 'This file was flagged as malware and cannot be uploaded.' });

    const res = await post({ file: png(), itemType: 'image' });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('malware');
    expect(upload).not.toHaveBeenCalled();
  });

  it('checks the processed bytes for malware, not the original upload', async () => {
    const cleaned = Buffer.from('cleaned');
    sanitize.mockResolvedValue({ ok: true, buffer: cleaned });

    await post({ file: png(), itemType: 'image' });

    expect(scan).toHaveBeenCalledWith(cleaned);
  });

  it('returns a generic 500 when storage fails', async () => {
    upload.mockRejectedValue(new Error('R2 key AKIA123 denied'));

    const res = await post({ file: png(), itemType: 'image' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('AKIA123');
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
