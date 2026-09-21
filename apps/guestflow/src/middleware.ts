import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isGuestPortalHost, isGuestRoute } from '@/lib/portal-url'

// Edge-compatible base64 encoding (Buffer is not available in Edge Runtime)
function base64Encode(str: string): string {
  return btoa(str)
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')
  const pathname = request.nextUrl.pathname

  // Set guest route flag for SSR-safe layout rendering
  const isGuest = pathname.startsWith('/guest')
  const response = NextResponse.next()
  if (isGuest) {
    response.headers.set('x-is-guest-route', 'true')
  }

  // Host-aware routing: if this is the dedicated guest portal host (e.g., stay.thebrowns.co.za),
  // only serve guest-facing routes and block staff/ops routes to prevent CRM leakage
  if (isGuestPortalHost(host || undefined)) {
    if (isGuestRoute(pathname)) {
      // Allow guest routes on the portal host
      return response
    } else {
      // Block staff/ops routes on the portal host
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      )
    }
  }

  // Skip auth for static files and API routes that don't need auth
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/health') ||
    request.nextUrl.pathname.startsWith('/api/staff-auth') ||
    request.nextUrl.pathname.startsWith('/api/inbound/webhook') ||
    request.nextUrl.pathname.startsWith('/api/inbound/email') ||
    request.nextUrl.pathname.startsWith('/api/bridge') ||
    request.nextUrl.pathname.startsWith('/api/cron') ||
    request.nextUrl.pathname.startsWith('/api/drafts') ||
    request.nextUrl.pathname.startsWith('/api/public') ||
    request.nextUrl.pathname.startsWith('/api/guest-portal') ||
    request.nextUrl.pathname.startsWith('/guest') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return response
  }

  // Check if staff password is required (production only)
  const staffPassword = process.env.STAFF_PASSWORD
  
  // Skip auth in development if no password is set
  if (!staffPassword && process.env.NODE_ENV === 'development') {
    return response
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('staff_auth')
  
  // Verify auth cookie matches password hash (simple approach for internal staff access)
  if (authCookie?.value === base64Encode(staffPassword || '')) {
    return response
  }

  // Redirect to login page if not authenticated
  if (request.nextUrl.pathname !== '/staff-login') {
    const loginUrl = new URL('/staff-login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /staff-login (login page itself)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     * - /public (public files)
     */
    '/((?!staff-login|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
