import { describe, it, expect } from 'vitest';
import { buildTextEntries, extensionFor, safeFileName } from './export-files';
import type { ExportItem } from '@/lib/db/export';

const item = (over: Partial<ExportItem>): ExportItem => ({
  title: 'Title',
  type: 'note',
  content: 'body',
  language: null,
  description: null,
  url: null,
  fileName: null,
  fileSize: null,
  fileUrl: null,
  tags: [],
  collections: [],
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('safeFileName', () => {
  it('replaces path separators and characters Windows refuses', () => {
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
  });

  it('cannot climb out of its folder', () => {
    expect(safeFileName('../../etc/passwd')).toBe('etc-passwd');
    expect(safeFileName('..\\..\\windows')).toBe('windows');
    expect(safeFileName('..')).toBe('untitled');
    expect(safeFileName('.hidden.')).toBe('hidden');
  });

  it('is never empty and never too long', () => {
    expect(safeFileName('   ')).toBe('untitled');
    expect(safeFileName('x'.repeat(300))).toHaveLength(80);
  });

  it('keeps ordinary titles readable', () => {
    expect(safeFileName('useDebounce Hook')).toBe('useDebounce Hook');
  });
});

describe('extensionFor', () => {
  it('uses the snippet language', () => {
    expect(extensionFor({ type: 'snippet', language: 'typescript' })).toBe('ts');
    expect(extensionFor({ type: 'snippet', language: 'python' })).toBe('py');
    expect(extensionFor({ type: 'snippet', language: 'powershell' })).toBe('ps1');
  });

  it('falls back to text for a snippet with no or an unknown language', () => {
    expect(extensionFor({ type: 'snippet', language: null })).toBe('txt');
    expect(extensionFor({ type: 'snippet', language: 'brainfuck' })).toBe('txt');
  });

  it('gives prompts and notes Markdown and commands shell', () => {
    expect(extensionFor({ type: 'prompt', language: null })).toBe('md');
    expect(extensionFor({ type: 'note', language: 'typescript' })).toBe('md');
    expect(extensionFor({ type: 'command', language: null })).toBe('sh');
    expect(extensionFor({ type: 'command', language: 'powershell' })).toBe('ps1');
  });
});

describe('buildTextEntries', () => {
  it('puts each type in its own folder with the item text as the file', () => {
    const entries = buildTextEntries([
      item({ title: 'Debounce', type: 'snippet', language: 'typescript', content: 'export const x = 1' }),
      item({ title: 'Review', type: 'prompt', content: 'You are a reviewer' }),
      item({ title: 'Reset', type: 'command', content: 'git reset --hard' }),
      item({ title: 'Todo', type: 'note', content: '- milk' }),
    ]);

    expect(entries).toEqual([
      { path: 'snippets/Debounce.ts', content: 'export const x = 1' },
      { path: 'prompts/Review.md', content: 'You are a reviewer' },
      { path: 'commands/Reset.sh', content: 'git reset --hard' },
      { path: 'notes/Todo.md', content: '- milk' },
    ]);
  });

  it('numbers items that share a title, ignoring case', () => {
    const paths = buildTextEntries([
      item({ title: 'Same', type: 'prompt' }),
      item({ title: 'same', type: 'prompt' }),
      item({ title: 'Same', type: 'prompt' }),
      item({ title: 'Same', type: 'note' }),
    ]).map((e) => e.path);

    expect(paths).toEqual(['prompts/Same.md', 'prompts/same-2.md', 'prompts/Same-3.md', 'notes/Same.md']);
  });

  it('writes an item with no content as an empty file', () => {
    expect(buildTextEntries([item({ content: null })])[0].content).toBe('');
  });

  it('gathers links into one Markdown list, with their descriptions', () => {
    const entries = buildTextEntries([
      item({ title: 'Docker docs', type: 'link', url: 'https://docs.docker.com', description: 'Official\ndocs' }),
      item({ title: 'A [bracket]', type: 'link', url: 'https://a.dev' }),
    ]);

    expect(entries).toEqual([
      {
        path: 'links.md',
        content: '# Links\n\n- [Docker docs](https://docs.docker.com) — Official docs\n- [A \\[bracket\\]](https://a.dev)\n',
      },
    ]);
  });

  it('leaves files and images to the files folder, and writes no empty links file', () => {
    const entries = buildTextEntries([
      item({ title: 'Photo', type: 'image', content: null }),
      item({ title: 'Resume', type: 'file', content: null }),
    ]);

    expect(entries).toEqual([]);
  });
});
