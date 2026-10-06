import * as Sentry from '@sentry/nextjs';
import { startMonitoring } from '@/lib/monitoring';

/** Runs once when the server starts. Does nothing unless `SENTRY_DSN` is set. */
export async function register() {
  startMonitoring();
}

/** Errors Next.js catches while rendering a page or running a route handler. */
export const onRequestError = Sentry.captureRequestError;
