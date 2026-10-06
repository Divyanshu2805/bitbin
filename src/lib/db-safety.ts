/**
 * Scripts that delete or overwrite data (`db:cleanup`, `db:seed`) read the same
 * `DATABASE_URL` as the app, and today that can be the live database. They call
 * this first and stop unless you have said that this database is the one you
 * mean, so a stray `npm run db:cleanup` can't wipe real accounts.
 *
 * Two ways to say so:
 * - `SAFE_DATABASE_HOSTS=host1,host2` (in `.env`): databases that are fine to
 *   reset, such as a Neon development branch. No prompt for those.
 * - `CONFIRM_DATABASE_HOST=<the host>` on the command line: a one-off yes for
 *   any other database. It has to be the exact host, so it can't be set by habit.
 */

export function databaseHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export class UnsafeDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeDatabaseError';
  }
}

export function assertSafeToRunDestructive(
  databaseUrl: string | undefined,
  action: string,
  env: Record<string, string | undefined> = process.env
): string {
  const host = databaseUrl ? databaseHost(databaseUrl) : '';
  if (!host) {
    throw new UnsafeDatabaseError('DATABASE_URL is missing or not a valid URL.');
  }

  const safeHosts = (env.SAFE_DATABASE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (safeHosts.includes(host)) return host;

  if ((env.CONFIRM_DATABASE_HOST ?? '').trim().toLowerCase() === host) return host;

  throw new UnsafeDatabaseError(
    [
      `Refusing to ${action} on ${host}.`,
      'This script deletes or overwrites data, and that database is not marked as safe to reset.',
      '',
      'If it is a development database, add its host to SAFE_DATABASE_HOSTS in .env.',
      `If you really mean this one, run it once with CONFIRM_DATABASE_HOST=${host}`,
      `  PowerShell:  $env:CONFIRM_DATABASE_HOST="${host}"; npm run <script>`,
      `  bash:        CONFIRM_DATABASE_HOST=${host} npm run <script>`,
    ].join('\n')
  );
}
