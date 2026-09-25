/**
 * L2 gap detection. Fail-closed: never invent a contact.
 */

import type { DbClient } from '@/lib/db'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'
import { normalizeZaE164, normalizeEmail } from '@/lib/phone'
import { OPS_SETTINGS } from '@/lib/ops-settings'

export type GapKind = 'missing' | 'relay_only' | 'placeholder' | 'intermediary'
export type GapField = 'phone' | 'email' | 'room' | 'check_in' | 'check_out' | 'status'

export const PLACEHOLDER_PHONES = ['0000000000', '1234567890', '1111111111', '0123456789']
export const INTERMEDIARY_PHONES = ['+27210000000']
export const PLACEHOLDER_EMAILS = ['noemail@', 'none@', 'test@', 'example.']
export const INTERMEDIARY_EMAILS = [
  'bookings@lekkeslaap.co.za',
  'bookings@travelground.com',
  'reservations@lekkeslaap.co.za',
]
export const RELAY_EMAIL_NEEDLES = [
  '@guest.booking.com',
  'expediapartnercentral',
  '@guest.airbnb.com',
  '@agoda-messaging.com',
]

export function classifyPhone(raw: string | null | undefined): { missing: boolean; kind?: GapKind } {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return { missing: true, kind: 'missing' }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 9) return { missing: true, kind: 'missing' }
  if (PLACEHOLDER_PHONES.includes(digits) || /^(.)\1{6,}$/.test(digits) || digits === '1234567890') {
    return { missing: true, kind: 'placeholder' }
  }
  const e164 = normalizeZaE164(trimmed)
  if (!e164) return { missing: true, kind: 'missing' }
  if (INTERMEDIARY_PHONES.includes(e164) || OPS_SETTINGS.propertyOwnPhones.includes(e164)) {
    return { missing: true, kind: 'intermediary' }
  }
  return { missing: false }
}

export function classifyEmail(raw: string | null | undefined): { missing: boolean; kind?: GapKind; relayOnly?: boolean } {
  const email = normalizeEmail(raw)
  if (!email) return { missing: true, kind: 'missing' }
  if (PLACEHOLDER_EMAILS.some((needle) => email.startsWith(needle) || email.includes(needle))) {
    return { missing: true, kind: 'placeholder' }
  }
  if (INTERMEDIARY_EMAILS.includes(email)) return { missing: true, kind: 'intermediary' }
  if (OPS_SETTINGS.propertyOwnEmails.some((domain) => email.endsWith(domain))) {
    return { missing: true, kind: 'intermediary' }
  }
  if (RELAY_EMAIL_NEEDLES.some((needle) => email.includes(needle))) {
    return { missing: false, kind: 'relay_only', relayOnly: true }
  }
  return { missing: false }
}

export async function detectAndLogGaps(
  db: DbClient,
  input: { tenantId: number; bookingId: number; nbRef?: string | null; detectedBy: 'email' | 'report' }
): Promise<Array<{ field: GapField; kind: GapKind }>> {
  await ensureSprint2Schema(db)
  const booking = (await db
    .prepare(
      `SELECT guest_phone, guest_email, suite_or_unit, check_in, check_out, status
       FROM bookings WHERE id = ?`
    )
    .get(input.bookingId)) as
    | {
        guest_phone?: string | null
        guest_email?: string | null
        suite_or_unit?: string | null
        check_in?: string | null
        check_out?: string | null
        status?: string | null
      }
    | undefined
  if (!booking) return []

  const found: Array<{ field: GapField; kind: GapKind }> = []
  const phone = classifyPhone(booking.guest_phone)
  if (phone.missing && phone.kind) found.push({ field: 'phone', kind: phone.kind })
  const email = classifyEmail(booking.guest_email)
  if (email.relayOnly && email.kind) found.push({ field: 'email', kind: 'relay_only' })
  else if (email.missing && email.kind) found.push({ field: 'email', kind: email.kind })
  if (!booking.suite_or_unit) found.push({ field: 'room', kind: 'missing' })
  if (!booking.check_in) found.push({ field: 'check_in', kind: 'missing' })
  if (!booking.check_out) found.push({ field: 'check_out', kind: 'missing' })
  if (!booking.status) found.push({ field: 'status', kind: 'missing' })

  for (const gap of found) {
    const open = (await db
      .prepare(
        `SELECT id FROM nb_gaps WHERE booking_id = ? AND field = ? AND status IN ('open','filling','staff_needed')`
      )
      .get(input.bookingId, gap.field)) as { id: number } | undefined
    if (open) continue
    await db
      .prepare(
        `INSERT INTO nb_gaps (tenant_id, booking_id, nb_ref, field, gap_kind, detected_by, status)
         VALUES (?, ?, ?, ?, ?, ?, 'open')`
      )
      .run(input.tenantId, input.bookingId, input.nbRef || null, gap.field, gap.kind, input.detectedBy)
  }
  return found
}
