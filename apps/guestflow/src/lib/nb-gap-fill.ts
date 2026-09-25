/**
 * L3 ordered gap-fill. Verbatim-in-source required. Never overwrite verified.
 * Sources: notes → report columns (caller supplies) → GuestFlow history → staff_needed.
 * No guest auto-send.
 */

import type { DbClient } from '@/lib/db'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'
import { classifyEmail, classifyPhone } from '@/lib/nb-gaps'
import { normalizeZaE164, normalizeEmail } from '@/lib/phone'
import { applyFieldWrite } from '@/lib/nb-reconcile'

const PHONE_IN_TEXT = /(?:\+?27|0)\s*\d[\d\s()-]{7,}/g
const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function extractContactsFromNotes(notes: string): { phones: string[]; emails: string[] } {
  const text = String(notes || '')
  const phones = Array.from(text.match(PHONE_IN_TEXT) || [])
    .map((value) => normalizeZaE164(value))
    .filter((value): value is string => Boolean(value) && !classifyPhone(value).missing)
  const emails = Array.from(text.match(EMAIL_IN_TEXT) || [])
    .map((value) => normalizeEmail(value))
    .filter((value): value is string => Boolean(value) && !classifyEmail(value).missing && !classifyEmail(value).relayOnly)
  return { phones: unique(phones), emails: unique(emails) }
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

export function verbatimPresent(value: string, source: string): boolean {
  if (!value || !source) return false
  const digits = value.replace(/\D/g, '')
  if (digits.length >= 9 && source.replace(/\D/g, '').includes(digits)) return true
  return source.toLowerCase().includes(value.toLowerCase())
}

export async function fillGapsForBooking(
  db: DbClient,
  input: {
    tenantId: number
    bookingId: number
    notes?: string
    reportPhone?: string | null
    reportEmail?: string | null
    emailId?: string | null
    reportRunId?: string | null
  }
): Promise<{ filled: string[]; staffNeeded: string[] }> {
  await ensureSprint2Schema(db)
  const booking = (await db
    .prepare(
      `SELECT id, guest_name, guest_name_norm, guest_phone, guest_email, guest_phone_verified, guest_email_verified,
              field_sources_json
       FROM bookings WHERE id = ?`
    )
    .get(input.bookingId)) as Record<string, unknown> | undefined
  if (!booking) return { filled: [], staffNeeded: [] }

  const filled: string[] = []
  const staffNeeded: string[] = []
  const notes = input.notes || ''
  const extracted = extractContactsFromNotes(notes)

  const phone = await tryFill(db, booking, 'guest_phone', [
    { value: extracted.phones[0], source: 'notes', sourceText: notes, ref: input.emailId || null },
    { value: input.reportPhone || null, source: 'report', sourceText: input.reportPhone || '', ref: input.reportRunId || null },
    { value: await historyPhone(db, input.tenantId, String(booking.guest_name_norm || '')), source: 'history', sourceText: 'history', ref: null },
  ])
  if (phone === 'filled') filled.push('phone')
  if (phone === 'staff_needed') staffNeeded.push('phone')

  const email = await tryFill(db, booking, 'guest_email', [
    { value: extracted.emails[0], source: 'notes', sourceText: notes, ref: input.emailId || null },
    { value: input.reportEmail || null, source: 'report', sourceText: input.reportEmail || '', ref: input.reportRunId || null },
    { value: await historyEmail(db, input.tenantId, String(booking.guest_name_norm || '')), source: 'history', sourceText: 'history', ref: null },
  ])
  if (email === 'filled') filled.push('email')
  if (email === 'staff_needed') staffNeeded.push('email')

  return { filled, staffNeeded }
}

async function tryFill(
  db: DbClient,
  booking: Record<string, unknown>,
  field: 'guest_phone' | 'guest_email',
  sources: Array<{ value: string | null; source: 'notes' | 'report' | 'history'; sourceText: string; ref: string | null }>
): Promise<'filled' | 'staff_needed' | 'kept'> {
  const verified =
    field === 'guest_phone' ? String(booking.guest_phone_verified || '') || null : String(booking.guest_email_verified || '') || null
  const current = booking[field]
  if (current && verified) return 'kept'

  for (const candidate of sources) {
    if (!candidate.value) continue
    if (candidate.source !== 'history' && !verbatimPresent(candidate.value, candidate.sourceText)) continue
    const check = field === 'guest_phone' ? classifyPhone(candidate.value) : classifyEmail(candidate.value)
    if (check.missing) continue
    const decision = applyFieldWrite({
      field,
      current: { value: current, verified, source: verified || null },
      incoming: { value: candidate.value, source: candidate.source === 'notes' ? 'notes' : candidate.source === 'report' ? 'report' : 'history' },
    })
    if (decision.action !== 'write') continue
    await db.prepare(`UPDATE bookings SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(candidate.value, booking.id)
    await closeGap(db, Number(booking.id), field === 'guest_phone' ? 'phone' : 'email', candidate.source)
    return 'filled'
  }

  const stillMissing =
    field === 'guest_phone' ? classifyPhone(current as string).missing : classifyEmail(current as string).missing
  if (stillMissing) {
    await markStaffNeeded(db, Number(booking.id), field === 'guest_phone' ? 'phone' : 'email')
    return 'staff_needed'
  }
  return 'kept'
}

async function historyPhone(db: DbClient, tenantId: number, nameNorm: string): Promise<string | null> {
  if (!nameNorm) return null
  try {
    const row = (await db
      .prepare(
        `SELECT guest_phone FROM bookings
         WHERE tenant_id = ? AND guest_name_norm = ? AND guest_phone IS NOT NULL AND guest_phone != ''
         ORDER BY id DESC LIMIT 1`
      )
      .get(tenantId, nameNorm)) as { guest_phone?: string } | undefined
    return row?.guest_phone || null
  } catch {
    return null
  }
}

async function historyEmail(db: DbClient, tenantId: number, nameNorm: string): Promise<string | null> {
  if (!nameNorm) return null
  try {
    const row = (await db
      .prepare(
        `SELECT guest_email FROM bookings
         WHERE tenant_id = ? AND guest_name_norm = ? AND guest_email IS NOT NULL AND guest_email != ''
         ORDER BY id DESC LIMIT 1`
      )
      .get(tenantId, nameNorm)) as { guest_email?: string } | undefined
    return row?.guest_email || null
  } catch {
    return null
  }
}

async function closeGap(db: DbClient, bookingId: number, field: string, source: string) {
  try {
    await db
      .prepare(
        `UPDATE nb_gaps SET status = 'filled', filled_value_source = ?, filled_at = CURRENT_TIMESTAMP
         WHERE booking_id = ? AND field = ? AND status IN ('open','filling','staff_needed')`
      )
      .run(source, bookingId, field)
  } catch {
    // gap table optional in some tests
  }
}

async function markStaffNeeded(db: DbClient, bookingId: number, field: string) {
  try {
    await db
      .prepare(
        `UPDATE nb_gaps SET status = 'staff_needed'
         WHERE booking_id = ? AND field = ? AND status IN ('open','filling')`
      )
      .run(bookingId, field)
  } catch {
    // ignore
  }
}
