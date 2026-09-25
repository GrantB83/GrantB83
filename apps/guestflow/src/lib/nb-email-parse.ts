/**
 * Deterministic Nightsbridge property-email parsers.
 * Fail-closed: missing required fields → parse_failed. Never invent a booking.
 */

import { createHash } from 'crypto'
import { OPS_SETTINGS } from '@/lib/ops-settings'

export type NbEmailType =
  | 'NEW_BOOKING'
  | 'OTA_CANCELLATION'
  | 'TRAVELIT_CONFIRMATION'
  | 'PAYMENT'
  | 'VCC_PROCESSING'
  | 'OTHER'

export interface NbParseResult {
  type: NbEmailType
  status: 'ok' | 'ignored' | 'parse_failed'
  nbRef: string | null
  bbid: string | null
  fields: Record<string, string>
  contentHash: string
  reason?: string
}

const NEW_SUBJECT =
  /^Booking for (?<prop>.+) \((?<bbid>\d+)\) - (?<source>.+), (?<arrDow>\w+day), (?<arr>\d{2} \w+ \d{4})$/i
const CANCEL_SUBJECT = /^Cancellation of Booking ID - (?<nbid>\d+)$/i
const TRAVELIT_SUBJECT = /^TravelIT confirmation for booking ID (?<nbid>\d+)$/i
const PAYMENT_SUBJECT = /^Credit card payment - Booking No\.: ?(?<nbid>\d+)/i
const VCC_SUBJECT = /^Virtual cards to be processed by NightsBridge today for .+ \((?<bbid>\d+)\)$/i

const NB_SENDER = /@(nightsbridge\.co\.za|nightsbridge\.com)$/i

export function isNightsbridgeSender(from: string | null | undefined): boolean {
  const value = String(from || '').toLowerCase()
  return NB_SENDER.test(value) || value.includes('nightsbridge')
}

export function isForwardVerification(from: string | null | undefined, subject?: string): boolean {
  const sender = String(from || '').toLowerCase()
  const sub = String(subject || '').toLowerCase()
  return sender.includes('forwarding-noreply@google.com') || sub.includes('forwarding confirmation')
}

export function normalizeNbRef(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  return digits.length >= 4 ? digits : null
}

export function contentHashOf(fields: Record<string, string>): string {
  const keys = Object.keys(fields).sort()
  const normalised = keys.map((key) => `${key}=${String(fields[key] || '').trim().toLowerCase()}`).join('|')
  return createHash('sha256').update(normalised).digest('hex')
}

export function propertyAllowed(bbid: string | null, propertyName?: string | null): boolean {
  if (bbid && OPS_SETTINGS.sisterBbids.includes(bbid)) return false
  if (bbid && bbid === OPS_SETTINGS.brownsBbid) return true
  const name = String(propertyName || '').toLowerCase()
  if (OPS_SETTINGS.propertyNameNeedles.some((needle) => name.includes(needle))) return true
  return false
}

