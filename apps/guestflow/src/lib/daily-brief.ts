/**
 * Daily ops brief builder for Browns Dullstroom staff Ops Hub.
 * Mirrors tools/browns-daily-ops-brief patterns — draft only, no invented data.
 */

import { isActiveGuestBooking, isOwnerBlock } from './booking-filters'
import { UNKNOWN_PROPERTY_LABEL } from './property-resolve'

export type DerivedStatus = 'arriving' | 'inhouse' | 'departing'

export interface RawBookingRow {
  id: number
  guest_name?: string | null
  guest_phone?: string | null
  property_name?: string | null
  room_number?: string | null
  suite_or_unit?: string | null
  check_in: string
  check_out: string
  adults?: number | null
  children?: number | null
  notes?: string | null
  late_check_in?: number | boolean | null
  pets?: boolean | number | null
  special_requests?: string | null
  status?: string | null
}

export interface DailyBriefBooking {
  id: number
  guestName: string
  propertyName: string
  roomNumber: string
  suiteOrUnit: string
  checkIn: string
  checkOut: string
  derivedStatus: DerivedStatus
  lateCheckIn: boolean
  missingFields: string[]
  adults?: number
  children?: number
  pets?: boolean
  specialRequests?: string
  guest_name: string
  property_name: string
  room_number: string
  check_in: string
  check_out: string
  derivedStatusLegacy: DerivedStatus
  lateCheckInLegacy: boolean
  missingFieldsLegacy: string[]
  special_requests?: string
}

export interface DailyBriefDaySlice {
  date: string
  arrivals: DailyBriefBooking[]
  departures: DailyBriefBooking[]
  inHouse: DailyBriefBooking[]
}

export interface EmptySuiteFlag {
  unit: string
  propertyName: string
  reason: string
}

export interface DailyBriefExceptions {
  lateCheckIns: DailyBriefBooking[]
  missingData: DailyBriefBooking[]
  emptySuites: EmptySuiteFlag[]
}

export interface DailyBriefSnapshot {
  tenantId: number
  tenantName: string
  targetDate: string
  tomorrowDate: string
  today: DailyBriefDaySlice
  tomorrow: DailyBriefDaySlice
  exceptions: DailyBriefExceptions
  generatedAt: string
  ownerBlocksToday?: number
}

const LATE_KEYWORDS = ['late', 'after-hours', 'after hours', 'delayed']

export function normalizeDate(value: string): string {
  return value.split('T')[0]
}

export function addDaysToDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().split('T')[0]
}

export function deriveBookingStatus(
  checkIn: string,
  checkOut: string,
  targetDate: string
): DerivedStatus | null {
  const checkInDate = normalizeDate(checkIn)
  const checkOutDate = normalizeDate(checkOut)

  if (checkInDate === targetDate) return 'arriving'
  if (checkOutDate === targetDate) return 'departing'
  if (checkInDate < targetDate && checkOutDate > targetDate) return 'inhouse'
  return null
}

export function inferLateCheckIn(row: RawBookingRow): boolean {
  if (row.late_check_in === 1 || row.late_check_in === true) return true
  const notes = (row.notes || row.special_requests || '').toLowerCase()
  return LATE_KEYWORDS.some((kw) => notes.includes(kw))
}

export function detectMissingFields(row: RawBookingRow): string[] {
  const missing: string[] = []
  if (!row.guest_name || row.guest_name.trim() === '') missing.push('guest_name')
  if (!row.guest_phone || row.guest_phone.trim() === '') missing.push('guest_phone')
  const unit = row.suite_or_unit || row.room_number
  if (!unit || unit.trim() === '') missing.push('suite_or_unit')
  return missing
}

function enrichBooking(row: RawBookingRow, targetDate: string): DailyBriefBooking | null {
  const status = deriveBookingStatus(row.check_in, row.check_out, targetDate)
  if (!status) return null

  const suiteOrUnit = (row.suite_or_unit || row.room_number || '').trim()
  const roomNumber = (row.room_number || row.suite_or_unit || '').trim()
  const missingFields = detectMissingFields(row)
  const lateCheckIn = inferLateCheckIn(row)
  const guestName = (row.guest_name || '').trim() || '[MISSING GUEST NAME]'
  const propertyName = (row.property_name || UNKNOWN_PROPERTY_LABEL).trim()
  const specialRequests = row.special_requests || row.notes || undefined

  return {
    id: row.id,
    guestName,
    propertyName,
    roomNumber: roomNumber || 'TBD',
    suiteOrUnit: suiteOrUnit || 'TBD',
    checkIn: normalizeDate(row.check_in),
    checkOut: normalizeDate(row.check_out),
    derivedStatus: status,
    lateCheckIn,
    missingFields,
    adults: row.adults ?? undefined,
    children: row.children ?? undefined,
    pets: row.pets === true || row.pets === 1,
    specialRequests,
    guest_name: guestName,
    property_name: propertyName,
    room_number: roomNumber || 'TBD',
    check_in: normalizeDate(row.check_in),
    check_out: normalizeDate(row.check_out),
    derivedStatusLegacy: status,
    lateCheckInLegacy: lateCheckIn,
    missingFieldsLegacy: missingFields,
    special_requests: specialRequests,
  }
}

