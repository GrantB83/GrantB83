/**
 * ONE settings module for staff alerts and Nightsbridge sync.
 * Thresholds, hours, and cooldowns live here — do not copy them elsewhere.
 * Africa/Johannesburg has no DST (UTC+2 year-round).
 */

export const OPS_TIMEZONE = 'Africa/Johannesburg'
export const SAST_OFFSET_MINUTES = 2 * 60

export const OPS_SETTINGS = Object.freeze({
  timezone: OPS_TIMEZONE,
  staffHoursStartHour: 7,
  staffHoursStartMinute: 0,
  staffHoursEndHour: 21,
  staffHoursEndMinute: 0,
  unansweredMinutes: 30,
  digestHour: 7,
  digestMinute: 0,
  nbMissedImportHours: 14,
  nbForwardSilentDays: 7,
  alertCooldownHours: 2,
  healthFailThreshold: 2,
  healthCheckMinutesMin: 5,
  healthCheckMinutesMax: 10,
  massCancelDropRatio: 0.5,
  brownsBbid: '24299',
  sisterBbids: Object.freeze(['18053', '24847']),
  propertyNameNeedles: Object.freeze(["the browns", "the browns'"]),
  propertyOwnEmails: Object.freeze(['@thebrowns.co.za', '@hospitality.partners']),
  propertyOwnPhones: Object.freeze(['+27130000000']),
})

export type OpsSettings = typeof OPS_SETTINGS

export function getOpsSettings(): OpsSettings {
  return OPS_SETTINGS
}

export interface SastParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  dateKey: string
}

export function toSastParts(at: Date): SastParts {
  const shifted = new Date(at.getTime() + SAST_OFFSET_MINUTES * 60 * 1000)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()
  const hour = shifted.getUTCHours()
  const minute = shifted.getUTCMinutes()
  const second = shifted.getUTCSeconds()
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { year, month, day, hour, minute, second, dateKey }
}

export function sastDateKey(at: Date): string {
  return toSastParts(at).dateKey
}

/** Staff hours are [07:00, 21:00) SAST. 07:00 inclusive, 21:00 exclusive. */
export function isWithinStaffHours(at: Date, settings: OpsSettings = OPS_SETTINGS): boolean {
  const parts = toSastParts(at)
  const minutes = parts.hour * 60 + parts.minute
  const start = settings.staffHoursStartHour * 60 + settings.staffHoursStartMinute
  const end = settings.staffHoursEndHour * 60 + settings.staffHoursEndMinute
  return minutes >= start && minutes < end
}

export function addMinutes(at: Date, minutes: number): Date {
  return new Date(at.getTime() + minutes * 60 * 1000)
}

export function hoursBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (60 * 60 * 1000)
}

export function minutesBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (60 * 1000)
}

export type UnansweredAction = 'wait' | 'alert' | 'digest'

/**
 * 30-minute unanswered rule + overnight digest.
 * Overnight / after-hours inbounds wait for the 07:00 SAST digest.
 * Inbounds during staff hours alert once the threshold has passed, still inside staff hours.
 * If the 30-minute mark falls at or after 21:00 SAST, hold for the digest.
 */
export function classifyUnanswered(input: {
  inboundAt: Date
  now: Date
  settings?: OpsSettings
}): UnansweredAction {
  const settings = input.settings || OPS_SETTINGS
  if (minutesBetween(input.now, input.inboundAt) < settings.unansweredMinutes) {
    return 'wait'
  }
  const dueAt = addMinutes(input.inboundAt, settings.unansweredMinutes)
  const inboundInHours = isWithinStaffHours(input.inboundAt, settings)
  const dueInHours = isWithinStaffHours(dueAt, settings)
  const nowInHours = isWithinStaffHours(input.now, settings)
  if (inboundInHours && dueInHours && nowInHours) {
    return 'alert'
  }
  if (!nowInHours) {
    return 'digest'
  }
  return 'digest'
}

export function isDigestWindow(now: Date, settings: OpsSettings = OPS_SETTINGS): boolean {
  if (!isWithinStaffHours(now, settings)) return false
  const parts = toSastParts(now)
  return parts.hour >= settings.digestHour
}

export function staffAppBaseUrl(): string {
  const fromEnv =
    process.env.GUESTFLOW_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    ''
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'https://guestflow.thebrowns.co.za'
}

export function staffThreadPath(threadId: number): string {
  return `${staffAppBaseUrl()}/?thread=${threadId}`
}

export function staffBookingPath(bookingId: number): string {
  return `${staffAppBaseUrl()}/ops/arrivals-departures?booking=${bookingId}`
}
