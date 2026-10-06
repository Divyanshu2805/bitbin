import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'
import { SESSION_MAX_AGE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from '@/lib/constants/session'

/**
 * Edge-compatible auth configuration.
 * Contains only providers - no adapter or database dependencies.
 * Used by proxy.ts for route protection in edge environments.
 *
 * Note: Credentials provider has placeholder authorize function here.
 * The actual bcrypt validation is in auth.ts which overrides this.
 */
export default {
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS, updateAge: SESSION_UPDATE_AGE_SECONDS },
  pages: {
    signIn: '/sign-in',
  },
  providers: [
    // Keep in sync with auth.ts (see the issuer note there)
    GitHub({ issuer: 'https://github.com/login/oauth' }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // Placeholder - overridden in auth.ts with actual validation
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig
