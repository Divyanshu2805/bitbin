import { describe, it, expect } from 'vitest';
import { fileKeyFromUrl, fileDownloadPath, fileViewPath } from './file-url';

describe('file URL helpers', () => {
  const url = 'https://pub-abc.r2.dev/user-1/1700000000-photo.png';

  it('extracts the object key from a stored URL', () => {
    expect(fileKeyFromUrl(url)).toBe('user-1/1700000000-photo.png');
  });

  it('builds the download and inline paths from the key', () => {
    expect(fileDownloadPath(url)).toBe('/api/download/user-1/1700000000-photo.png');
    expect(fileViewPath(url)).toBe('/api/download/user-1/1700000000-photo.png?inline=1');
  });

  it('returns null for nothing, for an invalid URL and for a bare host', () => {
    expect(fileKeyFromUrl(null)).toBeNull();
    expect(fileKeyFromUrl(undefined)).toBeNull();
    expect(fileKeyFromUrl('not a url')).toBeNull();
    expect(fileKeyFromUrl('https://pub-abc.r2.dev/')).toBeNull();
    expect(fileViewPath(null)).toBeNull();
    expect(fileDownloadPath('')).toBeNull();
  });

  it('decodes percent-escapes so the key is the real object key', () => {
    expect(fileKeyFromUrl('https://pub-abc.r2.dev/user-1/1-my%20file.png')).toBe('user-1/1-my file.png');
  });
});
