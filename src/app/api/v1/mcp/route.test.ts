import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number, headers?: HeadersInit) => NextResponse.json({ error }, { status, headers }),
  };
});
vi.mock('@/lib/mcp', () => ({
  handleMcpPayload: vi.fn(),
  MCP_PARSE_ERROR: { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
}));

import { GET, POST } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';
import { handleMcpPayload } from '@/lib/mcp';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const mockHandle = vi.mocked(handleMcpPayload);

const apiUser = { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true as const, scopes: ['items:read' as const] };

function post(body: unknown) {
  return new Request('http://localhost/api/v1/mcp', {
    method: 'POST',
    headers: { authorization: 'Bearer bb_x', 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/v1/mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
  });

  it('answers nothing without a valid token', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'Missing or malformed API token' }, { status: 401 }) });

    const res = await POST(post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));

    expect(res.status).toBe(401);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it('checks the token without asking for a scope: each tool asks for its own', async () => {
    mockHandle.mockResolvedValue({ jsonrpc: '2.0', id: 1, result: {} });
    const request = post({ jsonrpc: '2.0', id: 1, method: 'ping' });

    await POST(request);

    expect(mockAuthenticate).toHaveBeenCalledWith(request);
  });

  it("hands the message to the server as the token's owner and returns its answer", async () => {
    const message = { jsonrpc: '2.0', id: 7, method: 'tools/list' };
    mockHandle.mockResolvedValue({ jsonrpc: '2.0', id: 7, result: { tools: [] } });

    const res = await POST(post(message));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ jsonrpc: '2.0', id: 7, result: { tools: [] } });
    expect(mockHandle).toHaveBeenCalledWith(apiUser, message);
  });

  it('acknowledges a notification with 202 and no body', async () => {
    mockHandle.mockResolvedValue(null);

    const res = await POST(post({ jsonrpc: '2.0', method: 'notifications/initialized' }));

    expect(res.status).toBe(202);
    expect(await res.text()).toBe('');
  });

  it('answers a body that is not JSON with a parse error', async () => {
    const res = await POST(post('{not json'));

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe(-32700);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it('returns a generic 500 when something unexpected fails', async () => {
    mockHandle.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(post({ jsonrpc: '2.0', id: 1, method: 'ping' }));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.5');
  });
});

describe('GET /api/v1/mcp', () => {
  it('offers no event stream', async () => {
    const res = GET();

    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });
});
