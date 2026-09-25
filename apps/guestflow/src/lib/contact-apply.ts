import type { DbClient } from '@/lib/db'
import { upsertGuestContact } from '@/lib/guest-contacts'
import { normalizeEmail, normalizeZaE164 } from '@/lib/phone'
import {
  classifyEmailKind,
  GUEST_CONTACT_SOURCE_MAP,
  isBlockGuestName,
  isPlaceholderEmail,
  mayReplaceContactField,
  type ContactSource,
  type EmailKind,
} from '@/lib/contact-provenance'
import { ensureContactSchema } from '@/lib/contact-schema'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ApplyBookingContactInput {
  tenantId: number
  bookingId: number
  phone?: string | null
  email?: string | null
  source: ContactSource
  sourceRef?: string | null
  displayName?: string | null
  lastStayAt?: string | null
  lastSuite?: string | null
  nbid?: string | null
}

export interface ApplyBookingContactResult {
  phoneApplied: boolean
  emailApplied: boolean
  phone: string | null
  email: string | null
  emailKind: EmailKind | null
  skippedReason?: string
}

export interface ValidatedContactInput {
  phone: string | null
  email: string | null
  error?: string
}

export function validateContactInput(input: {
  phone?: string | null
  email?: string | null
  requireOne?: boolean
}): ValidatedContactInput {
  const rawPhone = input.phone?.trim() || ''
  const rawEmail = input.email?.trim() || ''

  if (input.requireOne !== false && !rawPhone && !rawEmail) {
    return { phone: null, email: null, error: 'Phone or email is required' }
  }

  let phone: string | null = null
  if (rawPhone) {
    phone = normalizeZaE164(rawPhone)
    if (!phone) {
      return { phone: null, email: null, error: 'Invalid phone number' }
    }
  }

  let email: string | null = null
  if (rawEmail) {
    email = normalizeEmail(rawEmail)
    if (!email || !EMAIL_RE.test(email) || isPlaceholderEmail(email)) {
      return { phone: null, email: null, error: 'Invalid email address' }
    }
  }

  return { phone, email }
}

interface StoredBookingContact {
  guest_phone: string | null
  guest_email: string | null
  guest_phone_source: string | null
  guest_email_source: string | null
  guest_email_kind: string | null
  extra_rooms: string | null
  guest_name: string | null
  nightsbridge_booking_id: string | null
  check_out: string | null
  suite_or_unit: string | null
}

async function loadStored(
  db: DbClient,
  bookingId: number
): Promise<StoredBookingContact | null> {
  try {
    const row = (await db
      .prepare(
        `SELECT guest_phone, guest_email, guest_phone_source, guest_email_source,
                guest_email_kind, extra_rooms, guest_name, nightsbridge_booking_id,
                check_out, suite_or_unit
         FROM bookings WHERE id = ?`
      )
      .get(bookingId)) as StoredBookingContact | undefined
    return row || null
  } catch {
    const row = (await db
      .prepare(
        `SELECT guest_phone, guest_name, nightsbridge_booking_id, check_out, suite_or_unit
         FROM bookings WHERE id = ?`
      )
      .get(bookingId)) as Partial<StoredBookingContact> | undefined
    if (!row) return null
    return {
      guest_phone: row.guest_phone || null,
      guest_email: null,
      guest_phone_source: null,
      guest_email_source: null,
      guest_email_kind: null,
      extra_rooms: null,
      guest_name: row.guest_name || null,
      nightsbridge_booking_id: row.nightsbridge_booking_id || null,
      check_out: row.check_out || null,
      suite_or_unit: row.suite_or_unit || null,
    }
  }
}

