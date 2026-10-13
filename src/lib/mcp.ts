import { z } from 'zod';
import type { ApiUser } from '@/lib/api-auth';
import { API_SCOPE_INFO, type ApiScope } from '@/lib/api-scopes';
import { API_SEARCH_MAX, clampSearchLimit, searchApiItems, toApiItem } from '@/lib/api-item';
import { createCollectionForUser, createCollectionSchema } from '@/lib/collection-create';
import { getUserCollections } from '@/lib/db/collections';
import { getItemById } from '@/lib/db/items';
import { MAX_SEARCH_LENGTH } from '@/lib/db/search';
import { createItemForUser } from '@/lib/item-create';

/**
 * BitBin as a Model Context Protocol server, so an assistant such as Claude can search the bin,
 * read an item and save a new one. `POST /api/v1/mcp` authenticates the token and hands each
 * JSON-RPC message here; everything a tool does goes through the same library code as the rest
 * of the token API, scoped to the token's owner and limited to the token's permissions.
 *
 * The transport is MCP's Streamable HTTP in its simplest form: one request, one JSON answer, no
 * sessions and no server-sent stream, which is all a set of request/response tools needs.
 */

/** Protocol revisions this server speaks, newest first */
export const MCP_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const SERVER_INFO = { name: 'bitbin', title: 'BitBin', version: '1.0.0' };

const INSTRUCTIONS =
  "BitBin is the user's personal store of code snippets, prompts, shell commands, notes and links. " +
  'Search it before writing something the user may already have saved, and save things worth keeping ' +
  'when the user asks. Give every saved item a short, specific title and a few lowercase tags.';

// JSON-RPC 2.0 error codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

type RpcId = string | number | null;

export interface RpcResponse {
  jsonrpc: '2.0';
  id: RpcId;
  result?: unknown;
  error?: { code: number; message: string };
}

interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

interface Tool {
  name: string;
  title: string;
  description: string;
  /** The permission the token needs; a token without it never sees the tool */
  scope: ApiScope;
  inputSchema: Record<string, unknown>;
  /** A hint for the client: true for tools that change nothing */
  readOnly: boolean;
  run: (user: ApiUser, args: unknown) => Promise<ToolResult>;
}

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true });

/** "title: Title is required; url: Invalid URL", from a Zod error or an action's fieldErrors */
function describeFieldErrors(fieldErrors: Record<string, string[] | undefined>): string {
  return Object.entries(fieldErrors)
    .filter(([, messages]) => messages?.length)
    .map(([field, messages]) => `${field}: ${messages!.join(', ')}`)
    .join('; ');
}

function describeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
}

const SAVE_TYPES = ['snippet', 'prompt', 'command', 'note', 'link'] as const;

const searchInput = z.object({
  query: z.string().max(MAX_SEARCH_LENGTH * 4).optional().default(''),
  limit: z.number().int().optional(),
});

const getInput = z.object({ id: z.string().trim().min(1, 'id is required').max(64) });

const saveInput = z.object({
  type: z.enum(SAVE_TYPES),
  title: z.string(),
  content: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collection: z.string().optional(),
});

/**
 * The id of the caller's collection called `name` (case-insensitive), made if there is none:
 * saving "under Infra" should work whether or not Infra exists yet.
 */
async function resolveCollection(user: ApiUser, name: string): Promise<{ id: string; name: string; created: boolean } | { error: string }> {
  const parsed = createCollectionSchema.safeParse({ name });
  if (!parsed.success) return { error: describeZodError(parsed.error) };

  const wanted = parsed.data.name.toLowerCase();
  const existing = (await getUserCollections(user.id)).find((c) => c.name.toLowerCase() === wanted);
  if (existing) return { id: existing.id, name: existing.name, created: false };

  const created = await createCollectionForUser(user.id, user.isPro, parsed.data);
  if (!created.success) return { error: created.error };
  return { id: created.data.id, name: created.data.name, created: true };
}

