import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/collections', () => ({ getUserCollections: vi.fn(), createCollection: vi.fn() }));
vi.mock('@/lib/db/items', () => ({
  getItemById: vi.fn(),
  createItem: vi.fn(),
  VALID_ITEM_TYPES: ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const,
}));
vi.mock('@/lib/db/search', () => ({
  searchItems: vi.fn(),
  getRecentSearchableItems: vi.fn(),
  MAX_SEARCH_LENGTH: 100,
}));
vi.mock('@/lib/item-create', () => ({ createItemForUser: vi.fn() }));
vi.mock('@/lib/collection-create', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/collection-create')>()),
  createCollectionForUser: vi.fn(),
}));
vi.mock('@/lib/usage', () => ({ canCreateCollection: vi.fn(), MAX_COLLECTIONS: 3 }));

import { handleMcpPayload, MCP_PROTOCOL_VERSIONS, type RpcResponse } from './mcp';
import type { ApiUser } from '@/lib/api-auth';
import type { ApiScope } from '@/lib/api-scopes';
import { getUserCollections } from '@/lib/db/collections';
import { getItemById, type ItemDetail } from '@/lib/db/items';
import { getRecentSearchableItems, searchItems } from '@/lib/db/search';
import { createItemForUser } from '@/lib/item-create';
import { createCollectionForUser } from '@/lib/collection-create';

const mockCollections = vi.mocked(getUserCollections);
const mockGetItem = vi.mocked(getItemById);
const mockSearch = vi.mocked(searchItems);
const mockRecent = vi.mocked(getRecentSearchableItems);
const mockCreateItem = vi.mocked(createItemForUser);
const mockCreateCollection = vi.mocked(createCollectionForUser);

const ALL: ApiScope[] = ['collections:read', 'items:read', 'items:write', 'files:write', 'ai'];
const userWith = (scopes: ApiScope[] = ALL): ApiUser => ({ id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true, scopes });

const rpc = (method: string, params?: unknown, id: number | string = 1) => ({ jsonrpc: '2.0', id, method, params });
const call = (name: string, args?: unknown, user = userWith()) =>
  handleMcpPayload(user, rpc('tools/call', { name, arguments: args })) as Promise<RpcResponse>;

/** The tool's text answer, parsed when it is JSON. */
function toolText(reply: RpcResponse): { text: string; isError: boolean } {
  const result = reply.result as { content: { text: string }[]; isError?: boolean };
  return { text: result.content[0].text, isError: result.isError === true };
}

