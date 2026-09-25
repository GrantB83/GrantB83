/**
 * L1 Nightsbridge email apply: dedup, event-time order, upsert by nb_ref.
 * Never creates a UMI / guest thread.
 */

import type { DbClient } from '@/lib/db'
import { ensureSprint2Schema, recordNbSyncRun } from '@/lib/sprint2-schema'
import { parseNbEmail, isForwardVerification, type NbParseResult } from '@/lib/nb-email-parse'
import { detectAndLogGaps } from '@/lib/nb-gaps'
import { fillGapsForBooking } from '@/lib/nb-gap-fill'
import { applyFieldWrite, type FieldSourceMap } from '@/lib/nb-reconcile'

export interface NbIngestInput {
  from: string
  subject?: string
  text: string
  timestamp?: string
  messageId?: string
  emailDate?: string
  tenantId?: number
}

export interface NbIngestResult {
  ok: boolean
  nb: true
  eventStatus: 'applied' | 'stale' | 'duplicate' | 'ignored' | 'parse_failed'
  type: string
  nbRef: string | null
  bookingId?: number | null
}

function parseSources(raw: string | null | undefined): FieldSourceMap {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

export async function ingestNbEmail(db: DbClient, input: NbIngestInput): Promise<NbIngestResult> {
  await ensureSprint2Schema(db)
  const tenantId = input.tenantId || 1
  const messageId = input.messageId || null
  const receivedAt = input.timestamp || new Date().toISOString()
  const emailDate = input.emailDate || receivedAt

  if (isForwardVerification(input.from, input.subject)) {
    await db
      .prepare(
        `INSERT INTO nb_email_raw (received_at, sender, subject, message_id, body_text)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(receivedAt, input.from, input.subject || '', messageId, input.text)
    return { ok: true, nb: true, eventStatus: 'ignored', type: 'FORWARD_VERIFY', nbRef: null }
  }

  if (messageId) {
    const seen = (await db
      .prepare(`SELECT id FROM nb_email_events WHERE message_id = ?`)
      .get(messageId)) as { id: number } | undefined
    if (seen) {
      return { ok: true, nb: true, eventStatus: 'duplicate', type: 'OTHER', nbRef: null }
    }
  }

  const parsed = parseNbEmail({ subject: input.subject, text: input.text, from: input.from })
  if (parsed.status === 'ignored') {
    await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'ignored')
    return { ok: true, nb: true, eventStatus: 'ignored', type: parsed.type, nbRef: parsed.nbRef }
  }
  if (parsed.status === 'parse_failed') {
    await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'parse_failed')
    await recordNbSyncRun(db, {
      layer: 'email',
      startedAt: receivedAt,
      ok: false,
      code: 'PARSE_FAILED',
      rows: 0,
      message: parsed.reason || 'parse_failed',
    })
    return { ok: false, nb: true, eventStatus: 'parse_failed', type: parsed.type, nbRef: parsed.nbRef }
  }

  if (parsed.nbRef && parsed.type !== 'PAYMENT' && parsed.type !== 'VCC_PROCESSING') {
    const dup = (await db
      .prepare(
        `SELECT id FROM nb_email_events WHERE nb_ref = ? AND type = ? AND content_hash = ? LIMIT 1`
      )
      .get(parsed.nbRef, parsed.type, parsed.contentHash)) as { id: number } | undefined
    if (dup) {
      await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'duplicate')
      return { ok: true, nb: true, eventStatus: 'duplicate', type: parsed.type, nbRef: parsed.nbRef }
    }
  }

  if (parsed.type === 'PAYMENT') {
    await db
      .prepare(
        `INSERT INTO booking_payments (tenant_id, nb_ref, amount, status, source, raw_masked)
         VALUES (?, ?, ?, ?, 'nb_email', ?)`
      )
      .run(
        tenantId,
        parsed.nbRef,
        Number(String(parsed.fields.amount || '').replace(/[^\d.]/g, '') || 0) || null,
        parsed.fields.status || 'success',
        'pan_stripped'
      )
    await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'applied', receivedAt)
    return { ok: true, nb: true, eventStatus: 'applied', type: parsed.type, nbRef: parsed.nbRef }
  }

  if (parsed.type === 'VCC_PROCESSING') {
    await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'applied', receivedAt)
    return { ok: true, nb: true, eventStatus: 'applied', type: parsed.type, nbRef: parsed.nbRef }
  }

  const existing = parsed.nbRef
    ? ((await db
        .prepare(
          `SELECT id, status, nb_last_event_at, last_report_at, field_sources_json,
                  guest_phone, guest_email, guest_name, check_in, check_out, suite_or_unit,
                  guest_phone_verified, guest_email_verified, notes_email
           FROM bookings WHERE tenant_id = ? AND nightsbridge_booking_id = ?`
        )
        .get(tenantId, parsed.nbRef)) as Record<string, unknown> | undefined)
    : undefined

  const lastEvent = existing?.nb_last_event_at ? new Date(String(existing.nb_last_event_at)) : null
  const thisEvent = new Date(emailDate)
  const isCancel = parsed.type === 'OTA_CANCELLATION'
  const existingCancelled = String(existing?.status || '') === 'cancelled'

  if (existing && lastEvent && thisEvent <= lastEvent) {
    if (!(isCancel && !existingCancelled)) {
      await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'stale')
      await fillNullsOnly(db, existing, parsed)
      return { ok: true, nb: true, eventStatus: 'stale', type: parsed.type, nbRef: parsed.nbRef, bookingId: Number(existing.id) }
    }
  }

  if (isCancel && existingCancelled && lastEvent && thisEvent < lastEvent) {
    await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'stale')
    return { ok: true, nb: true, eventStatus: 'stale', type: parsed.type, nbRef: parsed.nbRef, bookingId: Number(existing.id) }
  }

  if (!isCancel && existingCancelled && lastEvent && thisEvent < lastEvent) {
    await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'stale')
    return { ok: true, nb: true, eventStatus: 'stale', type: parsed.type, nbRef: parsed.nbRef, bookingId: Number(existing.id) }
  }

  const bookingId = await upsertFromEmail(db, tenantId, parsed, existing, emailDate)
  await insertEvent(db, messageId, receivedAt, emailDate, input.from, parsed, 'applied', receivedAt)
  if (bookingId && parsed.type !== 'OTA_CANCELLATION') {
    await detectAndLogGaps(db, { tenantId, bookingId, nbRef: parsed.nbRef, detectedBy: 'email' })
    await fillGapsForBooking(db, { tenantId, bookingId, notes: parsed.fields.notes || '', emailId: messageId })
  }
  await recordNbSyncRun(db, {
    layer: 'email',
    startedAt: receivedAt,
    ok: true,
    code: 'OK',
    rows: 1,
    message: parsed.type,
  })
  return { ok: true, nb: true, eventStatus: 'applied', type: parsed.type, nbRef: parsed.nbRef, bookingId }
}

async function insertEvent(
  db: DbClient,
  messageId: string | null,
  receivedAt: string,
  emailDate: string,
  sender: string,
  parsed: NbParseResult,
  status: string,
  appliedAt?: string
) {
  await db
    .prepare(
      `INSERT INTO nb_email_events
        (message_id, received_at, email_date, sender, type, nb_ref, content_hash, parsed_json, status, applied_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      messageId,
      receivedAt,
      emailDate,
      sender,
      parsed.type,
      parsed.nbRef,
      parsed.contentHash,
      JSON.stringify(parsed.fields),
      status,
      appliedAt || null
    )
}

async function fillNullsOnly(db: DbClient, existing: Record<string, unknown>, parsed: NbParseResult) {
  const phone = parsed.fields.guest_tel || parsed.fields.guest_phone
  if (!existing.guest_phone && phone) {
    await db.prepare(`UPDATE bookings SET guest_phone = ? WHERE id = ?`).run(phone, existing.id)
  }
  if (!existing.guest_email && parsed.fields.guest_email) {
    await db.prepare(`UPDATE bookings SET guest_email = ? WHERE id = ?`).run(parsed.fields.guest_email, existing.id)
  }
}

async function upsertFromEmail(
  db: DbClient,
  tenantId: number,
  parsed: NbParseResult,
  existing: Record<string, unknown> | undefined,
  emailDate: string
): Promise<number | null> {
  const sources = parseSources(existing?.field_sources_json ? String(existing.field_sources_json) : null)
  const name = parsed.fields.guest_name || parsed.fields.client_name || String(existing?.guest_name || 'Guest')
  const checkIn = toIsoDate(parsed.fields.arrive) || String(existing?.check_in || '1970-01-01')
  const checkOut = toIsoDate(parsed.fields.depart) || String(existing?.check_out || checkIn)
  const phone = parsed.fields.guest_tel || parsed.fields.guest_phone || ''
  const email = parsed.fields.guest_email || ''
  const room = parsed.fields.room_type_line || String(existing?.suite_or_unit || '')
  const notes = parsed.fields.notes || ''

  if (parsed.type === 'OTA_CANCELLATION') {
    if (!existing) return null
    const decision = applyFieldWrite({
      field: 'status',
      current: { value: existing.status, source: 'email', at: existing.nb_last_event_at ? String(existing.nb_last_event_at) : null },
      incoming: { value: 'cancelled', source: 'email', at: emailDate },
    })
    if (decision.action === 'write') {
      await db
        .prepare(
          `UPDATE bookings SET status = 'cancelled', cancelled_source = 'nb_email', nb_last_event_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
        .run(emailDate, existing.id)
    }
    return Number(existing.id)
  }

  if (!existing) {
    const result = await db
      .prepare(
        `INSERT INTO bookings (
          tenant_id, guest_name, guest_name_norm, check_in, check_out, suite_or_unit, suite_or_unit_norm,
          guest_phone, guest_email, notes, notes_email, status, nightsbridge_booking_id, source,
          nb_last_event_at, field_sources_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'nb_email', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(
        tenantId,
        name,
        name.toLowerCase(),
        checkIn,
        checkOut,
        room,
        room.toLowerCase(),
        phone,
        email,
        notes,
        notes,
        parsed.nbRef,
        emailDate,
        JSON.stringify({
          guest_name: { source: 'email', at: emailDate },
          guest_phone: { source: 'email', at: emailDate },
          guest_email: { source: 'email', at: emailDate },
          check_in: { source: 'email', at: emailDate },
          check_out: { source: 'email', at: emailDate },
        } satisfies FieldSourceMap)
      )
    return Number(result.lastInsertRowid)
  }

  const nextSources = { ...sources }
  const writes: string[] = []
  const args: unknown[] = []

  const plan = [
    ['guest_name', name],
    ['guest_phone', phone],
    ['guest_email', email],
    ['check_in', checkIn],
    ['check_out', checkOut],
    ['suite_or_unit', room],
  ] as const

  for (const [field, value] of plan) {
    if (!value) continue
    const currentValue = existing[field]
    const verified =
      field === 'guest_phone'
        ? String(existing.guest_phone_verified || '') || null
        : field === 'guest_email'
          ? String(existing.guest_email_verified || '') || null
          : sources[field]?.verified || null
    const decision = applyFieldWrite({
      field,
      current: {
        value: currentValue,
        source: sources[field]?.source || 'email',
        at: sources[field]?.at || (existing.nb_last_event_at ? String(existing.nb_last_event_at) : null),
        verified,
      },
      incoming: { value, source: 'email', at: emailDate },
    })
    if (decision.action === 'write') {
      writes.push(`${field} = ?`)
      args.push(value)
      nextSources[field] = { source: 'email', at: emailDate }
    }
  }

  writes.push('notes_email = ?', 'nb_last_event_at = ?', 'field_sources_json = ?', 'updated_at = CURRENT_TIMESTAMP')
  args.push(notes || existing.notes_email || '', emailDate, JSON.stringify(nextSources), existing.id)
  await db.prepare(`UPDATE bookings SET ${writes.join(', ')} WHERE id = ?`).run(...args)
  return Number(existing.id)
}

function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) {
    const m = raw.match(/(\d{2}) (\w+) (\d{4})/)
    if (!m) return null
    const dt = Date.parse(`${m[1]} ${m[2]} ${m[3]}`)
    if (Number.isNaN(dt)) return null
    return new Date(dt).toISOString().slice(0, 10)
  }
  return new Date(parsed).toISOString().slice(0, 10)
}

export function looksLikeNbInbound(from: string, subject?: string): boolean {
  return isForwardVerification(from, subject) || /nightsbridge/i.test(from) || /nightsbridge|booking for |cancellation of booking|travelit confirmation|credit card payment - booking/i.test(String(subject || ''))
}
