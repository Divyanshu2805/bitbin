import { describe, expect, it } from 'vitest';
import { EXCERPT_LINES, MAX_PDF_PREVIEW_BYTES, excerptLines, filePreviewKind } from './file-preview';

describe('filePreviewKind', () => {
  it('previews a PDF and each text format by extension, whatever the case', () => {
    expect(filePreviewKind('resume.pdf', 1000)).toBe('pdf');
    expect(filePreviewKind('Spec.PDF', null)).toBe('pdf');
    for (const name of ['a.txt', 'a.md', 'a.json', 'a.yaml', 'a.yml', 'a.xml', 'a.csv', 'a.toml', 'a.ini']) {
      expect(filePreviewKind(name, 10)).toBe('text');
    }
  });

  it('skips a PDF too big to download for a card, but not one exactly at the limit', () => {
    expect(filePreviewKind('big.pdf', MAX_PDF_PREVIEW_BYTES)).toBe('pdf');
    expect(filePreviewKind('big.pdf', MAX_PDF_PREVIEW_BYTES + 1)).toBeNull();
  });

  it('has no preview for other types or missing names', () => {
    expect(filePreviewKind('photo.png', 10)).toBeNull();
    expect(filePreviewKind('noextension', 10)).toBeNull();
    expect(filePreviewKind(null, 10)).toBeNull();
    expect(filePreviewKind(undefined, undefined)).toBeNull();
  });
});

describe('excerptLines', () => {
  it('keeps the first non-blank lines and drops the rest', () => {
    const text = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    expect(excerptLines(text)).toEqual(Array.from({ length: EXCERPT_LINES }, (_, i) => `line ${i + 1}`));
    expect(excerptLines(text, 2)).toEqual(['line 1', 'line 2']);
  });

  it('skips blank lines, handles Windows line endings and expands tabs', () => {
    expect(excerptLines('a\r\n\r\n   \r\n\tb\r\nc')).toEqual(['a', '  b', 'c']);
  });

  it('drops a byte-order mark and returns nothing for an empty text', () => {
    expect(excerptLines('﻿hello')).toEqual(['hello']);
    expect(excerptLines('')).toEqual([]);
    expect(excerptLines('\n \n')).toEqual([]);
  });
});
