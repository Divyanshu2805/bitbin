import { beforeEach, describe, expect, it, vi } from 'vitest';

const { init } = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ init, captureConsoleIntegration: vi.fn(() => ({ name: 'CaptureConsole' })) }));

import { startMonitoring } from './monitoring';

describe('startMonitoring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing without a DSN', () => {
    expect(startMonitoring({})).toBe(false);
    expect(startMonitoring({ SENTRY_DSN: '' })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('starts Sentry with the DSN and the safe options when one is set', () => {
    expect(startMonitoring({ SENTRY_DSN: 'https://k@o.ingest.sentry.io/1', VERCEL_ENV: 'production' })).toBe(true);

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://k@o.ingest.sentry.io/1',
        environment: 'production',
        tracesSampleRate: 0,
        sendDefaultPii: false,
      })
    );
  });
});
