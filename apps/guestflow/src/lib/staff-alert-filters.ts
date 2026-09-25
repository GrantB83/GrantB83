/**
 * Alert exclusion filters for test threads, smoke markers, and empty BLOCK bookings.
 * Used by staff-alerts.ts to reduce false-positive alert noise.
 */

import type { DbClient } from '@/lib/db'

/**
 * Check if a thread should be excluded from staff alerts based on test phone number.
 * Checks against known test phone patterns with normalization.
 * 
 * @param fromNumber - Phone number or email from the thread
 * @param testPhones - Set of known test phone numbers
 * @returns true if thread is from a test phone and should be excluded
 */
export function isTestPhoneThread(
  fromNumber: string | null | undefined,
  testPhones: Set<string>
): boolean {
  const raw = String(fromNumber || '').trim()
  if (!raw) return false
  
  // Check exact match
  if (testPhones.has(raw)) return true
  
  // Check normalized (digits only)
  const digits = raw.replace(/\D/g, '')
  if (testPhones.has(digits) || testPhones.has(`+${digits}`)) return true
  
  return false
}

/**
 * Check if a thread should be excluded from staff alerts based on smoke test markers.
 * Checks guest_name and metadata.subject for explicit test patterns.
 * Uses specific markers to avoid false positives on real guest names.
 * 
 * @param thread - Thread object with guest_name and metadata fields
 * @returns true if thread has smoke test markers and should be excluded
 */
export function isSmokeTestThread(thread: {
  guest_name?: string | null
  metadata?: string | null
}): boolean {
  // Check guest_name for explicit smoke test markers
  const name = String(thread.guest_name || '').toUpperCase()
  
  // Match specific probe patterns: T-44, T-48, thread 44, thread 48, inbound thread XX
  // Avoid over-broad T-\d+ that could match real guests with "T-" in names
  if (name.match(/^T-(44|48|PROBE|TEST)\b/)) return true
  if (name.match(/^(INBOUND\s+)?THREAD\s+(44|48)\b/)) return true
  if (name.match(/GF-INBOUND-TEST/)) return true
  
  // Check metadata.subject for explicit test markers
  try {
    const meta = thread.metadata ? JSON.parse(thread.metadata) : {}
    const subject = String(meta.subject || '').toUpperCase()
    if (subject.match(/GF-INBOUND-TEST/)) return true
    if (subject.match(/\bSMOKE\s+TEST\b/)) return true
    if (subject.match(/^TEST\s+(MESSAGE|THREAD)\b/)) return true
  } catch {
    // Invalid JSON or missing subject - not a smoke test
  }
  
  return false
}

/**
 * Check if a thread is an empty BLOCK booking that should be excluded from alerts.
 * A BLOCK booking with 0 actual inbound guest messages should not trigger alerts.
 * If the booking later receives messages, it should start alerting normally.
 * 
 * @param db - Database client
 * @param thread - Thread object with id and booking_id
 * @returns Promise<true> if thread is empty BLOCK booking and should be excluded
 */
export async function isEmptyBlockBooking(
  db: DbClient,
  thread: { id: number; booking_id: number | null }
): Promise<boolean> {
  // No booking = not a BLOCK booking
  if (!thread.booking_id) return false
  
  // Get booking guest_name
  let booking: { guest_name?: string } | undefined
  try {
    booking = (await db
      .prepare(`SELECT guest_name FROM bookings WHERE id = ?`)
      .get(thread.booking_id)) as { guest_name?: string } | undefined
  } catch {
    return false
  }
  
  if (!booking) return false
  
  // Check if guest_name matches BLOCK/owner-block patterns
  // Match "BLOCK", "BLOCK 5376", "OWNER BLOCK" but NOT bare guest names
  const name = String(booking.guest_name || '').toUpperCase()
  if (!name.match(/\b(BLOCK|OWNER\s+BLOCK)\b/)) return false
  
  // Count inbound messages (not outbound, not spam)
  let count: { c: number } | undefined
  try {
    count = (await db
      .prepare(
        `SELECT COUNT(*) as c FROM inbound_messages
         WHERE thread_id = ? 
           AND (direction IS NULL OR direction = 'inbound')
           AND COALESCE(is_spam, 0) = 0`
      )
      .get(thread.id)) as { c: number } | undefined
  } catch {
    return false
  }
  
  // If 0 inbound messages, this is an empty BLOCK booking - exclude from alerts
  return Number(count?.c || 0) === 0
}

/**
 * Main exclusion check - should this thread be excluded from staff alerts?
 * Combines all exclusion criteria: test phones, smoke markers, empty BLOCK bookings.
 * 
 * @param db - Database client
 * @param thread - Thread object to check
 * @param testPhones - Set of known test phone numbers
 * @returns Promise with exclusion result and optional reason for debugging
 */
export async function shouldExcludeFromAlerts(
  db: DbClient,
  thread: {
    id: number
    from_number?: string | null
    guest_name?: string | null
    metadata?: string | null
    booking_id?: number | null
  },
  testPhones: Set<string>
): Promise<{ excluded: boolean; reason?: string }> {
  // Check 1: Test phone (cheapest - in-memory set lookup)
  if (isTestPhoneThread(thread.from_number, testPhones)) {
    return { excluded: true, reason: 'test_phone' }
  }
  
  // Check 2: Smoke test marker (cheap - string pattern match)
  if (isSmokeTestThread(thread)) {
    return { excluded: true, reason: 'smoke_marker' }
  }
  
  // Check 3: Empty BLOCK booking (most expensive - DB query)
  if (await isEmptyBlockBooking(db, thread)) {
    return { excluded: true, reason: 'empty_block' }
  }
  
  return { excluded: false }
}
