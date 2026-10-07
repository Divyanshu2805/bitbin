import { describe, it, expect, vi, beforeEach } from 'vitest';

const { upload, sanitize, scan } = vi.hoisted(() => ({ upload: vi.fn(), sanitize: vi.fn(), scan: vi.fn() }));
vi.mock('@/lib/image-sanitize', () => ({ sanitizeImage: sanitize }));
vi.mock('@/lib/virus-check', () => ({ checkKnownMalware: scan }));
// Keep the real validators; only the network call is replaced
vi.mock('@/lib/r2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/r2')>()),
  uploadToR2: upload,
}));

import { ingestFile } from './file-ingest';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('ingestFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ fileUrl: 'https://r2.example/user-1/1-logo.png', key: 'user-1/1-logo.png' });
    sanitize.mockImplementation(async (buffer: Buffer) => ({ ok: true, buffer }));
    scan.mockResolvedValue({ safe: true, checked: false });
  });

  it('stores a valid image under the user and reports the stored size', async () => {
    sanitize.mockResolvedValue({ ok: true, buffer: Buffer.alloc(4) });

    const result = await ingestFile({ userId: 'user-1', itemType: 'image', fileName: 'logo.png', bytes: PNG });

    expect(result).toEqual({ ok: true, fileUrl: 'https://r2.example/user-1/1-logo.png', fileName: 'logo.png', fileSize: 4 });
    expect(upload).toHaveBeenCalledWith(expect.any(Buffer), 'logo.png', 'image/png', 'user-1');
  });

  it('refuses a file whose extension is not allowed for the type, before anything is stored', async () => {
    const result = await ingestFile({ userId: 'user-1', itemType: 'image', fileName: 'run.exe', bytes: PNG });

    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses bytes that do not match the extension', async () => {
    const result = await ingestFile({ userId: 'user-1', itemType: 'image', fileName: 'fake.png', bytes: Buffer.from('not a png at all') });

    expect(result).toEqual({ ok: false, error: 'File contents do not match its extension' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses a file over the size limit for its type', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);

    const result = await ingestFile({ userId: 'user-1', itemType: 'image', fileName: 'big.png', bytes: big });

    expect(result.ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it('refuses what the image sanitizer or the malware lookup refuses', async () => {
    sanitize.mockResolvedValueOnce({ ok: false, error: 'Not a real image' });
    expect(await ingestFile({ userId: 'user-1', itemType: 'image', fileName: 'logo.png', bytes: PNG })).toEqual({
      ok: false,
      error: 'Not a real image',
    });

    scan.mockResolvedValueOnce({ safe: false, reason: 'Known malware' });
    expect(await ingestFile({ userId: 'user-1', itemType: 'image', fileName: 'logo.png', bytes: PNG })).toEqual({
      ok: false,
      error: 'Known malware',
    });
    expect(upload).not.toHaveBeenCalled();
  });
});
