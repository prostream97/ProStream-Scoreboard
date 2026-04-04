import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session
  const isAdmin = session?.user?.role === 'admin'
  const path = nextUrl.pathname

  const publicPrefixes = ['/login', '/overlay/', '/api/', '/_next/', '/favicon']
  if (publicPrefixes.some((p) => path.startsWith(p))) return NextResponse.next()

  if (!isLoggedIn)
    return NextResponse.redirect(new URL('/login', req.url))

  const adminOnlyPaths = ['/admin/users', '/admin/access', '/admin/pricing', '/admin/settings']
  if (adminOnlyPaths.some((p) => path.startsWith(p)) && !isAdmin)
    return NextResponse.redirect(new URL('/', req.url))

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
