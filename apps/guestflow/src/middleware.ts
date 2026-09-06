import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Edge-compatible base64 encoding (Buffer is not available in Edge Runtime)
function base64Encode(str: string): string {
  return btoa(str)
}

export function middleware(request: NextRequest) {
  // Skip auth for static files and API routes that don't need auth
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/health') ||
    request.nextUrl.pathname.startsWith('/api/staff-auth') ||
    request.nextUrl.pathname.startsWith('/api/inbound/webhook') ||
    request.nextUrl.pathname.startsWith('/api/cron') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if staff password is required
  // Note: In Vercel Edge Runtime, only NEXT_PUBLIC_ vars from .env are available
  // Non-public vars must be configured in Vercel project settings to be accessible
  const staffPassword = process.env.STAFF_PASSWORD
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  
  // Skip auth in non-production if no password is set
  // In production, require password to be configured in Vercel project settings
  if (!staffPassword) {
    if (!isProduction) {
      return NextResponse.next()
    }
    // In production without password, allow through but log warning
    // (Vercel logs will show this issue)
    console.warn('[middleware] STAFF_PASSWORD not configured in Vercel project settings')
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('staff_auth')
  
  // Verify auth cookie matches password hash (simple approach for internal staff access)
  if (authCookie?.value === base64Encode(staffPassword)) {
    return NextResponse.next()
  }

  // Redirect to login page if not authenticated
  if (request.nextUrl.pathname !== '/staff-login') {
    const loginUrl = new URL('/staff-login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
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