export async function applyBookingContact(
  db: DbClient,
  input: ApplyBookingContactInput
): Promise<ApplyBookingContactResult> {
  await ensureContactSchema(db)

  if (isBlockGuestName(input.displayName)) {
    return {
      phoneApplied: false,
      emailApplied: false,
      phone: null,
      email: null,
      emailKind: null,
      skippedReason: 'block_row',
    }
  }

  const stored = await loadStored(db, input.bookingId)
  if (!stored) {
    return {
      phoneApplied: false,
      emailApplied: false,
      phone: null,
      email: null,
      emailKind: null,
      skippedReason: 'booking_missing',
    }
  }

  const incomingPhone = input.phone ? normalizeZaE164(input.phone) : null
  let incomingEmail = input.email ? normalizeEmail(input.email) : null
  if (incomingEmail && (isPlaceholderEmail(incomingEmail) || !EMAIL_RE.test(incomingEmail))) {
    incomingEmail = null
  }
  const incomingKind = classifyEmailKind(incomingEmail)

  const storedPhone = stored.guest_phone?.trim() || null
  const storedEmail = stored.guest_email?.trim() || null

  const phoneApplied = Boolean(
    incomingPhone &&
      mayReplaceContactField({
        incomingSource: input.source,
        storedSource: stored.guest_phone_source,
        storedValue: storedPhone,
      })
  )
  const emailApplied = Boolean(
    incomingEmail &&
      mayReplaceContactField({
        incomingSource: input.source,
        incomingKind,
        storedSource: stored.guest_email_source,
        storedKind: stored.guest_email_kind,
        storedValue: storedEmail,
      })
  )

  const nextPhone = phoneApplied ? incomingPhone : storedPhone
  const nextEmail = emailApplied ? incomingEmail : storedEmail
  const nextPhoneSource = phoneApplied ? input.source : stored.guest_phone_source
  const nextEmailSource = emailApplied ? input.source : stored.guest_email_source
  const nextEmailKind = emailApplied
    ? incomingKind
    : (stored.guest_email_kind as EmailKind | null) || classifyEmailKind(nextEmail)

  if (phoneApplied || emailApplied) {
    await db
      .prepare(
        `UPDATE bookings
         SET guest_phone = ?,
             guest_email = ?,
             guest_phone_source = ?,
             guest_email_source = ?,
             guest_email_kind = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(nextPhone, nextEmail, nextPhoneSource, nextEmailSource, nextEmailKind, input.bookingId)

    await db
      .prepare(
        `INSERT INTO booking_contacts (
           booking_id, tenant_id, phone, phone_source, phone_source_ref,
           email, email_source, email_kind, email_source_ref, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(booking_id) DO UPDATE SET
           phone = excluded.phone,
           phone_source = excluded.phone_source,
           phone_source_ref = CASE WHEN ? THEN excluded.phone_source_ref ELSE booking_contacts.phone_source_ref END,
           email = excluded.email,
           email_source = excluded.email_source,
           email_kind = excluded.email_kind,
           email_source_ref = CASE WHEN ? THEN excluded.email_source_ref ELSE booking_contacts.email_source_ref END,
           updated_at = CURRENT_TIMESTAMP`
      )
      .run(
        input.bookingId,
        input.tenantId,
        nextPhone,
        nextPhoneSource,
        phoneApplied ? input.sourceRef || null : null,
        nextEmail,
        nextEmailSource,
        nextEmailKind,
        emailApplied ? input.sourceRef || null : null,
        phoneApplied ? 1 : 0,
        emailApplied ? 1 : 0
      )

    if (nextPhone || nextEmail) {
      await upsertGuestContact(db, {
        tenantId: input.tenantId,
        phone: nextPhone,
        email: nextEmail,
        displayName: input.displayName || stored.guest_name,
        lastStayAt: input.lastStayAt || stored.check_out,
        lastSuite: input.lastSuite || stored.suite_or_unit,
        source: GUEST_CONTACT_SOURCE_MAP[input.source],
        nbid: input.nbid || stored.nightsbridge_booking_id,
      })
    }
  }

  return {
    phoneApplied,
    emailApplied,
    phone: nextPhone,
    email: nextEmail,
    emailKind: nextEmailKind,
  }
}
