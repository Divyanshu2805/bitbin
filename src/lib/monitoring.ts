import * as Sentry from '@sentry/nextjs';
import type { ErrorEvent } from '@sentry/nextjs';

/**
 * Error monitoring (Sentry), server side. Switched on by setting `SENTRY_DSN`;
 * without it nothing is sent and nothing changes.
 *
 * Two things reach Sentry: errors Next.js itself catches (`onRequestError` in
 * `instrumentation.ts`), and every `console.error` call. The second matters
 * because route handlers catch their own errors and answer 500, so Next.js
 * never sees them; they all log with `console.error`, and so do the webhook
 * failures and the "Rate limit check failed" warning worth an alert.
 */

const REDACTED = '[redacted]';

// Request headers that can hold a credential or identify a visitor
const SENSITIVE_HEADERS = ['cookie', 'authorization', 'x-forwarded-for', 'x-real-ip', 'stripe-signature'];

/**
 * Strip everything that could identify a person or carry a secret before an
 * event leaves the server: cookies, auth headers, the request body, and the
 * query string (email verification and password reset links carry their token
 * there). The stack trace and message are what is wanted, not the visitor.
 */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  const request = event.request;
  if (request) {
    delete request.cookies;
    delete request.data;
    if (request.headers) {
      for (const name of Object.keys(request.headers)) {
        if (SENSITIVE_HEADERS.includes(name.toLowerCase())) delete request.headers[name];
      }
    }
    if (request.query_string) request.query_string = REDACTED;
    if (request.url) request.url = request.url.replace(/\?.*$/, `?${REDACTED}`);
  }
  // No IP address, e-mail address or user id
  delete event.user;
  return event;
}

export function monitoringOptions(env: Record<string, string | undefined> = process.env) {
  return {
    dsn: env.SENTRY_DSN,
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'development',
    // Errors only: no performance traces, no session replay, no personal data
    tracesSampleRate: 0,
    sendDefaultPii: false,
    integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
    beforeSend: scrubEvent,
  };
}

/** Start monitoring if a DSN is configured. Returns whether it started. */
export function startMonitoring(env: Record<string, string | undefined> = process.env): boolean {
  if (!env.SENTRY_DSN) return false;
  Sentry.init(monitoringOptions(env));
  return true;
}
