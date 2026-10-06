// Optional bot protection with Cloudflare Turnstile (free, and the site is already on Cloudflare).
// It is off until BOTH keys are set, so a fork or a local setup needs nothing. Once on, the public
// endpoints that send email (register, forgot password) refuse a request without a valid token,
// and a verification failure or an unreachable Cloudflare refuses too (fail closed).

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

function filled(value: string | undefined): value is string {
  return !!value && !value.startsWith('YOUR_');
}

/** True when both the server secret and the public site key are set. */
export function isTurnstileEnabled(): boolean {
  return filled(process.env.TURNSTILE_SECRET_KEY) && filled(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export type TurnstileResult = { ok: true } | { ok: false; message: string };

const CHALLENGE_FAILED = 'Please complete the verification check and try again.';

/** Verifies a token from the widget with Cloudflare. Only call it when `isTurnstileEnabled()`. */
export async function verifyTurnstile(token: unknown, ip?: string): Promise<TurnstileResult> {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return { ok: false, message: CHALLENGE_FAILED };
  }

  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY as string, response: token });
  if (ip && ip !== '127.0.0.1') body.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('Turnstile verification failed with status', res.status);
      return { ok: false, message: CHALLENGE_FAILED };
    }
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? { ok: true } : { ok: false, message: CHALLENGE_FAILED };
  } catch (error) {
    // Refuse rather than let a bot through when Cloudflare can't be reached
    console.error('Turnstile verification error:', error);
    return { ok: false, message: CHALLENGE_FAILED };
  }
}
