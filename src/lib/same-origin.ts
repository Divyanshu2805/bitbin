import { NextResponse } from 'next/server';

/**
 * Blocks a cross-site request to an endpoint that is authorised by the session cookie.
 *
 * The cookie is `SameSite=Lax`, which already keeps it off cross-site POSTs, but that is the only
 * line of defence and it covers neither a sibling subdomain (`same-site`) nor a browser that
 * ignores it. This adds a second one for the endpoints that change state or start a payment, using
 * what browsers send themselves:
 *
 * - `Sec-Fetch-Site` of `cross-site` or `same-site` is refused (`same-origin` and `none`, a
 *   navigation the user typed, pass);
 * - an `Origin` that isn't this host is refused, `null` included.
 *
 * With neither header (curl, a server) the request passes: a CSRF attack needs a browser, and a
 * browser always sends at least one. Returns the response to send, or `null` to carry on. Next's
 * own server actions do the equivalent check for themselves.
 */
export function rejectCrossSite(request: Request): NextResponse | null {
  const blocked = () => NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });

  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') return blocked();

  const origin = request.headers.get('origin');
  if (origin !== null) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return blocked(); // "null" and anything that isn't a URL
    }
    const hosts = new Set(
      [request.headers.get('x-forwarded-host'), request.headers.get('host'), new URL(request.url).host].filter(
        (h): h is string => !!h
      )
    );
    if (!hosts.has(originHost)) return blocked();
  }

  return null;
}
