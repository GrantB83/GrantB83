/**
 * Shared active-guest booking predicates.
 * Cancelled / no-show and owner BLOCK placeholders are never guests.
 */

export const OWNER_BLOCK_GUEST_NAME = 'BLOCK'
export const CODES_UNRESOLVED_REASON = 'codes: property unresolved'

export const ACTIVE_GUEST_BOOKING_SQL = `
  LOWER(TRIM(COALESCE(status, ''))) NOT IN ('cancelled', 'canceled', 'no show')
  AND UPPER(TRIM(COALESCE(guest_name, ''))) != 'BLOCK'
`.replace(/\s+/g, ' ').trim()

export interface BookingFilterRow {
  guest_name?: string | null
  status?: string | null
}

export function isCancelledStatus(status?: string | null): boolean {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
  return normalized === 'cancelled' || normalized === 'canceled' || normalized === 'no show'
}

export function isOwnerBlock(row: BookingFilterRow | { guestName?: string | null }): boolean {
  const name =
    'guest_name' in row && row.guest_name != null
      ? row.guest_name
      : 'guestName' in row
        ? row.guestName
        : ''
  return String(name || '').trim().toUpperCase() === OWNER_BLOCK_GUEST_NAME
}

export function isActiveGuestBooking(row: BookingFilterRow): boolean {
  return !isCancelledStatus(row.status) && !isOwnerBlock(row)
}

export function filterActiveGuestBookings<T extends BookingFilterRow>(rows: T[]): T[] {
  return rows.filter(isActiveGuestBooking)
}