function labelValue(body: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]\\s*(.+)`, 'i')
    const match = body.match(re)
    if (match?.[1]) return match[1].split('\n')[0].trim()
  }
  return null
}

function stripCardDigits(text: string): string {
  return text.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[card]')
}

export function parseNbEmail(input: { subject?: string; text?: string; from?: string }): NbParseResult {
  const subject = String(input.subject || '').trim()
  const text = stripCardDigits(String(input.text || ''))
  const failed = (type: NbEmailType, reason: string): NbParseResult => ({
    type,
    status: 'parse_failed',
    nbRef: null,
    bbid: null,
    fields: {},
    contentHash: contentHashOf({ type, reason }),
    reason,
  })

  const newMatch = subject.match(NEW_SUBJECT)
  if (newMatch?.groups) {
    const bbid = newMatch.groups.bbid
    if (!propertyAllowed(bbid, newMatch.groups.prop)) {
      return { type: 'OTHER', status: 'ignored', nbRef: null, bbid, fields: {}, contentHash: contentHashOf({ subject }) }
    }
    const nbRef =
      normalizeNbRef(labelValue(text, ['NB', 'NB ref', 'Booking ref', 'Nightsbridge booking']) || text.match(/NB-(\d{8,10})/)?.[1] || '')
    const guestName = labelValue(text, ['Guest name', 'Guest', 'Client name', 'Name'])
    const arrive = labelValue(text, ['Arrive', 'Arrival', 'Check-in']) || newMatch.groups.arr
    const depart = labelValue(text, ['Depart', 'Departure', 'Check-out'])
    if (!nbRef || !guestName || !arrive) {
      return failed('NEW_BOOKING', 'missing_required_fields')
    }
    const fields = {
      source: newMatch.groups.source,
      guest_name: guestName,
      guest_email: labelValue(text, ['Guest email', 'Email']) || '',
      guest_tel: labelValue(text, ['Guest tel', 'Tel', 'Phone', 'Telephone']) || '',
      arrive,
      depart: depart || '',
      nb_ref: nbRef,
      notes: labelValue(text, ['Notes', 'Special requests']) || '',
      room_type_line: labelValue(text, ['Room type', 'Room']) || '',
    }
    return { type: 'NEW_BOOKING', status: 'ok', nbRef, bbid, fields, contentHash: contentHashOf(fields) }
  }

  const cancel = subject.match(CANCEL_SUBJECT)
  if (cancel?.groups) {
    const nbRef = normalizeNbRef(cancel.groups.nbid)
    if (!nbRef) return failed('OTA_CANCELLATION', 'missing_nb_ref')
    const fields = {
      ota_name: labelValue(text, ['OTA', 'Channel', 'Source']) || '',
      ota_booking_id: labelValue(text, ['OTA booking', 'Booking.com id']) || '',
      nb_ref: nbRef,
      arrive: labelValue(text, ['Arrive', 'Arrival']) || '',
      depart: labelValue(text, ['Depart', 'Departure']) || '',
      client_name: labelValue(text, ['Client name', 'Guest name', 'Guest']) || '',
    }
    return { type: 'OTA_CANCELLATION', status: 'ok', nbRef, bbid: null, fields, contentHash: contentHashOf(fields) }
  }

  const travelit = subject.match(TRAVELIT_SUBJECT)
  if (travelit?.groups) {
    const nbRef = normalizeNbRef(travelit.groups.nbid)
    if (!nbRef) return failed('TRAVELIT_CONFIRMATION', 'missing_nb_ref')
    const fields = {
      nb_ref: nbRef,
      channel: labelValue(text, ['Channel']) || '(414) TravelIT',
      guest_name: labelValue(text, ['Guest name', 'Guest']) || '',
      guest_phone: labelValue(text, ['Guest phone', 'Phone', 'Tel']) || '',
      guest_email: labelValue(text, ['Guest email', 'Email']) || '',
      arrive: labelValue(text, ['Arrive', 'Arrival']) || '',
      depart: labelValue(text, ['Depart', 'Departure']) || '',
    }
    return { type: 'TRAVELIT_CONFIRMATION', status: 'ok', nbRef, bbid: null, fields, contentHash: contentHashOf(fields) }
  }

  const payment = subject.match(PAYMENT_SUBJECT)
  if (payment?.groups) {
    const nbRef = normalizeNbRef(payment.groups.nbid)
    const fields = {
      nb_ref: nbRef || '',
      amount: labelValue(text, ['Amount', 'Paid']) || '',
      status: /error|fail|3ds/i.test(text) ? (/3ds/i.test(text) ? '3DS' : 'error') : 'success',
    }
    return { type: 'PAYMENT', status: 'ok', nbRef, bbid: null, fields, contentHash: contentHashOf(fields) }
  }

  const vcc = subject.match(VCC_SUBJECT)
  if (vcc?.groups) {
    const bbid = vcc.groups.bbid
    if (!propertyAllowed(bbid, subject)) {
      return { type: 'OTHER', status: 'ignored', nbRef: null, bbid, fields: {}, contentHash: contentHashOf({ subject }) }
    }
    return {
      type: 'VCC_PROCESSING',
      status: 'ok',
      nbRef: null,
      bbid,
      fields: { bbid },
      contentHash: contentHashOf({ subject }),
    }
  }

  if (isNightsbridgeSender(input.from) || /nightsbridge/i.test(subject)) {
    return { type: 'OTHER', status: 'ignored', nbRef: null, bbid: null, fields: {}, contentHash: contentHashOf({ subject }) }
  }

  return { type: 'OTHER', status: 'ignored', nbRef: null, bbid: null, fields: {}, contentHash: contentHashOf({ subject }) }
}
