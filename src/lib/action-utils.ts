import { auth } from '@/auth';
import { checkRateLimit, formatRetryTime, type RateLimitType } from '@/lib/rate-limit';

/**
 * Standard server action result shape used across all actions.
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

interface AuthedSession {
  user: {
    id: string;
    isPro?: boolean;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Retrieves the authenticated session or returns an Unauthorized result.
 */
export async function getAuthedSession(): Promise<
  { session: AuthedSession; unauthorized?: never } |
  { session?: never; unauthorized: ActionResult<never> }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { unauthorized: { success: false, error: 'Unauthorized' } };
  }
  return { session: session as AuthedSession };
}

/**
 * Checks if the user has Pro status. Returns an error result if not.
 */
export function requirePro(isPro: boolean | undefined): ActionResult<never> | null {
  if (!(isPro ?? false)) {
    return { success: false, error: 'AI features require a Pro subscription' };
  }
  return null;
}

/**
 * Checks a per-user rate limit for a server action. Returns an error result
 * ("Too many <what>. Please try again in 3 minutes.") if the user is over it,
 * or null if allowed.
 */
export async function checkActionRateLimit(
  type: RateLimitType,
  userId: string,
  what: string
): Promise<ActionResult<never> | null> {
  const rateLimit = await checkRateLimit(type, userId);
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many ${what}. Please try again in ${formatRetryTime(rateLimit.retryAfter)}.`,
    };
  }
  return null;
}

/**
 * Checks the AI rate limit for a given user.
 * Returns an error result if rate limited, or null if allowed.
 */
export async function checkAiRateLimit(
  userId: string
): Promise<ActionResult<never> | null> {
  return checkActionRateLimit('ai', userId, 'AI requests');
}
