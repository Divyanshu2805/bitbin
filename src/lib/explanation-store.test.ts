import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearExplanations,
  explanationKey,
  getExplanation,
  getPendingExplanation,
  saveExplanation,
  trackExplanation,
} from './explanation-store';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('explanation store', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keys by title and code, so an edit starts fresh', () => {
    expect(explanationKey('Swap', 'a, b = b, a')).toBe(explanationKey('Swap', 'a, b = b, a'));
    expect(explanationKey('Swap', 'a, b = b, a')).not.toBe(explanationKey('Swap', 'a, b = b, a\n'));
    expect(explanationKey('Swap', 'x')).not.toBe(explanationKey('Swap2', 'x'));
  });

  it('keeps an explanation until cleared', () => {
    const key = explanationKey('Swap', 'code');
    expect(getExplanation(key)).toBeNull();
    saveExplanation(key, '## Swap');
    expect(getExplanation(key)).toBe('## Swap');
    clearExplanations();
    expect(getExplanation(key)).toBeNull();
  });

  it('keeps only the 50 most recent', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 55; i++) {
      vi.setSystemTime(1_000 + i);
      saveExplanation(`k${i}`, `text ${i}`);
    }
    vi.useRealTimers();
    expect(getExplanation('k0')).toBeNull();
    expect(getExplanation('k4')).toBeNull();
    expect(getExplanation('k5')).toBe('text 5');
    expect(getExplanation('k54')).toBe('text 54');
  });

  it('survives storage that throws', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      },
    });
    expect(() => saveExplanation('k', 'text')).not.toThrow();
    expect(getExplanation('k')).toBeNull();
    expect(() => clearExplanations()).not.toThrow();
  });

  it('shares an in-flight request and saves its answer when it lands', async () => {
    const key = explanationKey('Swap', 'code');
    let resolve!: (text: string) => void;
    const request = trackExplanation(key, () => new Promise<string>((r) => (resolve = r)));

    expect(getPendingExplanation(key)).toBe(request);
    resolve('## Swap');
    await expect(request).resolves.toBe('## Swap');

    expect(getPendingExplanation(key)).toBeUndefined();
    expect(getExplanation(key)).toBe('## Swap');
  });

  it("doesn't save a failed request", async () => {
    const key = explanationKey('Swap', 'code');
    await trackExplanation(key, async () => null);
    expect(getExplanation(key)).toBeNull();
    expect(getPendingExplanation(key)).toBeUndefined();
  });
});
