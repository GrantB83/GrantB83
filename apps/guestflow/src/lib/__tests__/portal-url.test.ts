import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  getPortalBaseUrl, 
  getGuestPortalUrl, 
  isGuestPortalHost, 
  isGuestRoute,
  getClientPortalBaseUrl,
  getClientGuestPortalUrl
} from '../portal-url'

describe('portal-url', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getPortalBaseUrl', () => {
    it('should use NEXT_PUBLIC_PORTAL_BASE_URL if set', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(getPortalBaseUrl()).toBe('https://stay.thebrowns.co.za')
    })

    it('should remove trailing slash from NEXT_PUBLIC_PORTAL_BASE_URL', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za/'
      expect(getPortalBaseUrl()).toBe('https://stay.thebrowns.co.za')
    })

    it('should use request host if NEXT_PUBLIC_PORTAL_BASE_URL not set', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      expect(getPortalBaseUrl('guestflow.thebrowns.co.za')).toBe('https://guestflow.thebrowns.co.za')
    })

    it('should use http for localhost', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      expect(getPortalBaseUrl('localhost:3100')).toBe('http://localhost:3100')
    })

    it('should use VERCEL_URL if no portal base URL or request host', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      process.env.VERCEL_URL = 'browns-guestflow.vercel.app'
      expect(getPortalBaseUrl()).toBe('https://browns-guestflow.vercel.app')
    })

    it('should use NEXT_PUBLIC_BASE_URL if no portal base URL, request host, or VERCEL_URL', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      delete process.env.VERCEL_URL
      process.env.NEXT_PUBLIC_BASE_URL = 'https://my-custom-base.com'
      expect(getPortalBaseUrl()).toBe('https://my-custom-base.com')
    })

    it('should fall back to hardcoded default', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      delete process.env.VERCEL_URL
      delete process.env.NEXT_PUBLIC_BASE_URL
      expect(getPortalBaseUrl()).toBe('https://guestflow.thebrowns.co.za')
    })

    it('should prioritize NEXT_PUBLIC_PORTAL_BASE_URL over request host', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(getPortalBaseUrl('guestflow.thebrowns.co.za')).toBe('https://stay.thebrowns.co.za')
    })
  })

  describe('getGuestPortalUrl', () => {
    it('should construct full portal URL with token', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(getGuestPortalUrl('abc123xyz')).toBe('https://stay.thebrowns.co.za/guest/abc123xyz')
    })

    it('should use request host when portal base URL not set', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      expect(getGuestPortalUrl('token456', 'guestflow.thebrowns.co.za')).toBe('https://guestflow.thebrowns.co.za/guest/token456')
    })

    it('should handle numeric tokens converted to strings', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(getGuestPortalUrl('12345')).toBe('https://stay.thebrowns.co.za/guest/12345')
    })
  })

  describe('isGuestPortalHost', () => {
    it('should return true when host matches portal base URL', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(isGuestPortalHost('stay.thebrowns.co.za')).toBe(true)
    })

    it('should be case insensitive', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(isGuestPortalHost('STAY.THEBROWNS.CO.ZA')).toBe(true)
    })

    it('should return false when host does not match', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(isGuestPortalHost('guestflow.thebrowns.co.za')).toBe(false)
    })

    it('should return false when portal base URL not set', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      expect(isGuestPortalHost('stay.thebrowns.co.za')).toBe(false)
    })

    it('should return false when host is undefined', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(isGuestPortalHost(undefined)).toBe(false)
    })

    it('should handle portal base URL with port', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'http://localhost:3100'
      expect(isGuestPortalHost('localhost:3100')).toBe(true)
    })
  })

  describe('isGuestRoute', () => {
    it('should return true for /guest/ routes', () => {
      expect(isGuestRoute('/guest/abc123')).toBe(true)
    })

    it('should return true for /api/guest-portal/ routes', () => {
      expect(isGuestRoute('/api/guest-portal/token123')).toBe(true)
    })

    it('should return true for /api/public/ routes', () => {
      expect(isGuestRoute('/api/public/contact')).toBe(true)
    })

    it('should return true for /_next/ routes', () => {
      expect(isGuestRoute('/_next/static/css/app.css')).toBe(true)
    })

    it('should return true for /favicon.ico', () => {
      expect(isGuestRoute('/favicon.ico')).toBe(true)
    })

    it('should return true for /api/health', () => {
      expect(isGuestRoute('/api/health')).toBe(true)
    })

    it('should return false for staff routes', () => {
      expect(isGuestRoute('/ops')).toBe(false)
      expect(isGuestRoute('/ops/bookings')).toBe(false)
      expect(isGuestRoute('/staff-login')).toBe(false)
      expect(isGuestRoute('/crm')).toBe(false)
    })

    it('should return false for staff API routes', () => {
      expect(isGuestRoute('/api/bookings')).toBe(false)
      expect(isGuestRoute('/api/leads')).toBe(false)
      expect(isGuestRoute('/api/staff-auth')).toBe(false)
    })
  })

  describe('getClientPortalBaseUrl', () => {
    it('should use NEXT_PUBLIC_PORTAL_BASE_URL if set', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(getClientPortalBaseUrl()).toBe('https://stay.thebrowns.co.za')
    })

    it('should remove trailing slash from NEXT_PUBLIC_PORTAL_BASE_URL', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za/'
      expect(getClientPortalBaseUrl()).toBe('https://stay.thebrowns.co.za')
    })

    it('should fall back to hardcoded default in server environment', () => {
      delete process.env.NEXT_PUBLIC_PORTAL_BASE_URL
      expect(getClientPortalBaseUrl()).toBe('https://guestflow.thebrowns.co.za')
    })
  })

  describe('getClientGuestPortalUrl', () => {
    it('should construct full portal URL with token', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(getClientGuestPortalUrl('abc123xyz')).toBe('https://stay.thebrowns.co.za/guest/abc123xyz')
    })

    it('should handle numeric-like tokens', () => {
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL = 'https://stay.thebrowns.co.za'
      expect(getClientGuestPortalUrl('12345')).toBe('https://stay.thebrowns.co.za/guest/12345')
    })
  })
})
