import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/admin', '/match', '/overlay-manager']

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl, 307)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - .html files (Google verification files in /public)
     * - /api/auth (NextAuth endpoints)
     * - /login
     * - /overlay, /viewer (public broadcast pages)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.html$|api/auth|login|overlay|viewer).*)',
  ],
}
