import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isGuestPortalHost, isGuestRoute } from '@/lib/portal-url'
import { STAFF_SESSION_COOKIE, isWellFormedSessionToken } from '@/lib/staff-session-cookie'
import { lookupStaffSessionEdge } from '@/lib/staff-session-edge'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')
  const pathname = request.nextUrl.pathname

  const isGuest = pathname.startsWith('/guest')
  const requestHeaders = new Headers(request.headers)
  if (isGuest) {
    requestHeaders.set('x-is-guest-route', 'true')
  }

  if (isGuestPortalHost(host || undefined)) {
    if (isGuestRoute(pathname)) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/health') ||
    request.nextUrl.pathname.startsWith('/api/staff-auth') ||
    request.nextUrl.pathname.startsWith('/api/inbound/webhook') ||
    request.nextUrl.pathname.startsWith('/api/inbound/email') ||
    request.nextUrl.pathname.startsWith('/api/inbound/nb-email') ||
    request.nextUrl.pathname.startsWith('/api/bridge') ||
    request.nextUrl.pathname.startsWith('/api/cron') ||
    request.nextUrl.pathname.startsWith('/api/drafts') ||
    request.nextUrl.pathname.startsWith('/api/public') ||
    request.nextUrl.pathname.startsWith('/api/guest-portal') ||
    request.nextUrl.pathname.startsWith('/guest') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const staffPassword = process.env.STAFF_PASSWORD

  if (!staffPassword && process.env.NODE_ENV === 'development') {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const sessionToken = request.cookies.get(STAFF_SESSION_COOKIE)?.value
  const hasTurso = Boolean(process.env.DATABASE_URL && process.env.TURSO_AUTH_TOKEN)

  if (sessionToken && hasTurso) {
    const session = await lookupStaffSessionEdge(sessionToken)
    if (session) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
  } else if (
    sessionToken &&
    process.env.NODE_ENV === 'development' &&
    isWellFormedSessionToken(sessionToken)
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (request.nextUrl.pathname !== '/staff-login') {
    const loginUrl = new URL('/staff-login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!staff-login|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
