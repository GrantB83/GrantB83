import type { DbClient } from '@/lib/db'
import { ensureContactSchema } from '@/lib/contact-schema'
import { upsertGuestContact } from '@/lib/guest-contacts'
import { normalizeEmail, normalizeZaE164 } from '@/lib/phone'
import { sqliteTableExists } from '@/lib/approvals-queue'
import { mapSourceToChannel, type UmiChannel } from '@/lib/umi-channels'
import { computeDedupKey } from '@/lib/umi-dedup'
import { ensureUmiSchema } from '@/lib/umi-schema'
import {
  inboxSortBucket,
  sastDateString,
  sortInboxThreads,
  TEMP_EXPIRE_DAYS,
  TEMP_NUDGE_HOURS,
} from '@/lib/umi-sort'
import { isActiveGuestBooking, isOwnerBlock } from '@/lib/booking-filters'
import { ensureDeliverySchema } from '@/lib/delivery-schema'
import { isStuckPending } from '@/lib/delivery-status'
import {
  computeCareWindow,
  loadLastWabaInboundAt,
  loadLastWabaInboundAtByThread,
  type CareWindow,
} from '@/lib/whatsapp-care-window'
import { scrubArrivalDraftSermon } from '@/lib/scrub-arrival-sermon'
import { isPhoneLikeDisplayName, isWaWebSentinelBody } from '@/lib/wa-web-body'

export interface ResolveInboundInput {
  from: string
  source: string
  timestamp: string
  text: string
  externalMessageId?: string
  preferredThreadId?: number
  displayName?: string | null
}

export interface DuplicateMessageRow {
  id: number
  thread_id: number
  message_text?: string | null
  channel?: string | null
  body_unavailable?: number | null
}

export interface UmiThreadRow {
  id: number
  tenant_id: number
  source: string
  from_number: string
  guest_name: string | null
  status: string
  booking_id: number | null
  thread_kind: 'booking' | 'temp'
  guest_contact_id: number | null
  last_channel: string | null
  last_inbound_channel: string | null
  last_outbound_at: string | null
  last_inbound_at: string | null
  pending_reply: number
  expires_at: string | null
  nudged_at: string | null
  hygiene_status: string | null
  last_message_at: string | null
  metadata: string | null
}

export interface InboxThread {
  id: number
  threadKind: 'booking' | 'temp'
  bookingId: number | null
  bookerName: string
  suite: string | null
  checkIn: string | null
  checkOut: string | null
  nightsbridgeBookingId: string | null
  lastChannel: string | null
  lastInboundChannel: string | null
  lastMessageAt: string | null
  preview: string
  pendingReply: boolean
  hasOpenDraft: boolean
  needsAttention: boolean
  sortBucket: 0 | 1 | 2
  hygieneStatus: string | null
  fromNumber: string
  careWindow?: CareWindow
  arrivalStage?: string | null
  attentionReason?: string | null
}

interface BookingMatch {
  id: number
  guest_name: string
  guest_phone: string | null
  guest_email?: string | null
  check_in: string
  check_out: string
  suite_or_unit: string | null
  nightsbridge_booking_id: string | null
  status: string
}

function asNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value)
  return Number(value)
}

function readMessageText(message: { message_text?: unknown; body?: unknown }): string {
  if (typeof message.message_text === 'string') return message.message_text
  if (message.message_text != null) return String(message.message_text)
  if (typeof message.body === 'string') return message.body
  return ''
}

function parseJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function tempExpiry(from: Date): string {
  const expires = new Date(from.getTime())
  expires.setUTCDate(expires.getUTCDate() + TEMP_EXPIRE_DAYS)
  return expires.toISOString()
}

async function loadThread(db: DbClient, id: unknown): Promise<UmiThreadRow | null> {
  const row = (await db
    .prepare('SELECT * FROM inbound_threads WHERE id = ?')
    .get(id)) as UmiThreadRow | undefined
  if (!row) return null
  return { ...row, id: asNumber(row.id) }
}

function asDuplicateRow(row: DuplicateMessageRow | undefined | null): DuplicateMessageRow | null {
  if (!row) return null
  return {
    id: asNumber(row.id),
    thread_id: asNumber(row.thread_id),
    message_text: row.message_text ?? null,
    channel: row.channel ?? null,
    body_unavailable: row.body_unavailable ?? null,
  }
}

function isSentinelMessageRow(row: DuplicateMessageRow | null): boolean {
  if (!row) return false
  return isWaWebSentinelBody(row.message_text) || Number(row.body_unavailable) === 1
}

export async function findDuplicateMessage(
  db: DbClient,
  input: { externalMessageId?: string; dedupKey?: string }
): Promise<DuplicateMessageRow | null> {
  if (input.externalMessageId) {
    try {
      const byExternal = (await db
        .prepare(
          `SELECT id, thread_id, message_text, channel, body_unavailable
           FROM inbound_messages WHERE external_message_id = ? LIMIT 1`
        )
        .get(input.externalMessageId)) as DuplicateMessageRow | undefined
      const found = asDuplicateRow(byExternal)
      if (found) return found
    } catch {
      const byExternal = (await db
        .prepare(`SELECT id, thread_id, message_text FROM inbound_messages WHERE external_message_id = ? LIMIT 1`)
        .get(input.externalMessageId)) as DuplicateMessageRow | undefined
      const found = asDuplicateRow(byExternal)
      if (found) return found
    }
  }
  if (input.dedupKey) {
    try {
      const byDedup = (await db
        .prepare(
          `SELECT id, thread_id, message_text, channel, body_unavailable
           FROM inbound_messages WHERE dedup_key = ? LIMIT 1`
        )
        .get(input.dedupKey)) as DuplicateMessageRow | undefined
      const found = asDuplicateRow(byDedup)
      if (found) return found
    } catch {
      const byDedup = (await db
        .prepare(`SELECT id, thread_id FROM inbound_messages WHERE dedup_key = ? LIMIT 1`)
        .get(input.dedupKey)) as DuplicateMessageRow | undefined
      const found = asDuplicateRow(byDedup)
      if (found) return found
    }
  }
  return null
}

