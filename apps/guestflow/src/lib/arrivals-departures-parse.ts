import { addDays, format, parseISO } from 'date-fns'
import { mapNbSectionRow, type ParsedBooking } from '@/lib/nightsbridge-section-parse'
import { isBlockGuestName } from '@/lib/contact-provenance'

export interface ParsedAdBooking extends ParsedBooking {
  extraRooms?: string[]
  section?: 'arrival' | 'departure'
}

export interface ParseAdResult {
  bookings: ParsedAdBooking[]
  skippedBlocks: number
}

function parseDateMDY(dateStr: string): string {
  const [month, day, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function mergeSuiteNames(...values: Array<string | undefined | null>): string {
  const parts: string[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    if (!raw) continue
    for (const piece of String(raw).split(/\s*[·|,;]\s*/)) {
      const trimmed = piece.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase().replace(/\s+/g, ' ')
      if (seen.has(key)) continue
      seen.add(key)
      parts.push(trimmed)
    }
  }
  return parts.join(' · ')
}

export function extraRoomsFromSuite(primary: string | undefined, merged: string): string[] {
  if (!merged) return []
  const rooms = merged.split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean)
  if (rooms.length <= 1) return []
  const primaryKey = (primary || rooms[0]).toLowerCase().replace(/\s+/g, ' ')
  return rooms.filter((room) => room.toLowerCase().replace(/\s+/g, ' ') !== primaryKey)
}

function mergeContactField(current?: string, incoming?: string): string | undefined {
  const left = current?.trim()
  const right = incoming?.trim()
  if (left) return left
  return right || undefined
}

export function mergeAdBookings(rows: ParsedAdBooking[]): ParsedAdBooking[] {
  const byId = new Map<string, ParsedAdBooking>()
  const untitled: ParsedAdBooking[] = []

  for (const row of rows) {
    if (!row.bookingId) {
      untitled.push(row)
      continue
    }
    const existing = byId.get(row.bookingId)
    if (!existing) {
      byId.set(row.bookingId, {
        ...row,
        extraRooms: extraRoomsFromSuite(row.suiteOrUnit, row.suiteOrUnit || ''),
      })
      continue
    }

    const mergedSuite = mergeSuiteNames(existing.suiteOrUnit, row.suiteOrUnit, ...(existing.extraRooms || []))
    existing.suiteOrUnit = mergedSuite
    existing.extraRooms = extraRoomsFromSuite(undefined, mergedSuite)
    existing.guestPhone = mergeContactField(existing.guestPhone, row.guestPhone)
    existing.guestEmail = mergeContactField(existing.guestEmail, row.guestEmail)
    existing.guestPhone2 = mergeContactField(existing.guestPhone2, row.guestPhone2)
    existing.guestEmail2 = mergeContactField(existing.guestEmail2, row.guestEmail2)
    if (row.section === 'arrival' && existing.section !== 'arrival') {
      existing.checkInDate = row.checkInDate || existing.checkInDate
      existing.checkOutDate = row.checkOutDate || existing.checkOutDate
      existing.status = row.status || existing.status
      existing.section = 'arrival'
    }
    if (row.notes && !existing.notes) existing.notes = row.notes
    if (row.guest2 && !existing.guest2) existing.guest2 = row.guest2
  }

  return [...byId.values(), ...untitled]
}

export function parseArrivalsDeparturesGrid(
  jsonData: any[][],
  targetDate: string
): ParseAdResult {
  const raw: ParsedAdBooking[] = []
  let skippedBlocks = 0
  let currentSection: 'arrival' | 'departure' | null = null
  let currentSectionDate: string | null = null
  let currentHeaders: string[] = []

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (!row || !row.some((cell) => cell !== null && cell !== undefined && cell !== '')) {
      continue
    }

    const firstCell = String(row[0] || '').trim()
    const arrivalMatch = firstCell.match(/^Arrival:\s*(\d{1,2}\/\d{1,2}\/\d{4})$/i)
    const departureMatch = firstCell.match(/^Departure:\s*(\d{1,2}\/\d{1,2}\/\d{4})$/i)

    if (arrivalMatch) {
      currentSection = 'arrival'
      currentSectionDate = parseDateMDY(arrivalMatch[1])
      currentHeaders = []
      continue
    }
    if (departureMatch) {
      currentSection = 'departure'
      currentSectionDate = parseDateMDY(departureMatch[1])
      currentHeaders = []
      continue
    }

    if (currentSection && currentHeaders.length === 0) {
      const potentialHeaders = row.map((h: any) =>
        String(h || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      )
      if (potentialHeaders.some((h) => h.includes('room') || h.includes('guest'))) {
        currentHeaders = potentialHeaders
        continue
      }
    }

    if (currentSection && currentSectionDate && currentHeaders.length > 0) {
      const booking = mapNbSectionRow(currentHeaders, row) as ParsedAdBooking
      if (!booking.guestName || !booking.suiteOrUnit) continue
      if (isBlockGuestName(booking.guestName)) {
        skippedBlocks++
      }

      if (currentSection === 'arrival') {
        booking.checkInDate = currentSectionDate
        booking.checkOutDate = booking.nights
          ? format(addDays(parseISO(currentSectionDate), booking.nights), 'yyyy-MM-dd')
          : currentSectionDate
        booking.status = format(parseISO(targetDate), 'yyyy-MM-dd') === currentSectionDate ? 'arriving' : ''
      } else {
        booking.checkOutDate = currentSectionDate
        booking.checkInDate = booking.nights
          ? format(addDays(parseISO(currentSectionDate), -booking.nights), 'yyyy-MM-dd')
          : currentSectionDate
        booking.status = format(parseISO(targetDate), 'yyyy-MM-dd') === currentSectionDate ? 'departing' : ''
      }

      booking.lateCheckIn = Boolean(booking.notes && booking.notes.toLowerCase().includes('late'))
      if (!booking.adults) booking.adults = 2
      if (!booking.children) booking.children = 0
      booking.section = currentSection
      raw.push(booking)
    }
  }

  return { bookings: mergeAdBookings(raw), skippedBlocks }
}

export function pickAdPhone(booking: ParsedAdBooking): string | undefined {
  return booking.guestPhone?.trim() || booking.guestPhone2?.trim() || undefined
}

export function pickAdEmail(booking: ParsedAdBooking): string | undefined {
  return booking.guestEmail?.trim() || booking.guestEmail2?.trim() || undefined
}
