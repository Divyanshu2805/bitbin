// What search engines and link previews (Open Graph, Twitter) are told about the site.
// One place, so the layout, robots.txt, the sitemap and the share image agree.

export const SITE_NAME = 'BitBin';

export const SITE_TAGLINE = 'Every snippet, one bin';

export const SITE_DESCRIPTION =
  'BitBin is a fast, searchable home for your code snippets, AI prompts, terminal commands, notes, files and links.';

/** The public origin, without a trailing slash. `NEXT_PUBLIC_APP_URL` is set per environment. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Pages a crawler may index; everything behind a sign-in is left out of the sitemap and robots.txt. */
export const PUBLIC_PATHS = ['/', '/register', '/sign-in', '/privacy', '/terms'] as const;

/** Paths crawlers are asked to stay out of: the API and every signed-in or token-based page. */
export const PRIVATE_PATHS = [
  '/api/',
  '/dashboard',
  '/items',
  '/collections',
  '/favorites',
  '/profile',
  '/settings',
  '/upgrade',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const;
