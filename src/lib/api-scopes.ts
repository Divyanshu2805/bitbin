// What a personal access token may do. A token is created with a subset of these, so a token pasted
// into a script that only saves items can't also spend the AI quota or read the collection list, and
// a leaked one can do less. Checked per request in `authenticateApiRequest` (lib/api-auth.ts).

export const API_SCOPES = ['collections:read', 'items:write', 'files:write', 'ai'] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_INFO: Record<ApiScope, { label: string; description: string }> = {
  'collections:read': {
    label: 'List collections',
    description: 'Read your collection names for the picker (GET /api/v1/collections).',
  },
  'items:write': {
    label: 'Save items',
    description: 'Create text and link items (POST /api/v1/items).',
  },
  'files:write': {
    label: 'Save files and images',
    description: 'Upload a file or image as a new item (POST /api/v1/files).',
  },
  ai: {
    label: 'AI suggestions',
    description: 'Ask for tags and a description (uses your AI quota).',
  },
};

/** Keeps only the scopes this app knows, in a stable order. */
export function normalizeScopes(values: readonly string[] | null | undefined): ApiScope[] {
  const set = new Set(values ?? []);
  return API_SCOPES.filter((scope) => set.has(scope));
}
