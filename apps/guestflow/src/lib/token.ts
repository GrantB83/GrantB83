import { createHash, randomBytes } from 'crypto'
import { isPortalSecurityOpen } from './portal-security'

/**
 * Generate a cryptographically secure random token
 * Returns both the raw token (to send to guest) and its hash (to store in DB)
 */
export function generateGuestToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url') // URL-safe base64
  const hash = hashToken(token)
  return { token, hash }
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Calculate token expiry date
 * Valid from confirmation through checkout + buffer days
 */
export function calculateTokenExpiry(checkOutDate: string, bufferDays: number = 14): Date {
  const checkOut = new Date(checkOutDate)
  const expiry = new Date(checkOut)
  expiry.setDate(expiry.getDate() + bufferDays)
  return expiry
}

/**
 * Check if we're in the stay window for time-gating sensitive info
 * Returns: 'pre-stay' | 'during-stay' | 'post-checkout'
 */
export function getStayPhase(checkInDate: string, checkOutDate: string): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today
  
  const checkIn = new Date(checkInDate)
  checkIn.setHours(0, 0, 0, 0)
  
  const checkOut = new Date(checkOutDate)
  checkOut.setHours(23, 59, 59, 999) // End of checkout day
  
  if (now < checkIn) {
    return 'pre-stay'
  } else if (now <= checkOut) {
    return 'during-stay'
  } else {
    return 'post-checkout'
  }
}

/**
 * Check if we should show access codes (time-gated).
 * Sprint 5: check-in day 14:00 SAST through departure 12:00 SAST.
 */
export function shouldShowAccessCodes(
  checkInDate: string,
  checkOutDate: string,
  now: Date = new Date()
): boolean {
  return isPortalSecurityOpen(checkInDate, checkOutDate, now)
}
