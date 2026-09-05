import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip auth for static files and API routes that don't need auth
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/health') ||
    request.nextUrl.pathname.startsWith('/api/staff-auth') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if staff password is required (production only)
  const staffPassword = process.env.STAFF_PASSWORD
  
  // Skip auth in development if no password is set
  if (!staffPassword && process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('staff_auth')
  
  // Verify auth cookie matches password hash (simple approach for internal staff access)
  if (authCookie?.value === Buffer.from(staffPassword || '').toString('base64')) {
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
