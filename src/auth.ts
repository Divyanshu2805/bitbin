import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { createAuthAdapter } from '@/lib/db/auth-adapter'
import { deleteOAuthLink, findUserById, getSessionState } from '@/lib/db/accounts'
import { authorizeCredentials } from '@/lib/credentials'
import { SESSION_MAX_AGE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from '@/lib/constants/session'

/**
 * Full NextAuth configuration with Prisma adapter.
 * NOT edge-compatible - use auth.config.ts for edge environments.
 *
 * Note: Providers are defined here (not spread from authConfig) to allow
 * the Credentials provider to use bcrypt validation, which is not edge-compatible.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createAuthAdapter(),
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS, updateAge: SESSION_UPDATE_AGE_SECONDS },
  pages: {
    signIn: '/sign-in',
  },
  providers: [
    // GitHub includes `iss=https://github.com/login/oauth` in its OAuth
    // callback (RFC 9207). Without a matching issuer, Auth.js compares it to
    // its "https://authjs.dev" fallback and rejects the sign-in.
    GitHub({ issuer: 'https://github.com/login/oauth' }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        code: { label: 'Authentication code', type: 'text' },
      },
      // The email-and-password check, the rate limit: lib/credentials.ts
      authorize: (credentials) => authorizeCredentials(credentials),
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'credentials' && user.id) {
        const dbUser = await findUserById(user.id)

        // Block OAuth if this user has a password (credentials account)
        // or if the OAuth email doesn't match the existing user's email
        const oauthEmail = profile?.email ?? user.email
        const emailMismatch = dbUser && oauthEmail && dbUser.email !== oauthEmail

        if (dbUser?.password || emailMismatch) {
          // Clean up the bad account link the adapter created
          await deleteOAuthLink(user.id, account?.provider)
          return '/sign-in?error=OAuthAccountNotLinked'
        }
      }
      return true
    },
    async jwt({ token, user }) {
      // Add user.id to the JWT token on sign in
      if (user?.id) {
        token.id = user.id
      }
      if (token.id) {
        // One read per evaluation: the plan stays live (isPro) and the session
        // can be revoked (sessionVersion)
        const dbUser = await getSessionState(token.id as string)
        // Account deleted: end the session instead of serving a ghost user
        if (!dbUser) return null
        if (user?.id) {
          token.sessionVersion = dbUser.sessionVersion
        } else if (((token.sessionVersion as number | undefined) ?? 0) !== dbUser.sessionVersion) {
          // Password changed or reset since this token was issued
          return null
        }
        token.isPro = dbUser.isPro
      }
      return token
    },
    session({ session, token }) {
      // Add user.id and isPro to the session from the JWT token
      if (token?.id && session.user) {
        session.user.id = token.id as string
        session.user.isPro = Boolean(token.isPro)
      }
      return session
    },
  },
})