export function buildDaySlice(rows: RawBookingRow[], date: string): DailyBriefDaySlice {
  const enriched = rows
    .map((row) => enrichBooking(row, date))
    .filter((b): b is DailyBriefBooking => b !== null)

  return {
    date,
    arrivals: enriched.filter((b) => b.derivedStatus === 'arriving'),
    departures: enriched.filter((b) => b.derivedStatus === 'departing'),
    inHouse: enriched.filter((b) => b.derivedStatus === 'inhouse'),
  }
}

export function detectEmptySuites(
  rows: RawBookingRow[],
  targetDate: string,
  tomorrowDate: string
): EmptySuiteFlag[] {
  const flags: EmptySuiteFlag[] = []
  const unitKey = (row: RawBookingRow) => {
    const unit = (row.suite_or_unit || row.room_number || '').trim()
    if (!unit) return null
    return `${(row.property_name || 'Property').trim()}::${unit}`
  }

  const departingToday = rows.filter(
    (r) => normalizeDate(r.check_out) === targetDate && unitKey(r)
  )

  const arrivalsByUnit = new Set<string>()
  for (const row of rows) {
    const key = unitKey(row)
    if (!key) continue
    const checkIn = normalizeDate(row.check_in)
    if (checkIn === targetDate || checkIn === tomorrowDate) {
      arrivalsByUnit.add(key)
    }
  }

  for (const row of departingToday) {
    const key = unitKey(row)!
    if (!arrivalsByUnit.has(key)) {
      const unit = (row.suite_or_unit || row.room_number || 'Unknown unit').trim()
      flags.push({
        unit,
        propertyName: (row.property_name || UNKNOWN_PROPERTY_LABEL).trim(),
        reason: `Departure ${targetDate} with no arrival scheduled today or tomorrow`,
      })
    }
  }

  for (const row of rows) {
    const checkIn = normalizeDate(row.check_in)
    if (checkIn !== targetDate && checkIn !== tomorrowDate) continue
    if (!row.suite_or_unit?.trim() && !row.room_number?.trim()) {
      flags.push({
        unit: 'TBD',
        propertyName: (row.property_name || UNKNOWN_PROPERTY_LABEL).trim(),
        reason: `Arrival ${checkIn} missing suite/room assignment`,
      })
    }
  }

  return flags
}

export function buildExceptions(
  todaySlice: DailyBriefDaySlice,
  tomorrowSlice: DailyBriefDaySlice,
  rows: RawBookingRow[],
  targetDate: string,
  tomorrowDate: string
): DailyBriefExceptions {
  const allToday = [
    ...todaySlice.arrivals,
    ...todaySlice.departures,
    ...todaySlice.inHouse,
  ]

  const lateCheckIns = allToday.filter(
    (b) => b.lateCheckIn && b.derivedStatus === 'arriving'
  )

  const missingData = [...allToday, ...tomorrowSlice.arrivals].filter(
    (b) => b.missingFields.length > 0
  )

  const emptySuites = detectEmptySuites(rows, targetDate, tomorrowDate)

  return { lateCheckIns, missingData, emptySuites }
}

export function buildDailyBriefSnapshot(
  tenantId: number,
  tenantName: string,
  targetDate: string,
  rows: RawBookingRow[]
): DailyBriefSnapshot {
  const guestRows = rows.filter(isActiveGuestBooking)
  const ownerBlocksToday = rows.filter(
    (row) => isOwnerBlock(row) && deriveBookingStatus(row.check_in, row.check_out, targetDate)
  ).length
  const tomorrowDate = addDaysToDate(targetDate, 1)
  const today = buildDaySlice(guestRows, targetDate)
  const tomorrow = buildDaySlice(guestRows, tomorrowDate)
  const exceptions = buildExceptions(today, tomorrow, guestRows, targetDate, tomorrowDate)

  return {
    tenantId,
    tenantName,
    targetDate,
    tomorrowDate,
    today,
    tomorrow,
    exceptions,
    generatedAt: new Date().toISOString(),
    ownerBlocksToday,
  }
}

export function flattenBookingsForDate(
  rows: RawBookingRow[],
  targetDate: string
): DailyBriefBooking[] {
  return rows
    .filter(isActiveGuestBooking)
    .map((row) => enrichBooking(row, targetDate))
    .filter((b): b is DailyBriefBooking => b !== null)
}

function formatDisplayDate(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    return date.toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return isoDate
  }
}

function formatBookingLine(booking: DailyBriefBooking): string[] {
  const lines: string[] = []
  lines.push(`  Guest: ${booking.guestName}`)
  lines.push(`  Property: ${booking.propertyName}`)
  lines.push(`  Suite: ${booking.suiteOrUnit}`)
  if (booking.adults || booking.children) {
    const parts: string[] = []
    if (booking.adults) parts.push(`${booking.adults} adult${booking.adults > 1 ? 's' : ''}`)
    if (booking.children) parts.push(`${booking.children} child${booking.children > 1 ? 'ren' : ''}`)
    lines.push(`  Guests: ${parts.join(', ')}`)
  }
  if (booking.lateCheckIn) lines.push('  ⚠️ LATE CHECK-IN — coordinate timing')
  if (booking.missingFields.length > 0) {
    lines.push(`  ⚠️ Missing: ${booking.missingFields.join(', ')}`)
  }
  if (booking.specialRequests) lines.push(`  Notes: ${booking.specialRequests}`)
  return lines
}

export function generateWhatsAppBrief(snapshot: DailyBriefSnapshot): string {
  const lines: string[] = []
  const { tenantName, targetDate, tomorrowDate, today, tomorrow, exceptions } = snapshot

  lines.push('='.repeat(60))
  lines.push('THE BROWNS DAILY OPS BRIEF')
  lines.push(formatDisplayDate(targetDate))
  lines.push(`Tenant: ${tenantName}`)
  lines.push('='.repeat(60))
  lines.push('')

  lines.push('SUMMARY')
  lines.push(`Arrivals today: ${today.arrivals.length}`)
  lines.push(`In-house today: ${today.inHouse.length}`)
  lines.push(`Departures today: ${today.departures.length}`)
  lines.push(`Arrivals tomorrow: ${tomorrow.arrivals.length}`)
  if ((snapshot.ownerBlocksToday || 0) > 0) {
    lines.push(`Owner blocks: ${snapshot.ownerBlocksToday}`)
  }
  lines.push('')

  if (exceptions.lateCheckIns.length > 0) {
    lines.push('🔴 RED — LATE CHECK-INS')
    exceptions.lateCheckIns.forEach((b) => {
      lines.push(`• ${b.guestName} — ${b.propertyName} (${b.suiteOrUnit})`)
    })
    lines.push('')
  }

  if (exceptions.missingData.length > 0) {
    lines.push('🟡 AMBER — MISSING DATA')
    exceptions.missingData.forEach((b) => {
      lines.push(`• ${b.guestName} — missing ${b.missingFields.join(', ')}`)
    })
    lines.push('')
  }

  if (exceptions.emptySuites.length > 0) {
    lines.push('🟡 EMPTY / TURNOVER FLAGS')
    exceptions.emptySuites.forEach((e) => {
      lines.push(`• ${e.propertyName} ${e.unit}: ${e.reason}`)
    })
    lines.push('')
  }

  lines.push('─'.repeat(60))
  lines.push('🛬 ARRIVALS TODAY')
  lines.push('─'.repeat(60))
  if (today.arrivals.length === 0) {
    lines.push('  No arrivals today')
  } else {
    today.arrivals.forEach((b) => {
      lines.push('')
      lines.push(...formatBookingLine(b))
    })
  }
  lines.push('')

  lines.push('─'.repeat(60))
  lines.push('🛫 DEPARTURES TODAY')
  lines.push('─'.repeat(60))
  if (today.departures.length === 0) {
    lines.push('  No departures today')
  } else {
    today.departures.forEach((b) => {
      lines.push('')
      lines.push(...formatBookingLine(b))
    })
  }
  lines.push('')

  lines.push('─'.repeat(60))
  lines.push('🏠 IN-HOUSE TODAY')
  lines.push('─'.repeat(60))
  if (today.inHouse.length === 0) {
    lines.push('  No in-house guests')
  } else {
    today.inHouse.forEach((b) => {
      lines.push(`  • ${b.guestName} — ${b.suiteOrUnit} (out ${b.checkOut})`)
    })
  }
  lines.push('')

  lines.push('─'.repeat(60))
  lines.push(`📅 TOMORROW PREVIEW (${tomorrowDate})`)
  lines.push('─'.repeat(60))
  lines.push(`Arrivals: ${tomorrow.arrivals.length} | Departures: ${tomorrow.departures.length}`)
  tomorrow.arrivals.forEach((b) => {
    lines.push(`  • IN: ${b.guestName} — ${b.suiteOrUnit}`)
  })
  tomorrow.departures.forEach((b) => {
    lines.push(`  • OUT: ${b.guestName} — ${b.suiteOrUnit}`)
  })
  lines.push('')

  lines.push('='.repeat(60))
  lines.push('DRAFT ONLY — DO NOT SEND WITHOUT APPROVAL')
  lines.push('No auto-send. Staff WhatsApp post requires H11 approval.')
  lines.push('Never includes rates or payment amounts.')
  lines.push('='.repeat(60))

  return lines.join('\n')
}