const detail: ItemDetail = {
  id: 'item-1',
  title: 'Tail pod logs',
  description: null,
  content: 'kubectl logs -f deploy/api',
  url: null,
  language: 'bash',
  contentType: 'TEXT',
  fileUrl: 'https://files.example/user-1/secret.png',
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  itemType: { name: 'command', icon: 'Terminal', color: '#f97316' },
  tags: ['k8s'],
  collections: [{ id: 'c1', name: 'Infra' }],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

describe('handleMcpPayload', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('the protocol', () => {
    it('answers initialize with the version asked for, the tools capability and instructions', async () => {
      const reply = (await handleMcpPayload(userWith(), rpc('initialize', { protocolVersion: '2025-03-26' }))) as RpcResponse;

      expect(reply).toMatchObject({ jsonrpc: '2.0', id: 1 });
      expect(reply.result).toMatchObject({
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'bitbin' },
      });
      expect((reply.result as { instructions: string }).instructions).toContain('BitBin');
    });

    it('offers its newest version to a client that asks for one it does not know', async () => {
      const reply = (await handleMcpPayload(userWith(), rpc('initialize', { protocolVersion: '1999-01-01' }))) as RpcResponse;

      expect((reply.result as { protocolVersion: string }).protocolVersion).toBe(MCP_PROTOCOL_VERSIONS[0]);
    });

    it('answers ping', async () => {
      expect(await handleMcpPayload(userWith(), rpc('ping', undefined, 'p1'))).toEqual({ jsonrpc: '2.0', id: 'p1', result: {} });
    });

    it('sends nothing back for a notification', async () => {
      expect(await handleMcpPayload(userWith(), { jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    });

    it('reports an unknown method', async () => {
      const reply = (await handleMcpPayload(userWith(), rpc('resources/list'))) as RpcResponse;

      expect(reply.error).toEqual({ code: -32601, message: 'Method not found: resources/list' });
    });

    it.each([null, 'hello', 42, { id: 1, method: 'ping' }, { jsonrpc: '2.0', id: 1 }])('rejects a malformed message: %j', async (message) => {
      const reply = (await handleMcpPayload(userWith(), message)) as RpcResponse;

      expect(reply.error?.code).toBe(-32600);
    });

    it('answers each request in a batch and skips its notifications', async () => {
      const replies = (await handleMcpPayload(userWith(), [
        rpc('ping', undefined, 1),
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        rpc('ping', undefined, 2),
      ])) as RpcResponse[];

      expect(replies.map((r) => r.id)).toEqual([1, 2]);
    });

    it('sends nothing back for a batch of notifications only', async () => {
      expect(await handleMcpPayload(userWith(), [{ jsonrpc: '2.0', method: 'notifications/initialized' }])).toBeNull();
    });

    it('rejects an empty batch and one that is too long', async () => {
      const empty = (await handleMcpPayload(userWith(), [])) as RpcResponse;
      const long = (await handleMcpPayload(userWith(), Array.from({ length: 21 }, (_, i) => rpc('ping', undefined, i)))) as RpcResponse;

      expect(empty.error?.code).toBe(-32600);
      expect(long.error?.code).toBe(-32600);
    });
  });

  describe('tools/list', () => {
    const names = async (scopes: ApiScope[]) => {
      const reply = (await handleMcpPayload(userWith(scopes), rpc('tools/list'))) as RpcResponse;
      return (reply.result as { tools: { name: string }[] }).tools.map((tool) => tool.name);
    };

    it('lists every tool for a token with every permission', async () => {
      expect(await names(ALL)).toEqual(['search_items', 'get_item', 'list_collections', 'save_item']);
    });

    it('shows a read-only token only the tools that read', async () => {
      expect(await names(['items:read'])).toEqual(['search_items', 'get_item']);
    });

    it('shows a token with no permissions nothing', async () => {
      expect(await names([])).toEqual([]);
    });

    it('marks which tools change nothing', async () => {
      const reply = (await handleMcpPayload(userWith(), rpc('tools/list'))) as RpcResponse;
      const tools = (reply.result as { tools: { name: string; annotations: { readOnlyHint: boolean } }[] }).tools;

      expect(tools.filter((tool) => !tool.annotations.readOnlyHint).map((tool) => tool.name)).toEqual(['save_item']);
    });
  });

  describe('tools/call', () => {
    it('reports an unknown tool as a protocol error', async () => {
      const reply = await call('delete_everything');

      expect(reply.error).toEqual({ code: -32602, message: 'Unknown tool: delete_everything' });
    });

    it('refuses a tool the token has no permission for, without running it', async () => {
      const reply = await call('save_item', { type: 'note', title: 'x' }, userWith(['items:read']));

      const { text, isError } = toolText(reply);
      expect(isError).toBe(true);
      expect(text).toContain('"Save items" permission');
      expect(mockCreateItem).not.toHaveBeenCalled();
    });

    it('hides what went wrong when a tool throws', async () => {
      mockCollections.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const { text, isError } = toolText(await call('list_collections'));

      expect(isError).toBe(true);
      expect(text).not.toContain('10.0.0.5');
    });

    describe('search_items', () => {
      it("searches the token owner's items and returns summaries", async () => {
        mockSearch.mockResolvedValue([
          { id: 'item-1', title: 'Tail pod logs', typeName: 'command', typeIcon: 'Terminal', typeColor: '#f97316', contentPreview: 'kubectl logs', tags: ['k8s'] },
        ]);

        const { text, isError } = toolText(await call('search_items', { query: 'kubectl', limit: 5 }));

        expect(isError).toBe(false);
        expect(mockSearch).toHaveBeenCalledWith('user-1', 'kubectl', 5);
        expect(JSON.parse(text)).toEqual({
          items: [{ id: 'item-1', title: 'Tail pod logs', typeName: 'command', preview: 'kubectl logs', tags: ['k8s'] }],
        });
      });

      it('lists the most recent items when no query is given', async () => {
        mockRecent.mockResolvedValue([]);

        await call('search_items');

        expect(mockRecent).toHaveBeenCalledWith('user-1', 10);
        expect(mockSearch).not.toHaveBeenCalled();
      });

      it('keeps the number of results within bounds', async () => {
        mockSearch.mockResolvedValue([]);

        await call('search_items', { query: 'a', limit: 5000 });

        expect(mockSearch).toHaveBeenCalledWith('user-1', 'a', 20);
      });

      it('rejects arguments of the wrong type', async () => {
        const { isError } = toolText(await call('search_items', { query: 12 }));

        expect(isError).toBe(true);
        expect(mockSearch).not.toHaveBeenCalled();
      });
    });

    describe('get_item', () => {
      it('returns the item in full, without the address of its stored file', async () => {
        mockGetItem.mockResolvedValue(detail);

        const { text } = toolText(await call('get_item', { id: 'item-1' }));

        expect(mockGetItem).toHaveBeenCalledWith('user-1', 'item-1');
        expect(JSON.parse(text)).toMatchObject({ id: 'item-1', typeName: 'command', content: 'kubectl logs -f deploy/api', collections: [{ id: 'c1', name: 'Infra' }] });
        expect(text).not.toContain('files.example');
      });

      it("reports someone else's item, or a missing one, as not found", async () => {
        mockGetItem.mockResolvedValue(null);

        const { text, isError } = toolText(await call('get_item', { id: 'other' }));

        expect(isError).toBe(true);
        expect(text).toBe('Item not found.');
      });

      it('needs an id', async () => {
        const { isError } = toolText(await call('get_item', {}));

        expect(isError).toBe(true);
        expect(mockGetItem).not.toHaveBeenCalled();
      });
    });

    describe('list_collections', () => {
      it("lists the token owner's collections", async () => {
        mockCollections.mockResolvedValue([{ id: 'c1', name: 'Infra' }]);

        const { text } = toolText(await call('list_collections'));

        expect(mockCollections).toHaveBeenCalledWith('user-1');
        expect(JSON.parse(text)).toEqual({ collections: [{ id: 'c1', name: 'Infra' }] });
      });
    });

    describe('save_item', () => {
      const saved = { success: true as const, data: { ...detail, id: 'new-1' } };

      it('saves through the shared item creation, filed into a collection found by name', async () => {
        mockCollections.mockResolvedValue([{ id: 'c1', name: 'Infra' }]);
        mockCreateItem.mockResolvedValue(saved);

        const { text, isError } = toolText(
          await call('save_item', { type: 'command', title: 'Tail pod logs', content: 'kubectl logs -f deploy/api', tags: ['k8s'], collection: 'infra' })
        );

        expect(isError).toBe(false);
        expect(mockCreateItem).toHaveBeenCalledWith('user-1', true, {
          typeName: 'command',
          title: 'Tail pod logs',
          description: undefined,
          content: 'kubectl logs -f deploy/api',
          url: undefined,
          language: undefined,
          tags: ['k8s'],
          collectionIds: ['c1'],
        });
        expect(mockCreateCollection).not.toHaveBeenCalled();
        expect(JSON.parse(text)).toMatchObject({ saved: true, id: 'new-1', collection: { name: 'Infra', created: false } });
      });

      it('makes the collection when there is none by that name', async () => {
        mockCollections.mockResolvedValue([]);
        mockCreateCollection.mockResolvedValue({ success: true, data: { id: 'c9', name: 'Infra' } } as never);
        mockCreateItem.mockResolvedValue(saved);

        const { text } = toolText(await call('save_item', { type: 'note', title: 'x', collection: ' Infra ' }));

        expect(mockCreateCollection).toHaveBeenCalledWith('user-1', true, { name: 'Infra', description: null });
        expect(mockCreateItem).toHaveBeenCalledWith('user-1', true, expect.objectContaining({ collectionIds: ['c9'] }));
        expect(JSON.parse(text).collection).toEqual({ name: 'Infra', created: true });
      });

      it('saves without a collection when none is named', async () => {
        mockCreateItem.mockResolvedValue(saved);

        const { text } = toolText(await call('save_item', { type: 'note', title: 'x' }));

        expect(mockCollections).not.toHaveBeenCalled();
        expect(mockCreateItem).toHaveBeenCalledWith('user-1', true, expect.objectContaining({ collectionIds: [], tags: [] }));
        expect(JSON.parse(text).collection).toBeNull();
      });

      it('does not save when the collection cannot be made', async () => {
        mockCollections.mockResolvedValue([]);
        mockCreateCollection.mockResolvedValue({ success: false, error: 'Failed to create collection' });

        const { text, isError } = toolText(await call('save_item', { type: 'note', title: 'x', collection: 'Infra' }));

        expect(isError).toBe(true);
        expect(text).toBe('Failed to create collection');
        expect(mockCreateItem).not.toHaveBeenCalled();
      });

      it('refuses a collection name that is too long', async () => {
        const { isError } = toolText(await call('save_item', { type: 'note', title: 'x', collection: 'c'.repeat(101) }));

        expect(isError).toBe(true);
        expect(mockCollections).not.toHaveBeenCalled();
      });

      it('refuses a type that needs an upload', async () => {
        const { isError } = toolText(await call('save_item', { type: 'file', title: 'x' }));

        expect(isError).toBe(true);
        expect(mockCreateItem).not.toHaveBeenCalled();
      });

      it("passes on the item's validation errors", async () => {
        mockCreateItem.mockResolvedValue({ success: false, error: 'Validation failed', fieldErrors: { title: ['Title is required'] } });

        const { text, isError } = toolText(await call('save_item', { type: 'note', title: '' }));

        expect(isError).toBe(true);
        expect(text).toBe('title: Title is required');
      });

      it('passes on a failure that has no field errors', async () => {
        mockCreateItem.mockResolvedValue({ success: false, error: 'Failed to create item' });

        const { text } = toolText(await call('save_item', { type: 'note', title: 'x' }));

        expect(text).toBe('Failed to create item');
      });
    });
  });
});
