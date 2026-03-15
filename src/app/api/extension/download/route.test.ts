import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/extension-package', () => ({
  buildExtensionZip: vi.fn(),
  getExtensionVersion: vi.fn(),
}));

import { GET } from './route';
import { auth } from '@/auth';
import { buildExtensionZip, getExtensionVersion } from '@/lib/extension-package';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockBuild = vi.mocked(buildExtensionZip);
const mockVersion = vi.mocked(getExtensionVersion);

function signIn(isPro: boolean) {
  mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro }, expires: new Date().toISOString() });
}

describe('GET /api/extension/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuild.mockResolvedValue(new Uint8Array([0x50, 0x4b, 1, 2]));
    mockVersion.mockResolvedValue('1.2.3');
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('returns 403 for Free users', async () => {
    signIn(false);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('returns the zip for Pro users', async () => {
    signIn(true);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="bitbin-extension-1.2.3.zip"');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0x50, 0x4b, 1, 2]));
    // Tests don't run in production, so the localhost option stays
    expect(mockBuild).toHaveBeenCalledWith({ includeLocalhost: true });
  });

  it('returns a generic 500 when packaging fails', async () => {
    signIn(true);
    mockBuild.mockRejectedValue(new Error('ENOENT'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An error occurred while preparing the extension' });
  });
});
