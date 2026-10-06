import type { ExportItem } from '@/lib/db/export';

/**
 * The text items of an export as ordinary files for the ZIP: snippets,
 * prompts, commands and notes each in their own folder, readable and
 * diff-able without BitBin, and the links gathered into one Markdown list.
 * The JSON manifest next to them stays the format that can be imported again.
 */

export interface ExportFileEntry {
  path: string;
  content: string;
}

const FOLDERS: Record<string, string> = {
  snippet: 'snippets',
  prompt: 'prompts',
  command: 'commands',
  note: 'notes',
};

const MAX_NAME_LENGTH = 80;

// A snippet's file extension, from its language (the editor's language names)
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  plaintext: 'txt',
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  html: 'html',
  css: 'css',
  json: 'json',
  markdown: 'md',
  bash: 'sh',
  sql: 'sql',
  java: 'java',
  csharp: 'cs',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  php: 'php',
  swift: 'swift',
  kotlin: 'kt',
  dart: 'dart',
  yaml: 'yml',
  xml: 'xml',
  graphql: 'graphql',
  dockerfile: 'dockerfile',
  scss: 'scss',
  less: 'less',
  lua: 'lua',
  perl: 'pl',
  r: 'r',
  powershell: 'ps1',
};

export function extensionFor(item: Pick<ExportItem, 'type' | 'language'>): string {
  if (item.type === 'prompt' || item.type === 'note') return 'md';
  if (item.type === 'command') return item.language ? (LANGUAGE_EXTENSIONS[item.language] ?? 'sh') : 'sh';
  return item.language ? (LANGUAGE_EXTENSIONS[item.language] ?? 'txt') : 'txt';
}

/** A title as a file name: no path separators or characters Windows refuses, never empty, never too long. */
export function safeFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.-]+|[\s.]+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return cleaned || 'untitled';
}

export function buildTextEntries(items: ExportItem[]): ExportFileEntry[] {
  const entries: ExportFileEntry[] = [];
  const taken = new Set<string>();

  for (const item of items) {
    const folder = FOLDERS[item.type];
    if (!folder) continue;

    const base = safeFileName(item.title);
    const ext = extensionFor(item);
    let name = `${base}.${ext}`;
    // The same title twice in a folder: name.ext, name-2.ext, name-3.ext (case-insensitively, for Windows and macOS)
    for (let n = 2; taken.has(`${folder}/${name}`.toLowerCase()); n++) name = `${base}-${n}.${ext}`;
    taken.add(`${folder}/${name}`.toLowerCase());

    entries.push({ path: `${folder}/${name}`, content: item.content ?? '' });
  }

  const links = items.filter((item) => item.type === 'link' && item.url);
  if (links.length > 0) {
    const lines = links.map((link) => {
      const title = link.title.replace(/([[\]])/g, '\\$1');
      const note = link.description ? ` — ${link.description.replace(/\s+/g, ' ')}` : '';
      return `- [${title}](${link.url})${note}`;
    });
    entries.push({ path: 'links.md', content: `# Links\n\n${lines.join('\n')}\n` });
  }

  return entries;
}
