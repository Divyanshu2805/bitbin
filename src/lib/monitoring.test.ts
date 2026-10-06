import { describe, expect, it } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import type { ErrorEvent } from '@sentry/nextjs';
import { monitoringOptions, scrubEvent } from './monitoring';

const event = (over: Partial<ErrorEvent>): ErrorEvent => ({ type: undefined, ...over }) as ErrorEvent;

describe('scrubEvent', () => {
  it('removes cookies, credentials and the body from the request', () => {
    const scrubbed = scrubEvent(
      event({
        request: {
          url: 'https://bitbin.example/api/auth/verify?token=abc123',
          query_string: 'token=abc123',
          cookies: { 'authjs.session-token': 'secret' },
          data: { password: 'hunter2' },
          headers: {
            Cookie: 'authjs.session-token=secret',
            Authorization: 'Bearer bb_secret',
            'X-Forwarded-For': '203.0.113.7',
            'Stripe-Signature': 'sig',
            'User-Agent': 'Mozilla/5.0',
          },
        },
      })
    );

    const json = JSON.stringify(scrubbed);
    for (const secret of ['abc123', 'hunter2', 'bb_secret', 'authjs.session-token', '203.0.113.7']) {
      expect(json).not.toContain(secret);
    }
    // What is useful for debugging stays
    expect(scrubbed.request?.headers?.['User-Agent']).toBe('Mozilla/5.0');
    expect(scrubbed.request?.url).toBe('https://bitbin.example/api/auth/verify?[redacted]');
  });

  it('drops the user, who may carry an IP address or an e-mail', () => {
    const scrubbed = scrubEvent(event({ user: { id: 'u1', email: 'a@b.dev', ip_address: '203.0.113.7' } }));
    expect(scrubbed.user).toBeUndefined();
  });

  it('leaves the message and the stack trace alone', () => {
    const scrubbed = scrubEvent(
      event({ message: 'Webhook failed', exception: { values: [{ type: 'Error', value: 'boom' }] } })
    );
    expect(scrubbed.message).toBe('Webhook failed');
    expect(scrubbed.exception?.values?.[0].value).toBe('boom');
  });

  it('copes with an event that has no request', () => {
    expect(() => scrubEvent(event({}))).not.toThrow();
  });
});

describe('monitoringOptions', () => {
  it('sends errors only, with no personal data, tagged with the environment', () => {
    const options = monitoringOptions({ SENTRY_DSN: 'https://k@o.ingest.sentry.io/1', VERCEL_ENV: 'production' });

    expect(options.dsn).toBe('https://k@o.ingest.sentry.io/1');
    expect(options.environment).toBe('production');
    expect(options.tracesSampleRate).toBe(0);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.beforeSend).toBe(scrubEvent);
  });

  it('falls back to NODE_ENV when not on Vercel', () => {
    expect(monitoringOptions({ NODE_ENV: 'development' }).environment).toBe('development');
  });
});

describe('with the real SDK', () => {
  it('turns a console.error into an event, without anything sensitive in it', async () => {
    const sent: string[] = [];
    Sentry.init({
      ...monitoringOptions({ SENTRY_DSN: 'https://key@example.invalid/1', NODE_ENV: 'test' }),
      // Capture what would be sent instead of sending it
      transport: () => ({
        send: async (envelope: unknown) => {
          sent.push(JSON.stringify(envelope));
          return {};
        },
        flush: async () => true,
      }),
    });

    console.error('Stripe webhook handler failed:', new Error('db is down'));
    await Sentry.flush(2000);
    await Sentry.close(2000);

    const all = sent.join('\n');
    expect(all).toContain('db is down');
    expect(all).not.toContain('authjs.session-token');
  });
});
