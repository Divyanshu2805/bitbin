import { describe, it, expect } from 'vitest';
import { DEMO_EMAIL, DEMO_MAX_CONTENT_LENGTH, demoBlockedMessage, demoItemRestriction, isDemoEmail } from './demo';

describe('isDemoEmail', () => {
  it('matches the demo address however it is written', () => {
    expect(isDemoEmail(DEMO_EMAIL)).toBe(true);
    expect(isDemoEmail('Demo@BitBin.dev')).toBe(true);
    expect(isDemoEmail('  demo@bitbin.dev ')).toBe(true);
  });

  it('matches nobody else', () => {
    expect(isDemoEmail('someone@bitbin.dev')).toBe(false);
    expect(isDemoEmail('demo@bitbin.dev.evil.com')).toBe(false);
    expect(isDemoEmail('xdemo@bitbin.dev')).toBe(false);
    expect(isDemoEmail('')).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
    expect(isDemoEmail(undefined)).toBe(false);
  });
});

describe('demoBlockedMessage', () => {
  it('says what the demo account cannot do and what to do instead', () => {
    expect(demoBlockedMessage('be deleted')).toBe("The demo account can't be deleted. Create a free account to try it.");
  });
});

describe('demoItemRestriction', () => {
  it('lets ordinary items through', () => {
    expect(demoItemRestriction({ typeName: 'snippet', content: 'const x = 1', url: null })).toBeNull();
    expect(demoItemRestriction({ content: 'a'.repeat(DEMO_MAX_CONTENT_LENGTH) })).toBeNull();
    expect(demoItemRestriction({})).toBeNull();
  });

  it('refuses a link item and any new URL, so a stranger cannot leave a clickable link for the next visitor', () => {
    expect(demoItemRestriction({ typeName: 'link', url: 'https://example.com' })).toContain('links');
    expect(demoItemRestriction({ typeName: 'note', url: 'https://evil.example/phish' })).toContain('links');
  });

  it('lets a visitor edit a seeded link item as long as its URL is unchanged', () => {
    expect(demoItemRestriction({ url: 'https://example.com/docs' }, 'https://example.com/docs')).toBeNull();
    expect(demoItemRestriction({ url: 'https://evil.example/phish' }, 'https://example.com/docs')).toContain('links');
  });

  it('refuses a very long paste', () => {
    const message = demoItemRestriction({ content: 'a'.repeat(DEMO_MAX_CONTENT_LENGTH + 1) });
    expect(message).toContain("The demo account can't save more than 5,000 characters");
  });
});
