import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import authConfig from './auth.config'

const { auth } = NextAuth(authConfig)

/**
 * Route protection proxy using NextAuth.
 * Protects /dashboard routes - redirects unauthenticated users to sign-in.
 */
export const proxy = auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth

  // Protect dashboard routes
  if (nextUrl.pathname.startsWith('/dashboard') && !isAuthenticated) {
    return NextResponse.redirect(new URL('/api/auth/signin', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*'],
}
