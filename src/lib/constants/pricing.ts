import { MAX_COLLECTIONS, MAX_ITEMS } from './plan';

// What each plan includes, shown on the homepage and the upgrade page. Pro costs $8 a month or
// $72 a year (the Stripe prices behind STRIPE_PRICE_ID_MONTHLY / _YEARLY).

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
  'API tokens, the browser extension and the desktop app',
  'ZIP export, with your files',
] as const;