export async function findRealDuplicateMessage(
  db: DbClient,
  input: { externalMessageId?: string; dedupKey?: string }
): Promise<DuplicateMessageRow | null> {
  if (input.externalMessageId) {
    const byExternal = await findDuplicateMessage(db, {
      externalMessageId: input.externalMessageId,
    })
    if (byExternal && !isSentinelMessageRow(byExternal)) return byExternal
  }
  if (input.dedupKey) {
    const byDedup = await findDuplicateMessage(db, { dedupKey: input.dedupKey })
    if (byDedup && !isSentinelMessageRow(byDedup)) return byDedup
  }
  return null
}

export async function findWaWebSentinelForReplace(
  db: DbClient,
  input: { externalMessageId?: string; from: string; timestamp: string }
): Promise<DuplicateMessageRow | null> {
  if (input.externalMessageId) {
    const byExternal = await findDuplicateMessage(db, { externalMessageId: input.externalMessageId })
    if (byExternal && isSentinelMessageRow(byExternal)) return byExternal
  }

  const senders = Array.from(
    new Set([input.from, normalizeZaE164(input.from)].filter((value): value is string => Boolean(value)))
  )
  for (const from of senders) {
    try {
      const row = (await db
        .prepare(
          `SELECT id, thread_id, message_text, channel, body_unavailable
           FROM inbound_messages
           WHERE from_number = ?
             AND message_timestamp = ?
             AND COALESCE(channel, 'whatsapp_web') = 'whatsapp_web'
             AND (
               message_text IN ('[metadata-only]', '[body unavailable]', '[observe-probe]')
               OR COALESCE(body_unavailable, 0) = 1
             )
           LIMIT 1`
        )
        .get(from, input.timestamp)) as DuplicateMessageRow | undefined
      const found = asDuplicateRow(row)
      if (found) return found
    } catch {
      const row = (await db
        .prepare(
          `SELECT id, thread_id, message_text
           FROM inbound_messages
           WHERE from_number = ?
             AND message_timestamp = ?
             AND message_text IN ('[metadata-only]', '[body unavailable]', '[observe-probe]')
           LIMIT 1`
        )
        .get(from, input.timestamp)) as DuplicateMessageRow | undefined
      const found = asDuplicateRow(row)
      if (found) return found
    }
  }
  return null
}

export async function deleteSentinelMessage(db: DbClient, id: number): Promise<void> {
  try {
    await db
      .prepare(
        `DELETE FROM inbound_messages
         WHERE id = ?
           AND (
             message_text IN ('[metadata-only]', '[body unavailable]', '[observe-probe]')
             OR COALESCE(body_unavailable, 0) = 1
           )`
      )
      .run(id)
  } catch {
    await db
      .prepare(
        `DELETE FROM inbound_messages
         WHERE id = ?
           AND message_text IN ('[metadata-only]', '[body unavailable]', '[observe-probe]')`
      )
      .run(id)
  }
}

export async function findThreadForSourceName(
  db: DbClient,
  tenantId: number,
  from: string,
  preferredThreadId?: number
): Promise<UmiThreadRow | null> {
  if (preferredThreadId) {
    const preferred = await loadThread(db, preferredThreadId)
    if (preferred) return preferred
  }
  return findTempThread(db, tenantId, from)
}

