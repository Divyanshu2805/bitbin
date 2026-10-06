/**
 * `pg` reads `sslmode=require`, `prefer` and `verify-ca` as `verify-full` today
 * (and warns about it on every connection), but its next major version gives
 * them libpq's weaker meaning, which doesn't verify the server's hostname. Say
 * `verify-full` outright so the connection stays as strict as it is now, and
 * the warning goes away, without touching the environment variable.
 *
 * A URL that opts into libpq's behaviour (`uselibpqcompat=true`) is left alone.
 */
export function normalizeDatabaseUrl(url: string): string {
  if (/[?&]uselibpqcompat=true(?=&|$)/i.test(url)) return url;
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i, '$1verify-full');
}
