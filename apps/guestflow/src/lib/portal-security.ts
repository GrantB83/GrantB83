/**
 * Guest Portal security window (Sprint 5).
 * Open: check-in day 14:00 Africa/Johannesburg
 * Close: departure day 12:00 Africa/Johannesburg
 */

import { bookingDateOnly } from './umi-sort'

export const PORTAL_SECURITY_TIME_ZONE = 'Africa/Johannesburg'
export const PORTAL_SSID = 'The Browns Guests'
export const PORTAL_PRE_SECURITY_COPY =
  'Access codes appear on check-in day from 14:00.'
export const PORTAL_POST_SECURITY_COPY = 'Stay security details have been rescinded.'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Calendar + clock in Africa/Johannesburg for `now`. */
export function sastDateTimeParts(now: Date = new Date()): {
  date: string
  hour: number
  minute: number
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PORTAL_SECURITY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

function sastMinutes(date: string, hour: number, minute = 0): number {
  return Date.parse(`${date}T${pad(hour)}:${pad(minute)}:00+02:00`)
}

/**
 * True from check-in 14:00 SAST through departure 12:00 SAST inclusive of the
 * open instant and exclusive after the close instant.
 */
export function isPortalSecurityOpen(
  checkInDate: string,
  checkOutDate: string,
  now: Date = new Date()
): boolean {
  const checkIn = bookingDateOnly(checkInDate)
  const checkOut = bookingDateOnly(checkOutDate)
  if (!checkIn || !checkOut) return false
  const nowMs = now.getTime()
  const openMs = sastMinutes(checkIn, 14, 0)
  const closeMs = sastMinutes(checkOut, 12, 0)
  if (!Number.isFinite(openMs) || !Number.isFinite(closeMs)) return false
  return nowMs >= openMs && nowMs < closeMs
}

export function portalSecurityCopy(
  checkInDate: string,
  checkOutDate: string,
  now: Date = new Date()
): { open: boolean; message: string } {
  const open = isPortalSecurityOpen(checkInDate, checkOutDate, now)
  if (open) return { open, message: '' }
  const checkOut = bookingDateOnly(checkOutDate)
  const nowDate = sastDateTimeParts(now)
  if (checkOut && nowDate.date > checkOut) {
    return { open, message: PORTAL_POST_SECURITY_COPY }
  }
  if (checkOut && nowDate.date === checkOut && nowDate.hour >= 12) {
    return { open, message: PORTAL_POST_SECURITY_COPY }
  }
  return { open, message: PORTAL_PRE_SECURITY_COPY }
}
