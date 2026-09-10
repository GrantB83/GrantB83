/**
 * Portal URL utilities for guest-facing links
 * 
 * Supports splitting guest portal onto a separate domain (e.g., stay.thebrowns.co.za)
 * while keeping staff ops on the main GuestFlow host (guestflow.thebrowns.co.za)
 */

/**
 * Get the base URL for guest portal links
 * 
 * Priority order:
 * 1. NEXT_PUBLIC_PORTAL_BASE_URL (if set) - allows explicit configuration
 * 2. Current request host (if provided) - respects the incoming host
 * 3. VERCEL_URL / NEXT_PUBLIC_BASE_URL - deployment defaults
 * 4. Hardcoded fallback - guestflow.thebrowns.co.za
 * 
 * @param requestHost - Optional host from the incoming request (e.g., req.headers.host)
 * @returns Base URL for constructing guest portal links (without trailing slash)
 */
export function getPortalBaseUrl(requestHost?: string): string {
  // Priority 1: Explicit portal base URL override
  if (process.env.NEXT_PUBLIC_PORTAL_BASE_URL) {
    return process.env.NEXT_PUBLIC_PORTAL_BASE_URL.replace(/\/$/, '')
  }

  // Priority 2: Use the current request host if provided
  if (requestHost) {
    const protocol = requestHost.includes('localhost') ? 'http' : 'https'
    return `${protocol}://${requestHost}`
  }

  // Priority 3: Deployment environment URLs
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
  }

  // Priority 4: Hardcoded fallback
  return 'https://guestflow.thebrowns.co.za'
}

/**
 * Construct a full guest portal URL for a specific token/code
 * 
 * @param token - The guest magic link token
 * @param requestHost - Optional host from the incoming request
 * @returns Full URL to the guest portal page
 */
export function getGuestPortalUrl(token: string, requestHost?: string): string {
  const baseUrl = getPortalBaseUrl(requestHost)
  return `${baseUrl}/guest/${token}`
}

/**
 * Check if a given host is the dedicated guest portal host
 * Used by middleware to determine if we should restrict to guest-only routes
 * 
 * @param host - The request host to check (may include port)
 * @returns true if this is the dedicated guest portal host (e.g., stay.thebrowns.co.za)
 */
export function isGuestPortalHost(host?: string): boolean {
  if (!host) return false
  
  const portalBaseUrl = process.env.NEXT_PUBLIC_PORTAL_BASE_URL
  if (!portalBaseUrl) return false

  // Extract hostname and port from NEXT_PUBLIC_PORTAL_BASE_URL
  try {
    const portalUrl = new URL(portalBaseUrl)
    const portalHostWithPort = portalUrl.port 
      ? `${portalUrl.hostname}:${portalUrl.port}`
      : portalUrl.hostname
    
    return host.toLowerCase() === portalHostWithPort.toLowerCase()
  } catch {
    return false
  }
}

/**
 * Check if a given pathname is a guest-facing route
 * Used by middleware to determine what routes to allow on the portal host
 * 
 * @param pathname - The request pathname
 * @returns true if this is a guest-accessible route
 */
export function isGuestRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/guest/') ||
    pathname.startsWith('/api/guest-portal/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/api/health'
  )
}

/**
 * Client-side helper to get portal base URL
 * Uses NEXT_PUBLIC_PORTAL_BASE_URL if set, otherwise falls back to current origin
 * 
 * @returns Base URL for constructing guest portal links (without trailing slash)
 */
export function getClientPortalBaseUrl(): string {
  // Use configured portal base URL if set (works in both client and server for Next.js)
  if (process.env.NEXT_PUBLIC_PORTAL_BASE_URL) {
    return process.env.NEXT_PUBLIC_PORTAL_BASE_URL.replace(/\/$/, '')
  }
  
  // Fallback to current origin for client-side
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Server-side fallback (shouldn't be called from client components but safe)
  return 'https://guestflow.thebrowns.co.za'
}

/**
 * Client-side helper to construct a full guest portal URL
 * 
 * @param token - The guest magic link token
 * @returns Full URL to the guest portal page
 */
export function getClientGuestPortalUrl(token: string): string {
  const baseUrl = getClientPortalBaseUrl()
  return `${baseUrl}/guest/${token}`
}
