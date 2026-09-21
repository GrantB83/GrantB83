/**
 * Nightsbridge UPSERT Core Logic
 * 
 * Handles incremental booking updates with durable identity (nbid + natural key fallback)
 * and window-based soft-cancel for disappeared bookings.
 */

import type { DbClient } from '@/lib/db'
import { format } from 'date-fns'

/**
 * Parsed booking from Nightsbridge import
 */
export interface ParsedBooking {
  guestName: string
  guest2?: string
  suiteOrUnit: string
  checkInDate: string
  checkOutDate: string
  status: string
  adults?: number
  children?: number
  notes?: string
  bookingId?: string // Nightsbridge booking ID (nbid)
  guestPhone?: string
  guestEmail?: string
  guestPhone2?: string
  guestEmail2?: string
  nights?: number
  lateCheckIn: boolean
}

/**
 * UPSERT result
 */
export interface UpsertResult {
  action: 'inserted' | 'updated' | 'unchanged'
  id: number
}

/**
 * Import window (date range covered by import file)
 */
export interface ImportWindow {
  minDate: string
  maxDate: string
}

/**
 * Import summary
 */
export interface ImportSummary {
  parsed: number
  inserted: number
  updated: number
  cancelled: number
  unchanged: number
  errors: string[]
}

/**
 * Normalize guest name: lowercase, trim, collapse whitespace
 */
export function normalizeGuestName(name: string): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
}

/**
 * Normalize suite/unit name: lowercase, trim, collapse whitespace
 */
