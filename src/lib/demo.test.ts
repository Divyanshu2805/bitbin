import { describe, it, expect } from 'vitest';
import { DEMO_EMAIL, demoBlockedMessage, isDemoEmail } from './demo';

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