const TOOLS: Tool[] = [
  {
    name: 'search_items',
    title: 'Search the bin',
    description:
      "Search the user's BitBin for saved snippets, prompts, commands, notes, links, files and images. " +
      'Matches titles, content, descriptions, URLs and tags; "#react" searches tags only. ' +
      'With no query it returns the most recently edited items. Results are summaries: call get_item for the full content.',
    scope: 'items:read',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for. Leave out for the most recent items.' },
        limit: { type: 'integer', minimum: 1, maximum: API_SEARCH_MAX, description: 'How many results (default 10).' },
      },
    },
    async run(user, args) {
      const parsed = searchInput.safeParse(args ?? {});
      if (!parsed.success) return fail(describeZodError(parsed.error));
      const items = await searchApiItems(user.id, parsed.data.query, clampSearchLimit(parsed.data.limit));
      return ok({ items });
    },
  },
  {
    name: 'get_item',
    title: 'Read an item',
    description: 'The full content of one BitBin item by id (from search_items): its text or URL, description, language, tags and collections.',
    scope: 'items:read',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'The item id.' } },
      required: ['id'],
    },
    async run(user, args) {
      const parsed = getInput.safeParse(args ?? {});
      if (!parsed.success) return fail(describeZodError(parsed.error));
      const item = await getItemById(user.id, parsed.data.id);
      if (!item) return fail('Item not found.');
      return ok(toApiItem(item));
    },
  },
  {
    name: 'list_collections',
    title: 'List collections',
    description: "The names and ids of the user's BitBin collections (named groups of items).",
    scope: 'collections:read',
    readOnly: true,
    inputSchema: { type: 'object', properties: {} },
    async run(user) {
      return ok({ collections: await getUserCollections(user.id) });
    },
  },
  {
    name: 'save_item',
    title: 'Save an item',
    description:
      "Save a new item to the user's BitBin. Use type \"snippet\" for code, \"command\" for shell commands, " +
      '"prompt" for AI prompts, "note" for Markdown notes and "link" for a URL. ' +
      'Pass `collection` as a collection name to file it there; a collection that does not exist yet is created.',
    scope: 'items:write',
    readOnly: false,
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: [...SAVE_TYPES] },
        title: { type: 'string', description: 'Short and specific, at most 200 characters.' },
        content: { type: 'string', description: 'The code, command, prompt or note. Not used for links.' },
        url: { type: 'string', description: 'Required for type "link".' },
        description: { type: 'string', description: 'Optional: what it is and when to reach for it.' },
        language: { type: 'string', description: 'Optional, for snippets and commands, e.g. "typescript" or "bash". Detected when left out.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'A few lowercase tags.' },
        collection: { type: 'string', description: 'Optional collection name.' },
      },
      required: ['type', 'title'],
    },
    async run(user, args) {
      const parsed = saveInput.safeParse(args ?? {});
      if (!parsed.success) return fail(describeZodError(parsed.error));
      const input = parsed.data;

      let collection: { id: string; name: string; created: boolean } | null = null;
      if (input.collection?.trim()) {
        const resolved = await resolveCollection(user, input.collection);
        if ('error' in resolved) return fail(resolved.error);
        collection = resolved;
      }

      const result = await createItemForUser(user.id, user.isPro, {
        typeName: input.type,
        title: input.title,
        description: input.description,
        content: input.content,
        url: input.url,
        language: input.language,
        tags: input.tags ?? [],
        collectionIds: collection ? [collection.id] : [],
      });
      if (!result.success || !result.data) {
        const details = result.fieldErrors ? describeFieldErrors(result.fieldErrors) : '';
        return fail(details || result.error || 'The item could not be saved.');
      }

      return ok({
        saved: true,
        id: result.data.id,
        title: result.data.title,
        typeName: result.data.itemType.name,
        tags: result.data.tags,
        collection: collection ? { name: collection.name, created: collection.created } : null,
      });
    },
  },
];

