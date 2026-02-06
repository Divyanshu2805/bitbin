import { describe, it, expect } from 'vitest';
import {
  mergeWithDefaults,
  DEFAULT_EDITOR_PREFERENCES,
  FONT_SIZES,
  TAB_SIZES,
  EDITOR_THEMES,
} from './editor';

describe('mergeWithDefaults', () => {
  it('returns defaults when preferences is null', () => {
    const result = mergeWithDefaults(null);
    expect(result).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it('returns defaults when preferences is undefined', () => {
    const result = mergeWithDefaults(undefined);
    expect(result).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it('returns defaults when preferences is empty object', () => {
    const result = mergeWithDefaults({});
    expect(result).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it('merges partial preferences with defaults', () => {
    const result = mergeWithDefaults({ fontSize: 16 });
    expect(result).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 16,
    });
  });

  it('overrides multiple defaults', () => {
    const result = mergeWithDefaults({
      fontSize: 18,
      theme: 'monokai',
      minimap: true,
    });
    expect(result).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 18,
      theme: 'monokai',
      minimap: true,
    });
  });

  it('preserves all user preferences when fully specified', () => {
    const fullPreferences = {
      fontSize: 20,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      theme: 'github-dark' as const,
    };
    const result = mergeWithDefaults(fullPreferences);
    expect(result).toEqual(fullPreferences);
  });
});

describe('editor constants', () => {
  it('has valid default preferences', () => {
    expect(FONT_SIZES).toContain(DEFAULT_EDITOR_PREFERENCES.fontSize);
    expect(TAB_SIZES).toContain(DEFAULT_EDITOR_PREFERENCES.tabSize);
    expect(EDITOR_THEMES.map((t) => t.value)).toContain(DEFAULT_EDITOR_PREFERENCES.theme);
    expect(typeof DEFAULT_EDITOR_PREFERENCES.wordWrap).toBe('boolean');
    expect(typeof DEFAULT_EDITOR_PREFERENCES.minimap).toBe('boolean');
  });

  it('has expected font sizes', () => {
    expect(FONT_SIZES).toEqual([12, 13, 14, 15, 16, 18, 20]);
  });

  it('has expected tab sizes', () => {
    expect(TAB_SIZES).toEqual([2, 4, 8]);
  });

  it('has expected themes', () => {
    expect(EDITOR_THEMES.map((t) => t.value)).toEqual(['vs-dark', 'monokai', 'github-dark']);
  });
});
