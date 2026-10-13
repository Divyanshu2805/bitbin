import { MAX_COLLECTIONS, MAX_ITEMS } from './plan';

// What each plan includes, shown on the homepage and the upgrade page. Pro costs $8 a month or
// $72 a year (the Stripe prices behind STRIPE_PRICE_ID_MONTHLY / _YEARLY).

// The same plans row by row (`PlanCompare`): [feature, Free, Pro], each true / false for a tick
// or a dash, or text
export const PLAN_COMPARISON: readonly (readonly [string, boolean | string, boolean | string])[] = [
  ['Items', String(MAX_ITEMS), 'Unlimited'],
  ['Collections', String(MAX_COLLECTIONS), 'Unlimited'],
  ['Snippets, prompts, commands, notes, links', true, true],
  ['Files and images', false, true],
  ['⌘K search, tags, favorites', true, true],
  ['AI helpers', false, true],
  ['MCP server and API tokens', false, true],
  ['Browser extension and desktop app', false, true],
  ['JSON export and import', true, true],
  ['ZIP export and import, with files', false, true],
];

export const FREE_FEATURES = [
  `${MAX_ITEMS} items and ${MAX_COLLECTIONS} collections`,
  'Snippets, prompts, commands, notes, links',
  '⌘K search, tags and favorites',
  'JSON export and import',
] as const;

export const PRO_FEATURES = [
  'Unlimited items and collections',
  'Files and images, stored with your items',
  'AI tags, descriptions, explanations and prompt rewrites',
  'The browser extension, the desktop app and an MCP server for AI assistants',
  'ZIP export and import, with your files',
] as const;
