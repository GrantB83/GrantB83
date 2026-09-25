/**
 * Deterministic stay@ → booking match (name / NB ref / dates).
 * Fail closed: ambiguous matches return null. Never invent PII.
 */

import { normalizeGuestName } from '@/lib/nightsbridge-upsert'

export interface StayAtBookingCandidate {
  id: number
  guest_name: string
  check_in: string
  check_out: string
  nightsbridge_booking_id: string | null
}

export interface StayAtMatchInput {
  from: string
  subject?: string | null
  text?: string | null
}

const NB_REF_RE = /NB-(\d{8,10})/gi
const SHORT_ID_RE = /\b(?:booking(?:\s*id)?|ref(?:erence)?)[:\s#]*(\d{4,6})\b/gi
const ISO_DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/g
const MDY_DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g
const TEXT_DATE_RE =
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/gi

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  sept: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function pad2(value: string | number): string {
  return String(value).padStart(2, '0')
}

export function extractNbRefs(blob: string): string[] {
  const refs: string[] = []
  for (const match of blob.matchAll(NB_REF_RE)) {
    refs.push(match[1])
  }
  for (const match of blob.matchAll(SHORT_ID_RE)) {
    refs.push(match[1])
  }
  return unique(refs)
}

export function extractStayDates(blob: string): string[] {
  const dates: string[] = []
  for (const match of blob.matchAll(ISO_DATE_RE)) {
    dates.push(match[1])
  }
  for (const match of blob.matchAll(MDY_DATE_RE)) {
    dates.push(`${match[3]}-${pad2(match[1])}-${pad2(match[2])}`)
  }
  for (const match of blob.matchAll(TEXT_DATE_RE)) {
    const month = MONTHS[match[2].toLowerCase()]
    if (month) dates.push(`${match[3]}-${month}-${pad2(match[1])}`)
  }
  return unique(dates)
}

export function extractGuestNameHint(blob: string): string | null {
  const labelled = blob.match(/(?:guest\s*)?name:\s*([A-Za-z][A-Za-z .'-]{1,80})/i)
  if (labelled) return labelled[1].trim()
  return null
}

function bookingRefDigits(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '')
}

function datePrefix(value: string | null | undefined): string {
  return String(value || '').slice(0, 10)
}

export function matchStayAtBooking(
  bookings: StayAtBookingCandidate[],
  input: StayAtMatchInput
): StayAtBookingCandidate | null {
  const blob = `${input.subject || ''}\n${input.text || ''}`
  const refs = extractNbRefs(blob)
  const dates = extractStayDates(blob)
  const nameHint = extractGuestNameHint(blob)
  const nameNorm = nameHint ? normalizeGuestName(nameHint) : ''

  let pool = bookings.filter((booking) => {
    if (refs.length === 0) return true
    const digits = bookingRefDigits(booking.nightsbridge_booking_id)
    return refs.some((ref) => digits === ref || digits.endsWith(ref) || ref.endsWith(digits))
  })

  if (refs.length && pool.length === 0) return null

  if (nameNorm) {
    const named = pool.filter((booking) => normalizeGuestName(booking.guest_name) === nameNorm)
    if (named.length > 0) pool = named
    else if (!refs.length) return null
  }

  if (dates.length) {
    const dated = pool.filter((booking) => {
      const checkIn = datePrefix(booking.check_in)
      const checkOut = datePrefix(booking.check_out)
      return dates.includes(checkIn) || dates.includes(checkOut)
    })
    if (dated.length > 0) pool = dated
    else if (!refs.length && !nameNorm) return null
  }

  if (!refs.length && !nameNorm && !dates.length) return null
  if (pool.length !== 1) return null
  return pool[0]
}