export function generateMarkdownBrief(snapshot: DailyBriefSnapshot): string {
  const { tenantName, targetDate, tomorrowDate, today, tomorrow, exceptions } = snapshot
  let md = `# Daily Operations Brief\n\n`
  md += `**Tenant:** ${tenantName}  \n`
  md += `**Date:** ${targetDate}  \n`
  md += `**Tomorrow:** ${tomorrowDate}  \n\n---\n\n`
  md += `## Summary\n\n`
  md += `- **Arrivals today:** ${today.arrivals.length}\n`
  md += `- **In-house today:** ${today.inHouse.length}\n`
  md += `- **Departures today:** ${today.departures.length}\n`
  md += `- **Arrivals tomorrow:** ${tomorrow.arrivals.length}\n\n`

  if (exceptions.lateCheckIns.length > 0) {
    md += `## 🔴 RED — Late Check-ins\n\n`
    exceptions.lateCheckIns.forEach((b) => {
      md += `- **${b.guestName}** — ${b.propertyName} (${b.suiteOrUnit})\n`
    })
    md += `\n`
  }

  if (exceptions.emptySuites.length > 0) {
    md += `## 🟡 Empty / Turnover Flags\n\n`
    exceptions.emptySuites.forEach((e) => {
      md += `- ${e.propertyName} ${e.unit}: ${e.reason}\n`
    })
    md += `\n`
  }

  md += `---\n\n`
  md += generateWhatsAppBrief(snapshot)
    .split('\n')
    .slice(-4)
    .join('\n')

  return md
}

export function generatePlainTextFromBookings(
  tenantName: string,
  targetDate: string,
  bookings: Array<{
    guestName: string
    propertyName: string
    roomNumber: string
    checkIn: string
    checkOut: string
    status: string
    lateCheckIn: boolean
    missingFields: string[]
    adults?: number
    children?: number
    pets?: boolean
    specialRequests?: string
  }>
): string {
  const rows: RawBookingRow[] = bookings.map((b, idx) => ({
    id: idx,
    guest_name: b.guestName,
    property_name: b.propertyName,
    room_number: b.roomNumber,
    suite_or_unit: b.roomNumber,
    check_in: b.checkIn,
    check_out: b.checkOut,
    adults: b.adults,
    children: b.children,
    notes: b.specialRequests,
    late_check_in: b.lateCheckIn,
  }))

  const snapshot = buildDailyBriefSnapshot(0, tenantName, targetDate, rows)
  return generateWhatsAppBrief(snapshot)
}

export function generateMarkdownFromBookings(
  tenantName: string,
  targetDate: string,
  bookings: Parameters<typeof generatePlainTextFromBookings>[2]
): string {
  const rows: RawBookingRow[] = bookings.map((b, idx) => ({
    id: idx,
    guest_name: b.guestName,
    property_name: b.propertyName,
    room_number: b.roomNumber,
    suite_or_unit: b.roomNumber,
    check_in: b.checkIn,
    check_out: b.checkOut,
    adults: b.adults,
    children: b.children,
    notes: b.specialRequests,
    late_check_in: b.lateCheckIn,
  }))

  const snapshot = buildDailyBriefSnapshot(0, tenantName, targetDate, rows)
  return generateMarkdownBrief(snapshot)
}

export function johannesburgTodayIso(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}
