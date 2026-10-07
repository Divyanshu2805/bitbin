import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
  };
});

vi.mock('@/lib/ai-description', () => ({
  describeItemForUser: vi.fn(),
}));

import { POST } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';
import { describeItemForUser } from '@/lib/ai-description';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const mockDescribe = vi.mocked(describeItemForUser);

const apiUser = { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true as const, scopes: ['collections:read', 'items:write', 'ai'] as ('collections:read' | 'items:write' | 'ai')[] };

function post(body: unknown) {
  return new Request('http://localhost/api/v1/ai/description', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const input = { title: 'useMemo', content: 'const cached = useMemo(calc, deps)', typeName: 'snippet' };

describe('POST /api/v1/ai/description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
  });

  it('returns a description for the token owner', async () => {
    mockDescribe.mockResolvedValue({ success: true, data: 'Caches a computed value between renders.' });

    const res = await POST(post(input));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { description: 'Caches a computed value between renders.' } });
    expect(mockDescribe).toHaveBeenCalledWith('user-1', input);
  });

  it('stops at authentication', async () => {
    const { NextResponse } = await import('next/server');
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as never);

    const res = await POST(post(input));

    expect(res.status).toBe(401);
    expect(mockDescribe).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const res = await POST(new Request('http://localhost/api/v1/ai/description', { method: 'POST', body: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('maps validation failures to 400', async () => {
    mockDescribe.mockResolvedValue({ success: false, error: 'Validation failed' });
    const res = await POST(post({}));
    expect(res.status).toBe(400);
  });

  it('maps the AI rate limit to 429', async () => {
    mockDescribe.mockResolvedValue({ success: false, error: 'Too many AI requests. Please try again in 5 minutes.' });
    const res = await POST(post(input));
    expect(res.status).toBe(429);
  });

  it('maps model failures to 502', async () => {
    mockDescribe.mockResolvedValue({ success: false, error: 'Failed to generate description. Please try again.' });
    const res = await POST(post(input));
    expect(res.status).toBe(502);
  });
});
