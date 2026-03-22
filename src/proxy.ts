import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOperatorRoute = req.nextUrl.pathname.includes('/operator')
  const isApiTriggerRoute = req.nextUrl.pathname.startsWith('/api/pusher/trigger')
  const isApiPersistRoute = req.nextUrl.pathname.startsWith('/api/match')

  // Admin pages are public (read-only views) — API routes handle write auth individually
  const isProtected = isOperatorRoute || isApiTriggerRoute || isApiPersistRoute

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    '/match/:path*/operator',
    '/api/pusher/trigger',
    '/api/match/:path*',
  ],
}
