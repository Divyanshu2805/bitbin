import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
  };
});

vi.mock('@/lib/ai-tags', () => ({
  suggestTagsForUser: vi.fn(),
}));

import { POST } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';
import { suggestTagsForUser } from '@/lib/ai-tags';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const mockSuggest = vi.mocked(suggestTagsForUser);

const apiUser = { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true as const };

function post(body: unknown) {
  return new Request('http://localhost/api/v1/ai/tags', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const input = { title: 'useAuth', content: 'const x = 1', typeName: 'snippet' };

describe('POST /api/v1/ai/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
  });

  it('returns tags for the token owner', async () => {
    mockSuggest.mockResolvedValue({ success: true, data: ['react', 'hooks'] });

    const res = await POST(post(input));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { tags: ['react', 'hooks'] } });
    expect(mockSuggest).toHaveBeenCalledWith('user-1', input);
  });

  it('maps validation failures to 400', async () => {
    mockSuggest.mockResolvedValue({ success: false, error: 'Validation failed' });
    const res = await POST(post({}));
    expect(res.status).toBe(400);
  });

  it('maps the AI rate limit to 429', async () => {
    mockSuggest.mockResolvedValue({ success: false, error: 'Too many AI requests. Please try again in 5 minutes.' });
    const res = await POST(post(input));
    expect(res.status).toBe(429);
  });

  it('maps model failures to 502', async () => {
    mockSuggest.mockResolvedValue({ success: false, error: 'Failed to generate tags. Please try again.' });
    const res = await POST(post(input));
    expect(res.status).toBe(502);
  });
});