export async function applySourceDisplayName(
  db: DbClient,
  threadId: number,
  displayName: string | null | undefined,
  from: string
): Promise<boolean> {
  const name = String(displayName || '').trim()
  if (!name || isPhoneLikeDisplayName(name, from)) return false
  const thread = await loadThread(db, threadId)
  if (!thread) return false
  const current = thread.guest_name
  if (current && !isPhoneLikeDisplayName(current, from)) return false
  await db
    .prepare(`UPDATE inbound_threads SET guest_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(name, threadId)
  return true
}

function rejectInactiveBookings<T extends BookingMatch>(rows: T[]): T[] {
  return rows.filter((row) => isActiveGuestBooking(row) && !isOwnerBlock(row))
}

async function loadBookings(db: DbClient, tenantId: number): Promise<BookingMatch[]> {
  const where = `WHERE tenant_id = ? AND COALESCE(status, '') NOT IN ('cancelled', 'canceled') AND UPPER(TRIM(COALESCE(guest_name, ''))) != 'BLOCK'`
  try {
    const rows = ((await db
      .prepare(
        `SELECT id, guest_name, guest_phone, guest_email, check_in, check_out, suite_or_unit, nightsbridge_booking_id, status
         FROM bookings
         ${where}`
      )
      .all(tenantId)) || []) as BookingMatch[]
    return rejectInactiveBookings(rows)
  } catch {
    try {
      const rows = ((await db
        .prepare(
          `SELECT id, guest_name, guest_phone, check_in, check_out, suite_or_unit, nightsbridge_booking_id, status
           FROM bookings
           ${where}`
        )
        .all(tenantId)) || []) as BookingMatch[]
      return rejectInactiveBookings(rows.map((row) => ({ ...row, guest_email: null })))
    } catch {
      return []
    }
  }
}

function phonesEqual(a?: string | null, b?: string | null): boolean {
  const left = normalizeZaE164(a)
  const right = normalizeZaE164(b)
  return Boolean(left && right && left === right)
}

function emailsEqual(a?: string | null, b?: string | null): boolean {
  const left = normalizeEmail(a)
  const right = normalizeEmail(b)
  return Boolean(left && right && left === right)
}

async function bookingsForContact(
  db: DbClient,
  tenantId: number,
  from: string
): Promise<BookingMatch[]> {
  const phone = normalizeZaE164(from)
  const email = normalizeEmail(from)
  const bookings = await loadBookings(db, tenantId)
  const matched = new Map<number, BookingMatch>()

  for (const booking of bookings) {
    if (phone && phonesEqual(booking.guest_phone, phone)) {
      matched.set(asNumber(booking.id), booking)
    }
    if (email && emailsEqual(booking.guest_email, email)) {
      matched.set(asNumber(booking.id), booking)
    }
  }

  if (email) {
    try {
      const contact = (await db
        .prepare(
          `SELECT normalized_phone, nbid FROM guest_contacts
           WHERE tenant_id = ? AND email = ? LIMIT 1`
        )
        .get(tenantId, email)) as { normalized_phone: string | null; nbid: string | null } | undefined
      if (contact) {
        for (const booking of bookings) {
          if (
            (contact.normalized_phone && phonesEqual(booking.guest_phone, contact.normalized_phone)) ||
            (contact.nbid && booking.nightsbridge_booking_id === contact.nbid)
          ) {
            matched.set(asNumber(booking.id), booking)
          }
        }
      }
    } catch {
      // guest_contacts may be missing in older fixtures
    }
  }

  return [...matched.values()]
}

function pickUniqueBooking(matches: BookingMatch[], now = new Date()): BookingMatch | null {
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]

  const today = sastDateString(now)
  const current = matches.filter((booking) => {
    const checkout = String(booking.check_out || '').slice(0, 10)
    const checkin = String(booking.check_in || '').slice(0, 10)
    return checkout >= today || checkin >= today
  })
  if (current.length === 1) return current[0]
  if (current.length > 1) return null

  return [...matches].sort((a, b) => String(b.check_in).localeCompare(String(a.check_in)))[0] || null
}

export async function findBookingThread(
  db: DbClient,
  tenantId: number,
  bookingId: number
): Promise<UmiThreadRow | null> {
  const row = (await db
    .prepare(
      `SELECT * FROM inbound_threads
       WHERE tenant_id = ? AND booking_id = ? AND thread_kind = 'booking'
       LIMIT 1`
    )
    .get(tenantId, bookingId)) as UmiThreadRow | undefined
  return row ? { ...row, id: asNumber(row.id) } : null
}

async function findTempThread(
  db: DbClient,
  tenantId: number,
  from: string
): Promise<UmiThreadRow | null> {
  const row = (await db
    .prepare(
      `SELECT * FROM inbound_threads
       WHERE tenant_id = ? AND from_number = ? AND thread_kind = 'temp'
         AND COALESCE(status, '') NOT IN ('linked')
       ORDER BY last_message_at DESC
       LIMIT 1`
    )
    .get(tenantId, from)) as UmiThreadRow | undefined
  return row ? { ...row, id: asNumber(row.id) } : null
}

async function insertThread(
  db: DbClient,
  input: {
    tenantId: number
    source: string
    from: string
    timestamp: string
    kind: 'booking' | 'temp'
    bookingId?: number | null
    guestName?: string | null
    channel: UmiChannel
    contactId?: number | null
  }
): Promise<UmiThreadRow> {
  const expiresAt = input.kind === 'temp' ? tempExpiry(new Date(input.timestamp)) : null
  const inserted = await db
    .prepare(
      `INSERT INTO inbound_threads (
        tenant_id, source, from_number, guest_name, status,
        first_message_at, last_message_at, booking_id, thread_kind,
        guest_contact_id, last_channel, last_inbound_channel,
        last_inbound_at, pending_reply, expires_at, hygiene_status
      ) VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'active')`
    )
    .run(
      input.tenantId,
      input.source,
      input.from,
      input.guestName || null,
      input.timestamp,
      input.timestamp,
      input.bookingId ?? null,
      input.kind,
      input.contactId ?? null,
      input.channel,
      input.channel,
      input.timestamp,
      expiresAt
    )

  const thread = await loadThread(db, inserted.lastInsertRowid)
  if (!thread) throw new Error('Failed to create UMI thread')
  return thread
}

export async function touchInboundThread(
  db: DbClient,
  thread: UmiThreadRow,
  input: { timestamp: string; channel: UmiChannel; source: string; guestName?: string | null }
): Promise<void> {
  await db
    .prepare(
      `UPDATE inbound_threads
       SET last_message_at = ?,
           last_channel = ?,
           last_inbound_channel = ?,
           last_inbound_at = ?,
           pending_reply = 1,
           source = ?,
           guest_name = COALESCE(?, guest_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(
      input.timestamp,
      input.channel,
      input.channel,
      input.timestamp,
      input.source,
      input.guestName || null,
      thread.id
    )
}

export async function resolveUmiThread(
  db: DbClient,
  tenantId: number,
  input: ResolveInboundInput
): Promise<{
  thread: UmiThreadRow
  channel: UmiChannel
  duplicate?: { id: number; thread_id: number }
  dedupKey: string
  created: boolean
}> {
  await ensureUmiSchema(db)
  const channel = mapSourceToChannel(input.source)
  const sourceName =
    input.displayName && !isPhoneLikeDisplayName(input.displayName, input.from)
      ? String(input.displayName).trim()
      : null
  const dedupKey = computeDedupKey(input.from, input.text, input.timestamp)
  const duplicate = await findDuplicateMessage(db, {
    externalMessageId: input.externalMessageId,
    dedupKey,
  })
  if (duplicate && !(channel === 'whatsapp_web' && isSentinelMessageRow(duplicate))) {
    const thread = (await loadThread(db, duplicate.thread_id)) || {
      id: duplicate.thread_id,
      tenant_id: tenantId,
      source: input.source,
      from_number: input.from,
      guest_name: null,
      status: 'new',
      booking_id: null,
      thread_kind: 'temp',
      guest_contact_id: null,
      last_channel: channel,
      last_inbound_channel: channel,
      last_outbound_at: null,
      last_inbound_at: input.timestamp,
      pending_reply: 1,
      expires_at: null,
      nudged_at: null,
      hygiene_status: 'active',
      last_message_at: input.timestamp,
      metadata: null,
    }
    return { thread, channel, duplicate, dedupKey, created: false }
  }

  if (input.preferredThreadId) {
    const preferred = await loadThread(db, input.preferredThreadId)
    if (preferred) {
      await touchInboundThread(db, preferred, {
        timestamp: input.timestamp,
        channel,
        source: input.source,
      })
      return { thread: (await loadThread(db, preferred.id))!, channel, dedupKey, created: false }
    }
  }

  const contact = await upsertGuestContact(db, {
    tenantId,
    phone: normalizeZaE164(input.from),
    email: normalizeEmail(input.from),
    displayName: sourceName,
    source: 'inbound',
  })

  const booking = pickUniqueBooking(await bookingsForContact(db, tenantId, input.from))
  if (booking) {
    const existing = await findBookingThread(db, tenantId, asNumber(booking.id))
    if (existing) {
      await touchInboundThread(db, existing, {
        timestamp: input.timestamp,
        channel,
        source: input.source,
        guestName: booking.guest_name,
      })
      return { thread: (await loadThread(db, existing.id))!, channel, dedupKey, created: false }
    }
    const created = await insertThread(db, {
      tenantId,
      source: input.source,
      from: input.from,
      timestamp: input.timestamp,
      kind: 'booking',
      bookingId: asNumber(booking.id),
      guestName: booking.guest_name,
      channel,
      contactId: contact?.id ?? null,
    })
    return { thread: created, channel, dedupKey, created: true }
  }

  const temp = await findTempThread(db, tenantId, input.from)
  if (temp) {
    await touchInboundThread(db, temp, {
      timestamp: input.timestamp,
      channel,
      source: input.source,
      guestName: sourceName,
    })
    if (sourceName) {
      await applySourceDisplayName(db, temp.id, sourceName, input.from)
    }
    return { thread: (await loadThread(db, temp.id))!, channel, dedupKey, created: false }
  }

  const created = await insertThread(db, {
    tenantId,
    source: input.source,
    from: input.from,
    timestamp: input.timestamp,
    kind: 'temp',
    guestName: sourceName,
    channel,
    contactId: contact?.id ?? null,
  })
  return { thread: created, channel, dedupKey, created: true }
}

export async function ensureBookingThreadForOutbound(
  db: DbClient,
  tenantId: number,
  booking: {
    id: number
    guest_name?: string | null
    guest_phone?: string | null
    guest_email?: string | null
  },
  input: { timestamp: string; channel: UmiChannel; source: string; from: string }
): Promise<UmiThreadRow> {
  await ensureUmiSchema(db)
  const existing = await findBookingThread(db, tenantId, booking.id)
  if (existing) return existing

  let contactId: number | null = null
  try {
    const contact = await upsertGuestContact(db, {
      tenantId,
      phone: booking.guest_phone,
      email: booking.guest_email,
      displayName: booking.guest_name,
      source: 'nb',
    })
    contactId = contact?.id ?? null
  } catch {
    contactId = null
  }

  return insertThread(db, {
    tenantId,
    source: input.source,
    from: input.from,
    timestamp: input.timestamp,
    kind: 'booking',
    bookingId: booking.id,
    guestName: booking.guest_name,
    channel: input.channel,
    contactId,
  })
}

export async function markThreadPendingDraft(db: DbClient, threadId: number): Promise<void> {
  await db
    .prepare(
      `UPDATE inbound_threads
       SET status = 'drafted', pending_reply = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(threadId)
}

export async function markThreadOutbound(
  db: DbClient,
  threadId: number,
  input: { timestamp: string; channel: UmiChannel; status?: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE inbound_threads
       SET last_message_at = ?,
           last_channel = ?,
           last_outbound_at = ?,
           pending_reply = 0,
           status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(input.timestamp, input.channel, input.timestamp, input.status || 'sent', threadId)
  try {
    await db
      .prepare(
        `UPDATE inbound_messages
         SET status = 'sent'
         WHERE thread_id = ? AND draft_reply IS NOT NULL AND COALESCE(status, '') <> 'sent'`
      )
      .run(threadId)
  } catch {
    // older fixtures may lack status
  }
}

export async function applyTempHygiene(
  db: DbClient,
  tenantId: number,
  now: Date = new Date()
): Promise<{ nudged: number; expired: number }> {
  await ensureUmiSchema(db)
  const temps = ((await db
    .prepare(
      `SELECT id, created_at, first_message_at, nudged_at, hygiene_status, status
       FROM inbound_threads
       WHERE tenant_id = ? AND thread_kind = 'temp'
         AND COALESCE(status, '') NOT IN ('linked')`
    )
    .all(tenantId)) || []) as Array<{
    id: number
    created_at: string
    first_message_at: string | null
    nudged_at: string | null
    hygiene_status: string | null
    status: string
  }>

  let nudged = 0
  let expired = 0
  const nowMs = now.getTime()

  for (const temp of temps) {
    const createdMs = Date.parse(temp.first_message_at || temp.created_at || '')
    if (!Number.isFinite(createdMs)) continue
    const ageMs = nowMs - createdMs
    if (ageMs >= TEMP_EXPIRE_DAYS * 24 * 60 * 60 * 1000 && temp.status !== 'expired') {
      await db
        .prepare(
          `UPDATE inbound_threads
           SET status = 'expired', hygiene_status = 'expired', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .run(temp.id)
      expired += 1
      continue
    }
    if (
      ageMs >= TEMP_NUDGE_HOURS * 60 * 60 * 1000 &&
      !temp.nudged_at &&
      temp.hygiene_status !== 'expired'
    ) {
      await db
        .prepare(
          `UPDATE inbound_threads
           SET nudged_at = ?, hygiene_status = 'nudged', pending_reply = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        )
        .run(now.toISOString(), temp.id)
      nudged += 1
    }
  }

  return { nudged, expired }
}

export async function linkTempToBooking(
  db: DbClient,
  tenantId: number,
  tempThreadId: number,
  bookingId: number
): Promise<{ threadId: number; mergedFromThreadId: number | null }> {
  await ensureUmiSchema(db)
  const temp = await loadThread(db, tempThreadId)
  if (!temp || temp.thread_kind !== 'temp') {
    throw new Error('Thread is not a temp thread')
  }

  const booking = (await db
    .prepare(
      `SELECT id, guest_name, guest_phone FROM bookings WHERE id = ? AND tenant_id = ? LIMIT 1`
    )
    .get(bookingId, tenantId)) as BookingMatch | undefined
  if (!booking) {
    throw new Error('Booking not found')
  }

  const existing = await findBookingThread(db, tenantId, bookingId)
  if (!existing) {
    await db
      .prepare(
        `UPDATE inbound_threads
         SET thread_kind = 'booking',
             booking_id = ?,
             guest_name = COALESCE(?, guest_name),
             expires_at = NULL,
             hygiene_status = 'active',
             status = CASE WHEN status IN ('expired', 'linked') THEN 'drafted' ELSE status END,
             linked_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(bookingId, booking.guest_name, new Date().toISOString(), temp.id)
    return { threadId: temp.id, mergedFromThreadId: null }
  }

  await db
    .prepare(`UPDATE inbound_messages SET thread_id = ? WHERE thread_id = ?`)
    .run(existing.id, temp.id)
  try {
    await db.prepare(`UPDATE draft_jobs SET thread_id = ? WHERE thread_id = ?`).run(existing.id, temp.id)
  } catch {
    // draft_jobs may be absent
  }
  await db
    .prepare(
      `UPDATE inbound_threads
       SET status = 'linked',
           linked_at = ?,
           linked_from_thread_id = ?,
           hygiene_status = 'linked',
           pending_reply = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(new Date().toISOString(), existing.id, temp.id)
  await touchInboundThread(db, existing, {
    timestamp: new Date().toISOString(),
    channel: mapSourceToChannel(temp.last_inbound_channel || temp.source),
    source: temp.source,
    guestName: booking.guest_name,
  })
  return { threadId: existing.id, mergedFromThreadId: temp.id }
}

export async function listLinkCandidates(
  db: DbClient,
  tenantId: number,
  from: string
): Promise<Array<{ id: number; guestName: string; checkIn: string; checkOut: string; suite: string | null }>> {
  const matches = await bookingsForContact(db, tenantId, from)
  const all = matches.length > 0 ? matches : await loadBookings(db, tenantId)
  return all
    .map((booking) => ({
      id: asNumber(booking.id),
      guestName: booking.guest_name,
      checkIn: String(booking.check_in).slice(0, 10),
      checkOut: String(booking.check_out).slice(0, 10),
      suite: booking.suite_or_unit,
    }))
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
    .slice(0, 50)
}

async function latestMessagePreview(
  db: DbClient,
  threadId: number
): Promise<{ preview: string; hasOpenDraft: boolean }> {
  try {
    const row = (await db
      .prepare(
        `SELECT message_text, draft_reply, status
         FROM inbound_messages
         WHERE thread_id = ?
         ORDER BY message_timestamp DESC
         LIMIT 1`
      )
      .get(threadId)) as { message_text?: string; draft_reply?: string; status?: string } | undefined
    const rawPreview = String(row?.message_text || '')
    const cleanedPreview = scrubArrivalDraftSermon(rawPreview)
    return {
      preview: cleanedPreview.slice(0, 160),
      hasOpenDraft: Boolean(row?.draft_reply && row.status !== 'sent'),
    }
  } catch (error) {
    console.error(`[latestMessagePreview] Failed for thread ${threadId}:`, error)
    return {
      preview: '',
      hasOpenDraft: false,
    }
  }
}

async function hasUnansweredInbound(db: DbClient, threadId: number): Promise<boolean> {
  try {
    const inbound = (await db
      .prepare(
        `SELECT COUNT(*) as c FROM inbound_messages
         WHERE thread_id = ? AND COALESCE(direction, 'inbound') = 'inbound'`
      )
      .get(threadId)) as { c: number } | undefined
    if (!inbound || Number(inbound.c) === 0) return false

    const lastIn = (await db
      .prepare(
        `SELECT message_timestamp FROM inbound_messages
         WHERE thread_id = ? AND COALESCE(direction, 'inbound') = 'inbound'
         ORDER BY message_timestamp DESC, id DESC LIMIT 1`
      )
      .get(threadId)) as { message_timestamp?: string } | undefined
    const lastOut = (await db
      .prepare(
        `SELECT message_timestamp FROM inbound_messages
         WHERE thread_id = ? AND direction = 'outbound'
         ORDER BY message_timestamp DESC, id DESC LIMIT 1`
      )
      .get(threadId)) as { message_timestamp?: string } | undefined

    if (!lastOut?.message_timestamp) return true
    return String(lastIn?.message_timestamp || '') > String(lastOut.message_timestamp)
  } catch {
    return false
  }
}

async function extraAttentionByBooking(
  db: DbClient,
  tenantId: number
): Promise<Map<number, { kind: string; stage?: string | null; reason?: string | null; hasDraft?: boolean }>> {
  const flags = new Map<number, { kind: string; stage?: string | null; reason?: string | null; hasDraft?: boolean }>()
  if (await sqliteTableExists(db, 'welcome_drafts')) {
    const rows = ((await db
      .prepare(
        `SELECT booking_id FROM welcome_drafts
         WHERE tenant_id = ? AND status = 'pending_approval' AND booking_id IS NOT NULL`
      )
      .all(tenantId)) || []) as Array<{ booking_id: number }>
    for (const row of rows) flags.set(asNumber(row.booking_id), { kind: 'welcome', hasDraft: true })
  }
  if (await sqliteTableExists(db, 'late_checkin_drafts')) {
    const rows = ((await db
      .prepare(
        `SELECT booking_id FROM late_checkin_drafts
         WHERE tenant_id = ? AND status = 'pending_approval' AND booking_id IS NOT NULL`
      )
      .all(tenantId)) || []) as Array<{ booking_id: number }>
    for (const row of rows) flags.set(asNumber(row.booking_id), { kind: 'late_checkin', hasDraft: true })
  }
  if (await sqliteTableExists(db, 'arrival_drafts')) {
    const rows = ((await db
      .prepare(
        `SELECT booking_id, stage_label, attention_reason, draft_body
         FROM arrival_drafts
         WHERE tenant_id = ?
           AND status IN ('drafted', 'needs_attention', 'template_pending_approval')
           AND booking_id IS NOT NULL`
      )
      .all(tenantId)) || []) as Array<{
      booking_id: number
      stage_label?: string | null
      attention_reason?: string | null
      draft_body?: string | null
    }>
    for (const row of rows) {
      flags.set(asNumber(row.booking_id), {
        kind: 'arrival',
        stage: row.stage_label || null,
        reason: row.attention_reason || null,
        hasDraft: Boolean(row.draft_body),
      })
    }
  }
  return flags
}

export async function ensureArrivingBookingThreads(
  _db: DbClient,
  _tenantId: number,
  _now: Date = new Date()
): Promise<void> {
  // Sprint 2 (N): do not auto-create empty booking threads. Threads are
  // created only when a real inbound or outbound message exists. Owner
  // BLOCKs stay excluded from loadBookings / listLinkCandidates.
  return
}

async function deliveryAttentionThreadIds(db: DbClient): Promise<Set<number>> {
  const flagged = new Set<number>()
  try {
    await ensureDeliverySchema(db)
    const rows = ((await db
      .prepare(
        `SELECT thread_id, delivery_status, queued_at
         FROM inbound_messages
         WHERE direction = 'outbound'
           AND (COALESCE(delivery_status, 'pending') = 'failed'
             OR COALESCE(delivery_status, 'pending') = 'pending')`
      )
      .all()) || []) as Array<{ thread_id: number; delivery_status?: string; queued_at?: string }>
    for (const row of rows) {
      if (row.delivery_status === 'failed' || isStuckPending(row.delivery_status || 'pending', row.queued_at)) {
        flagged.add(asNumber(row.thread_id))
      }
    }
  } catch {
    // delivery columns may be absent in narrow fixtures
  }
  return flagged
}

/**
 * Helper: Parse thread metadata JSON safely and extract subject field
 */
function parseThreadMetadata(metadata: string | null): { subject?: string } {
  const parsed = parseJson(metadata)
  return {
    subject: typeof parsed.subject === 'string' ? parsed.subject : undefined,
  }
}

/**
 * Helper: Fetch all messages for a thread
 */
async function fetchThreadMessages(
  db: DbClient,
  threadId: number,
  tenantId: number
): Promise<Array<{ message_text: string }>> {
  try {
    const messages = ((await db
      .prepare(
        `SELECT message_text FROM inbound_messages WHERE thread_id = ? AND tenant_id = ?`
      )
      .all(threadId, tenantId)) || []) as Array<{ message_text: string }>
    return messages
  } catch {
    return []
  }
}

/**
 * Helper: Tokenize search query - split on whitespace and normalize
 */
function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)
}

/**
 * Check if all search tokens match in thread subject
 */
function matchesSubject(subject: string | undefined, tokens: string[]): boolean {
  if (!subject) return false
  const lowerSubject = subject.toLowerCase()
  return tokens.every((token) => lowerSubject.includes(token))
}

/**
 * Check if all search tokens match in any message body
 */
function matchesMessageBodies(messages: Array<{ message_text: string }>, tokens: string[]): boolean {
  const allText = messages.map((m) => m.message_text.toLowerCase()).join(' ')
  return tokens.every((token) => allText.includes(token))
}

/**
 * Extended search: Check if all tokens match in subject or message bodies
 */
async function searchThreadsByContentExt(
  db: DbClient,
  threadId: number,
  tenantId: number,
  metadata: string | null,
  tokens: string[]
): Promise<boolean> {
  // Check subject
  const { subject } = parseThreadMetadata(metadata)
  if (matchesSubject(subject, tokens)) {
    return true
  }

  // Check message bodies
  const messages = await fetchThreadMessages(db, threadId, tenantId)
  if (matchesMessageBodies(messages, tokens)) {
    return true
  }

  return false
}

export async function listInboxThreads(
  db: DbClient,
  tenantId: number,
  options: { filter?: 'all' | 'needs-attention'; q?: string } = {}
): Promise<InboxThread[]> {
  const extra = await extraAttentionByBooking(db, tenantId)
  const deliveryAttention = await deliveryAttentionThreadIds(db)
  const extraFor = (bookingId: number | null) =>
    bookingId ? extra.get(asNumber(bookingId)) : undefined
  const rawResult = await db
    .prepare(
      `SELECT DISTINCT
         t.id, t.tenant_id, t.source, t.from_number, t.guest_name, t.status,
         t.booking_id, t.thread_kind, t.guest_contact_id, t.last_channel,
         t.last_inbound_channel, t.last_outbound_at, t.last_inbound_at,
         t.pending_reply, t.expires_at, t.nudged_at, t.hygiene_status,
         t.last_message_at, t.metadata,
         b.guest_name as booking_guest_name, b.check_in, b.check_out,
         b.suite_or_unit, b.nightsbridge_booking_id
       FROM inbound_threads t
       LEFT JOIN bookings b ON b.id = t.booking_id
       WHERE t.tenant_id = ?
         AND COALESCE(t.status, '') <> 'linked'`
    )
    .all(tenantId)
  
  const rows = (rawResult || []) as Array<
    UmiThreadRow & {
      booking_guest_name?: string
      check_in?: string
      check_out?: string
      suite_or_unit?: string
      nightsbridge_booking_id?: string
    }
  >

  // Debug: Log SQL query result count and IDs
  if (rows.length > 0) {
    const rowIds = rows.map((r) => asNumber(r.id))
    const uniqueIds = [...new Set(rowIds)]
    const maxRowId = Math.max(...rowIds)
    const maxUniqueId = Math.max(...uniqueIds)
    console.log(`[listInboxThreads] SQL query returned ${rows.length} rows, ${uniqueIds.length} unique IDs, max ID: ${maxRowId}`)
    if (rows.length !== uniqueIds.length) {
      console.warn(`[listInboxThreads] WARNING: JOIN row multiplication detected! ${rows.length} rows but only ${uniqueIds.length} unique thread IDs`)
      // Find duplicates
      const duplicates = rowIds.filter((id, index) => rowIds.indexOf(id) !== index)
      console.warn(`[listInboxThreads] Duplicate thread IDs:`, [...new Set(duplicates)])
    }
    if (!rowIds.includes(48) || !rowIds.includes(49) || !rowIds.includes(50)) {
      console.log(`[listInboxThreads] Missing IDs in SQL result: 48=${rowIds.includes(48)}, 49=${rowIds.includes(49)}, 50=${rowIds.includes(50)}`)
    }
  }

  let lastWabaByThread = new Map<number, string>()
  try {
    lastWabaByThread = await loadLastWabaInboundAtByThread(
      db,
      rows.map((row) => asNumber(row.id))
    )
  } catch {
    lastWabaByThread = new Map()
  }

  const threads: InboxThread[] = []
  const processedIds = new Set<number>() // Deduplicate in case of JOIN row multiplication
  
  for (const row of rows) {
    try {
      const threadId = asNumber(row.id)
      
      // Skip if already processed (JOIN row multiplication)
      if (processedIds.has(threadId)) {
        console.warn(`[listInboxThreads] Skipping duplicate row for thread ${threadId}`)
        continue
      }
      processedIds.add(threadId)
      
      const bookingId = row.booking_id ? asNumber(row.booking_id) : null
      
      const preview = await latestMessagePreview(db, threadId)
      const extraFlag = extraFor(bookingId)
      const hasExtra = Boolean(extraFlag)
      const unansweredInbound = await hasUnansweredInbound(db, threadId)
      const pendingReply = unansweredInbound
      
      const thread: InboxThread = {
        id: threadId,
        threadKind: row.thread_kind === 'booking' ? 'booking' : 'temp',
        bookingId,
        bookerName: row.booking_guest_name || row.guest_name || row.from_number || 'Unknown',
        suite: row.suite_or_unit || null,
        checkIn: row.check_in ? String(row.check_in).slice(0, 10) : null,
        checkOut: row.check_out ? String(row.check_out).slice(0, 10) : null,
        nightsbridgeBookingId: row.nightsbridge_booking_id || null,
        lastChannel: row.last_channel,
        lastInboundChannel: row.last_inbound_channel,
        lastMessageAt: row.last_message_at,
        preview: preview.preview,
        pendingReply,
        hasOpenDraft:
          preview.hasOpenDraft ||
          Boolean(extraFlag?.hasDraft) ||
          (hasExtra && extraFlag?.kind !== 'arrival'),
        needsAttention:
          unansweredInbound ||
          hasExtra ||
          deliveryAttention.has(threadId),
        sortBucket: 2,
        hygieneStatus: row.hygiene_status,
        fromNumber: row.from_number,
        careWindow: computeCareWindow(lastWabaByThread.get(threadId) || null),
        arrivalStage: extraFlag?.stage || null,
        attentionReason: extraFlag?.reason || null,
      }
      thread.sortBucket = inboxSortBucket(thread)
      threads.push(thread)
    } catch (error) {
      const threadId = asNumber(row.id)
      console.error(`[listInboxThreads] Failed to process thread ${threadId}:`, error)
      console.error(`[listInboxThreads] Thread ${threadId} row data:`, JSON.stringify({
        id: row.id,
        thread_kind: row.thread_kind,
        status: row.status,
        booking_id: row.booking_id,
        from_number: row.from_number,
      }))
      continue
    }
  }

  let result = sortInboxThreads(threads)
  if (options.filter === 'needs-attention') {
    result = result.filter((thread) => thread.needsAttention)
  }
  if (options.q?.trim()) {
    const query = options.q.trim()
    const tokens = tokenizeSearchQuery(query)
    
    // Filter threads: existing fields + extended content search
    const matchedThreads: InboxThread[] = []
    for (const thread of result) {
      // First check existing fields (backward compatibility)
      const existingFieldsMatch = [
        thread.bookerName,
        thread.fromNumber,
        thread.suite,
        thread.nightsbridgeBookingId,
        String(thread.bookingId || ''),
      ]
        .filter(Boolean)
        .some((value) => {
          const lowerValue = String(value).toLowerCase()
          return tokens.every((token) => lowerValue.includes(token))
        })

      if (existingFieldsMatch) {
        matchedThreads.push(thread)
        continue
      }

      // Extended search: subject and message bodies
      const row = rows.find((r) => asNumber(r.id) === thread.id)
      if (row) {
        const contentMatch = await searchThreadsByContentExt(
          db,
          thread.id,
          tenantId,
          row.metadata,
          tokens
        )
        if (contentMatch) {
          matchedThreads.push(thread)
        }
      }
    }
    result = matchedThreads
  }
  return result
}

export async function getThreadDetail(db: DbClient, tenantId: number, threadId: number) {
  await ensureUmiSchema(db)
  await ensureContactSchema(db)
  await ensureDeliverySchema(db)
  const thread = (await db
    .prepare(
      `SELECT 
         t.id, t.tenant_id, t.source, t.from_number, t.guest_name, t.status,
         t.booking_id, t.thread_kind, t.guest_contact_id, t.last_channel,
         t.last_inbound_channel, t.last_outbound_at, t.last_inbound_at,
         t.pending_reply, t.expires_at, t.nudged_at, t.hygiene_status,
         t.last_message_at, t.metadata,
         b.guest_name as booking_guest_name, b.check_in, b.check_out,
         b.suite_or_unit, b.nightsbridge_booking_id, b.guest_phone as booking_phone,
         b.guest_email as booking_email, b.guest_phone_source as booking_phone_source,
         b.guest_email_source as booking_email_source, b.guest_email_kind as booking_email_kind
       FROM inbound_threads t
       LEFT JOIN bookings b ON b.id = t.booking_id
       WHERE t.id = ? AND t.tenant_id = ?`
    )
    .get(threadId, tenantId)) as any
  if (!thread) {
    console.log(`[getThreadDetail] Thread ${threadId} not found for tenant ${tenantId}`)
    return null
  }

  const messages = ((await db
    .prepare(
      `SELECT id, direction, channel, source_tag, sender_address, message_text,
              message_timestamp, is_spam, draft_reply, draft_source, status, from_number,
              delivery_status, delivery_read, delivery_error_plain, queued_at,
              sent_to_test_sink, resend_of, resent_by
       FROM inbound_messages
       WHERE thread_id = ?
       ORDER BY message_timestamp ASC, id ASC`
    )
    .all(threadId)) || []) as any[]

  let openDraft: { text: string; source: string; kind: string } | null = null
  let arrivalStage: string | null = null
  let attentionReason: string | null = null
  if (thread.booking_id && (await sqliteTableExists(db, 'arrival_drafts'))) {
    const arrival = (await db
      .prepare(
        `SELECT draft_body, stage_label, attention_reason, status
         FROM arrival_drafts
         WHERE tenant_id = ? AND booking_id = ?
           AND status IN ('drafted', 'needs_attention', 'template_pending_approval')
         ORDER BY CASE stage WHEN 'day-of' THEN 0 WHEN 't-1' THEN 1 ELSE 2 END
         LIMIT 1`
      )
      .get(tenantId, thread.booking_id)) as
      | { draft_body?: string | null; stage_label?: string | null; attention_reason?: string | null; status?: string }
      | undefined
    if (arrival) {
      arrivalStage = arrival.stage_label || null
      attentionReason = arrival.attention_reason || null
      if (arrival.draft_body) {
        openDraft = { text: arrival.draft_body, source: 'heuristic', kind: `arrival:${arrival.stage_label || 'stage'}` }
      }
    }
  }
  const inboundDraft = [...messages].reverse().find((message) => message.draft_reply)
  if (!openDraft && inboundDraft?.draft_reply) {
    openDraft = {
      text: inboundDraft.draft_reply,
      source: inboundDraft.draft_source || 'heuristic',
      kind: 'inbound',
    }
  } else if (!openDraft && thread.booking_id) {
    if (await sqliteTableExists(db, 'welcome_drafts')) {
      const welcome = (await db
        .prepare(
          `SELECT draft_message FROM welcome_drafts
           WHERE tenant_id = ? AND booking_id = ? AND status = 'pending_approval'
           LIMIT 1`
        )
        .get(tenantId, thread.booking_id)) as { draft_message?: string } | undefined
      if (welcome?.draft_message) {
        openDraft = { text: welcome.draft_message, source: 'heuristic', kind: 'welcome' }
      }
    }
    if (!openDraft && (await sqliteTableExists(db, 'late_checkin_drafts'))) {
      const late = (await db
        .prepare(
          `SELECT draft_message FROM late_checkin_drafts
           WHERE tenant_id = ? AND booking_id = ? AND status = 'pending_approval'
           LIMIT 1`
        )
        .get(tenantId, thread.booking_id)) as { draft_message?: string } | undefined
      if (late?.draft_message) {
        openDraft = { text: late.draft_message, source: 'heuristic', kind: 'late_checkin' }
      }
    }
  }

  const linkCandidates =
    thread.thread_kind === 'temp' ? await listLinkCandidates(db, tenantId, thread.from_number) : []

  let lastWaba: string | null = null
  try {
    lastWaba = await loadLastWabaInboundAt(db, asNumber(thread.id))
  } catch {
    lastWaba = null
  }
  const careWindow = computeCareWindow(lastWaba)

  return {
    id: asNumber(thread.id),
    threadKind: thread.thread_kind === 'booking' ? 'booking' : 'temp',
    bookingId: thread.booking_id ? asNumber(thread.booking_id) : null,
    bookerName: thread.booking_guest_name || thread.guest_name || thread.from_number,
    suite: thread.suite_or_unit || null,
    checkIn: thread.check_in ? String(thread.check_in).slice(0, 10) : null,
    checkOut: thread.check_out ? String(thread.check_out).slice(0, 10) : null,
    nightsbridgeBookingId: thread.nightsbridge_booking_id || null,
    lastChannel: thread.last_channel,
    lastInboundChannel: thread.last_inbound_channel,
    defaultOutboundChannel: thread.last_inbound_channel || thread.last_channel || 'whatsapp_cloud',
    fromNumber: thread.from_number,
    bookingPhone: thread.booking_phone || null,
    guestPhone: thread.booking_phone || null,
    guestEmail: thread.booking_email || null,
    guestPhoneSource: thread.booking_phone_source || null,
    guestEmailSource: thread.booking_email_source || null,
    guestEmailKind: thread.booking_email_kind || null,
    status: thread.status,
    hygieneStatus: thread.hygiene_status,
    metadata: parseJson(thread.metadata),
    careWindow,
    arrivalStage,
    attentionReason,
    openDraft,
    linkCandidates,
    messages: messages.map((message) => {
      const deliveryStatus = message.delivery_status || (message.direction === 'outbound' ? 'pending' : null)
      const stuckPending = isStuckPending(deliveryStatus, message.queued_at)
      return {
      id: asNumber(message.id),
      direction: message.direction,
      channel: message.channel || mapSourceToChannel(thread.source),
      sourceTag: message.source_tag,
      senderAddress: message.sender_address,
      body: scrubArrivalDraftSermon(readMessageText(message)),
      timestamp: message.message_timestamp,
      isSpam: Boolean(message.is_spam),
      draftReply: message.draft_reply || null,
      draftSource: message.draft_source || null,
      deliveryStatus,
      deliveryRead: Boolean(message.delivery_read),
      deliveryErrorPlain: message.delivery_error_plain || null,
      queuedAt: message.queued_at || null,
      sentToTestSink: Boolean(message.sent_to_test_sink),
      resendOf: message.resend_of ? asNumber(message.resend_of) : null,
      resentBy: message.resent_by || null,
      stuckPending,
      canResend:
        message.direction === 'outbound' &&
        (deliveryStatus === 'failed' || stuckPending),
      }
    }),
  }
}

export { parseJson }