/** The tools this token may use, as `tools/list` describes them. */
function toolsFor(user: ApiUser) {
  return TOOLS.filter((tool) => user.scopes.includes(tool.scope)).map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { title: tool.title, readOnlyHint: tool.readOnly, destructiveHint: false, openWorldHint: false },
  }));
}

async function callTool(user: ApiUser, params: unknown): Promise<ToolResult | { rpcError: string }> {
  const { name, arguments: args } = (params ?? {}) as { name?: unknown; arguments?: unknown };
  const tool = typeof name === 'string' ? TOOLS.find((t) => t.name === name) : undefined;
  if (!tool) return { rpcError: `Unknown tool: ${typeof name === 'string' ? name : ''}` };

  if (!user.scopes.includes(tool.scope)) {
    return fail(`This token isn't allowed to do that. Create a token with the "${API_SCOPE_INFO[tool.scope].label}" permission in BitBin's Settings.`);
  }

  try {
    return await tool.run(user, args);
  } catch (error) {
    console.error(`MCP tool ${tool.name} failed:`, error);
    return fail('BitBin could not complete that request.');
  }
}

const rpcError = (id: RpcId, code: number, message: string): RpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } });

/** The answer to a request body that isn't JSON at all. */
export const MCP_PARSE_ERROR = rpcError(null, PARSE_ERROR, 'Parse error');

/**
 * Answers one JSON-RPC message. Null for a notification (a message with no id), which gets no reply.
 */
async function handleMessage(user: ApiUser, message: unknown): Promise<RpcResponse | null> {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return rpcError(null, INVALID_REQUEST, 'Invalid request');
  }
  const { jsonrpc, id, method, params } = message as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
  const isNotification = id === undefined;
  const replyId: RpcId = typeof id === 'string' || typeof id === 'number' ? id : null;

  if (jsonrpc !== '2.0' || typeof method !== 'string') {
    return rpcError(replyId, INVALID_REQUEST, 'Invalid request');
  }
  // Notifications (`notifications/initialized`, `notifications/cancelled`…) are acknowledged, never answered
  if (isNotification) return null;

  const result = (value: unknown): RpcResponse => ({ jsonrpc: '2.0', id: replyId, result: value });

  switch (method) {
    case 'initialize': {
      const requested = (params as { protocolVersion?: unknown } | undefined)?.protocolVersion;
      const protocolVersion =
        typeof requested === 'string' && MCP_PROTOCOL_VERSIONS.includes(requested) ? requested : MCP_PROTOCOL_VERSIONS[0];
      return result({ protocolVersion, capabilities: { tools: {} }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    }
    case 'ping':
      return result({});
    case 'tools/list':
      return result({ tools: toolsFor(user) });
    case 'tools/call': {
      const outcome = await callTool(user, params);
      return 'rpcError' in outcome ? rpcError(replyId, INVALID_PARAMS, outcome.rpcError) : result(outcome);
    }
    default:
      return rpcError(replyId, METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}

/** A batch holds at most this many messages */
const MAX_BATCH = 20;

/**
 * Answers a parsed request body: one message, or a batch of them (older protocol revisions allow
 * that). Null when there is nothing to send back, which the route turns into `202 Accepted`.
 */
export async function handleMcpPayload(user: ApiUser, payload: unknown): Promise<RpcResponse | RpcResponse[] | null> {
  if (!Array.isArray(payload)) return handleMessage(user, payload);
  if (payload.length === 0 || payload.length > MAX_BATCH) return rpcError(null, INVALID_REQUEST, 'Invalid request');

  const replies: RpcResponse[] = [];
  // One after another: a batch mustn't run its saves concurrently past the plan's limits
  for (const message of payload) {
    const reply = await handleMessage(user, message);
    if (reply) replies.push(reply);
  }
  return replies.length > 0 ? replies : null;
}
