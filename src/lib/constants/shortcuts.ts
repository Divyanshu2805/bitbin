// App keyboard shortcuts, in one place so the handlers, the hints shown next to
// each control, and the `?` sheet always agree. Handlers: components/layout/
// app-shortcuts.tsx (navigation), top-bar.tsx (create, search), the item drawer
// and collection actions.

/** `G` then a key: go somewhere. */
export const GO_SHORTCUTS = [
  { key: 'd', href: '/dashboard', label: 'Dashboard' },
  { key: 'f', href: '/favorites', label: 'Favorites' },
  { key: 'c', href: '/collections', label: 'Collections' },
  { key: 'p', href: '/profile', label: 'Profile' },
  { key: 's', href: '/settings', label: 'Settings' },
  { key: 'u', href: '/upgrade', label: 'Upgrade' },
] as const;

/** A digit per type, in sidebar order. */
export const TYPE_SHORTCUTS: Record<string, string> = {
  snippet: '1',
  prompt: '2',
  command: '3',
  note: '4',
  file: '5',
  image: '6',
  link: '7',
};

/** The keys that go to `href`, e.g. ['G', 'D'], or undefined. */
export function goKeys(href: string): string[] | undefined {
  const match = GO_SHORTCUTS.find((s) => s.href === href);
  return match ? ['G', match.key.toUpperCase()] : undefined;
}

/** What the `?` sheet lists. `hint` is a short grey line under the label. */
export const SHORTCUT_GROUPS: { title: string; items: { keys: string[]; label: string; hint?: string }[] }[] = [
  {
    title: 'general',
    items: [
      { keys: ['⌘', 'K'], label: 'Search everything' },
      { keys: ['/'], label: 'Search' },
      { keys: ['N'], label: 'New item', hint: 'set to the page’s type on type pages' },
      { keys: ['C'], label: 'New collection' },
      { keys: ['['], label: 'Collapse or expand the sidebar' },
      { keys: ['?'], label: 'Show these shortcuts' },
    ],
  },
  {
    title: 'go to',
    items: [
      ...GO_SHORTCUTS.map((s) => ({ keys: ['G', s.key.toUpperCase()], label: s.label })),
      { keys: ['1', '–', '7'], label: 'A type’s page', hint: 'snippets, prompts, commands, notes, files, images, links' },
    ],
  },
  {
    title: 'open item',
    items: [
      { keys: ['E'], label: 'Edit' },
      { keys: ['F'], label: 'Favorite' },
      { keys: ['P'], label: 'Pin' },
      { keys: ['M'], label: 'Full screen / back' },
      { keys: ['⌫'], label: 'Delete' },
      { keys: ['⌘', 'S'], label: 'Save while editing' },
    ],
  },
  {
    title: 'collection page',
    items: [
      { keys: ['E'], label: 'Edit the collection' },
    ],
  },
];