export function normalizeSuite(suite: string): string {
  if (!suite) return ''
  return suite
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Upsert a single booking using durable identity (nbid + natural key fallback)
 * 
 * @param db - Database client (async-compatible)
 * @param booking - Parsed booking from Nightsbridge
 * @param tenantId - Tenant ID
 * @param batchId - Import batch UUID
 * @returns UpsertResult with action and id
 */
export async function upsertBooking(
  db: DbClient,
  booking: ParsedBooking,
  tenantId: number,
  batchId: string
): Promise<UpsertResult> {
  const guestNameNorm = normalizeGuestName(booking.guestName)
  const suiteOrUnitNorm = normalizeSuite(booking.suiteOrUnit)
  
  const now = new Date().toISOString()

  // First, try to find existing booking by nbid (if present)
  let existingBooking: any = null
  
  if (booking.bookingId) {
    existingBooking = await db.prepare(`
      SELECT id, guest_phone, status, adults, children, notes, late_check_in 
      FROM bookings 
      WHERE tenant_id = ? AND nightsbridge_booking_id = ?
    `).get(tenantId, booking.bookingId)
  }

  // Fallback: Try to find by natural key
  if (!existingBooking) {
    existingBooking = await db.prepare(`
      SELECT id, guest_phone, status, adults, children, notes, late_check_in 
      FROM bookings 
      WHERE tenant_id = ? 
        AND guest_name_norm = ? 
        AND check_in = ? 
        AND check_out = ? 
        AND suite_or_unit_norm = ?
    `).get(tenantId, guestNameNorm, booking.checkInDate, booking.checkOutDate, suiteOrUnitNorm)
  }

  if (existingBooking) {
    // Check if any mutable fields changed
    const hasChanges = 
      (booking.guestPhone || booking.guestPhone2 || '') !== (existingBooking.guest_phone || '') ||
      booking.status !== existingBooking.status ||
      (booking.adults || 2) !== existingBooking.adults ||
      (booking.children || 0) !== existingBooking.children ||
      (booking.notes || '') !== (existingBooking.notes || '') ||
      (booking.lateCheckIn ? 1 : 0) !== existingBooking.late_check_in

    if (!hasChanges) {
      // No changes, return unchanged
      return { action: 'unchanged', id: existingBooking.id }
    }

    // Update existing booking (mutable fields only)
    await db.prepare(`
      UPDATE bookings
      SET guest_phone = ?,
          status = ?,
          adults = ?,
          children = ?,
          notes = ?,
          late_check_in = ?,
          updated_at = ?,
          last_import_at = ?,
          import_batch_id = ?,
          nightsbridge_booking_id = ?
      WHERE id = ?
    `).run(
      booking.guestPhone || booking.guestPhone2 || '',
      booking.status,
      booking.adults || 2,
      booking.children || 0,
      booking.notes || '',
      booking.lateCheckIn ? 1 : 0,
      now,
      now,
      batchId,
      booking.bookingId || null,
      existingBooking.id
    )

    return { action: 'updated', id: existingBooking.id }
  } else {
    // Insert new booking
    const result: any = await db.prepare(`
      INSERT INTO bookings (
        tenant_id, 
        guest_name, 
        guest_name_norm,
        suite_or_unit, 
        suite_or_unit_norm,
        check_in, 
        check_out,
        adults, 
        children, 
        notes, 
        late_check_in, 
        guest_phone, 
        status,
        nightsbridge_booking_id,
        last_import_at,
        import_batch_id,
        source,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId,
      booking.guestName,
      guestNameNorm,
      booking.suiteOrUnit,
      suiteOrUnitNorm,
      booking.checkInDate,
      booking.checkOutDate,
      booking.adults || 2,
      booking.children || 0,
      booking.notes || '',
      booking.lateCheckIn ? 1 : 0,
      booking.guestPhone || booking.guestPhone2 || '',
      booking.status,
      booking.bookingId || null,
      now,
      batchId,
      'nb',
      now,
      now
    )

    return { action: 'inserted', id: result.lastInsertRowid as number }
  }
}

/**
 * Determine the import window (min/max dates) from parsed bookings
 * 
 * @param parsedBookings - Array of parsed bookings
 * @returns ImportWindow with minDate and maxDate
 */
export function determineImportWindow(parsedBookings: ParsedBooking[]): ImportWindow {
  if (parsedBookings.length === 0) {
    const today = format(new Date(), 'yyyy-MM-dd')
    return { minDate: today, maxDate: today }
  }

  let minDate = parsedBookings[0].checkInDate
  let maxDate = parsedBookings[0].checkOutDate

  for (const booking of parsedBookings) {
    if (booking.checkInDate < minDate) {
      minDate = booking.checkInDate
    }
    if (booking.checkOutDate > maxDate) {
      maxDate = booking.checkOutDate
    }
  }

  return { minDate, maxDate }
}

/**
 * Soft-cancel bookings that disappeared from the import window
 * 
 * @param db - Database client (async-compatible)
 * @param tenantId - Tenant ID
 * @param importWindow - Date range covered by this import
 * @param batchId - Import batch UUID
 * @param parsedBookings - Current parsed bookings (to exclude from cancellation)
 * @returns Number of bookings cancelled
 */
export async function softCancelDisappearedBookings(
  db: DbClient,
  tenantId: number,
  importWindow: ImportWindow,
  batchId: string,
  parsedBookings: ParsedBooking[]
): Promise<number> {
  // Get all bookings in the import window
  const existingInWindow = await db.prepare(`
    SELECT id, guest_name_norm, check_in, check_out, suite_or_unit_norm, nightsbridge_booking_id, last_import_at
    FROM bookings
    WHERE tenant_id = ?
      AND status != 'cancelled'
      AND check_in >= ?
      AND check_out <= ?
  `).all(tenantId, importWindow.minDate, importWindow.maxDate) as Array<{
    id: number
    guest_name_norm: string
    check_in: string
    check_out: string
    suite_or_unit_norm: string
    nightsbridge_booking_id: string | null
    last_import_at: string | null
  }>

  let cancelledCount = 0

  for (const existing of existingInWindow) {
    // Check if this booking exists in current parsed bookings
    const existsInImport = parsedBookings.some(parsed => {
      const parsedNameNorm = normalizeGuestName(parsed.guestName)
      const parsedSuiteNorm = normalizeSuite(parsed.suiteOrUnit)

      // Match by nbid if both have it
      if (existing.nightsbridge_booking_id && parsed.bookingId) {
        return existing.nightsbridge_booking_id === parsed.bookingId
      }

      // Match by natural key
      return (
        parsedNameNorm === existing.guest_name_norm &&
        parsed.checkInDate === existing.check_in &&
        parsed.checkOutDate === existing.check_out &&
        parsedSuiteNorm === existing.suite_or_unit_norm
      )
    })

    if (!existsInImport) {
      // Booking disappeared from import window → soft-cancel
      await db.prepare(`
        UPDATE bookings
        SET status = 'cancelled',
            last_seen_import_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(existing.last_import_at || new Date().toISOString(), existing.id)

      cancelledCount++
    }
  }

  return cancelledCount
}
