import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/** True when `header` is exactly `Bearer <secret>`, compared in constant time. */
function isAuthorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The check every Vercel cron route starts with: Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Returns a response to send back when the request must not run (secret not configured, or not
 * the right one), or null when it may. Without `CRON_SECRET` set it refuses everyone.
 */
export function rejectUnlessCron(request: Request, job: string): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`${job} refused: CRON_SECRET is not set`);
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
