import { CredentialsSignin } from 'next-auth';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/db/accounts';
import { checkRateLimit } from '@/lib/rate-limit';

// The email-and-password sign-in, kept out of auth.ts so it can be tested. NextAuth reports a failure
// to the sign-in form through the `code` of the error the credentials callback throws.

/** Too many sign-in attempts; the form reads `code === 'rate_limited'`. */
export class RateLimitedSignin extends CredentialsSignin {
  code = 'rate_limited';
}

export interface SignedInUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>> | undefined
): Promise<SignedInUser | null> {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const email = credentials.email as string;
  const password = credentials.password as string;

  // Enforced here, not in a pre-check the client may skip (5 per 15 min, per IP + email)
  const rateLimit = await checkRateLimit('login', email.toLowerCase());
  if (!rateLimit.success) {
    throw new RateLimitedSignin();
  }

  const user = await findUserByEmail(email);

  if (!user || !user.password) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return null;
  }

  // Check if email is verified (unless verification is skipped)
  const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
  if (!skipVerification && !user.emailVerified) {
    throw new Error('EmailNotVerified');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
