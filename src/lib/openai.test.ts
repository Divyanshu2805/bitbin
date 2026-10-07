import { describe, it, expect } from 'vitest';
import { resolveApiKey } from './openai';

describe('resolveApiKey', () => {
  it('uses AI_API_KEY when it is set', () => {
    expect(resolveApiKey({ AI_API_KEY: 'new-key' })).toBe('new-key');
  });

  it('still accepts the original OPENAI_API_KEY name', () => {
    expect(resolveApiKey({ OPENAI_API_KEY: 'old-key' })).toBe('old-key');
  });

  it('prefers AI_API_KEY when both are set', () => {
    expect(resolveApiKey({ AI_API_KEY: 'new-key', OPENAI_API_KEY: 'old-key' })).toBe('new-key');
  });

  it('treats an empty value as unset', () => {
    expect(resolveApiKey({ AI_API_KEY: '', OPENAI_API_KEY: 'old-key' })).toBe('old-key');
    expect(resolveApiKey({ AI_API_KEY: '', OPENAI_API_KEY: '' })).toBeUndefined();
    expect(resolveApiKey({})).toBeUndefined();
  });
});
