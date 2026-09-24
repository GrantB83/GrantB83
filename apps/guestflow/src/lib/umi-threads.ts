import type { DbClient } from '@/lib/db'
import { upsertGuestContact } from '@/lib/guest-contacts'
import { normalizeEmail, normalizeZaE164 } from '@/lib/phone'
import { sqliteTableExists } from '@/lib/approvals-queue'
import { mapSourceToChannel, type UmiChannel } from '@/lib/umi-channels'
import { computeDedupKey } from '@/lib/umi-dedup'
import { ensureUmiSchema } from '@/lib/umi-schema'
import {
  addDaysIsoDate,
  inboxSortBucket,
  isArrivingSoon,
  sastDateString,
  sortInboxThreads,
  TEMP_EXPIRE_DAYS,
  TEMP_NUDGE_HOURS,
} from '@/lib/umi-sort'

export interface ResolveInboundInput {
  from: string
  source: string
  timestamp: string
  text: string
  externalMessageId?: string
  preferredThreadId?: number
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

export async function findDuplicateMessage(
  db: DbClient,
  input: { externalMessageId?: string; dedupKey?: string }
): Promise<{ id: number; thread_id: number } | null> {
  if (input.externalMessageId) {
    const byExternal = (await db
      .prepare(
        `SELECT id, thread_id FROM inbound_messages WHERE external_message_id = ? LIMIT 1`
      )
      .get(input.externalMessageId)) as { id: number; thread_id: number } | undefined
    if (byExternal) {
      return { id: asNumber(byExternal.id), thread_id: asNumber(byExternal.thread_id) }
    }
  }
  if (input.dedupKey) {
    const byDedup = (await db
      .prepare(`SELECT id, thread_id FROM inbound_messages WHERE dedup_key = ? LIMIT 1`)
      .get(input.dedupKey)) as { id: number; thread_id: number } | undefined
    if (byDedup) {
      return { id: asNumber(byDedup.id), thread_id: asNumber(byDedup.thread_id) }
    }
  }
  return null
}

async function loadBookings(db: DbClient, tenantId: number): Promise<BookingMatch[]> {
  const where = `WHERE tenant_id = ? AND COALESCE(status, '') NOT IN ('cancelled', 'canceled')`
  try {
    return ((await db
      .prepare(
        `SELECT id, guest_name, guest_phone, guest_email, check_in, check_out, suite_or_unit, nightsbridge_booking_id, status
         FROM bookings
         ${where}`
      )
      .all(tenantId)) || []) as BookingMatch[]
  } catch {
    try {
      const rows = ((await db
        .prepare(
          `SELECT id, guest_name, guest_phone, check_in, check_out, suite_or_unit, nightsbridge_booking_id, status
           FROM bookings
           ${where}`
        )
        .all(tenantId)) || []) as BookingMatch[]
      return rows.map((row) => ({ ...row, guest_email: null }))
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

async function findBookingThread(
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
  const dedupKey = computeDedupKey(input.from, input.text, input.timestamp)
  const duplicate = await findDuplicateMessage(db, {
    externalMessageId: input.externalMessageId,
    dedupKey,
  })
  if (duplicate) {
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
    })
    return { thread: (await loadThread(db, temp.id))!, channel, dedupKey, created: false }
  }

  const created = await insertThread(db, {
    tenantId,
    source: input.source,
    from: input.from,
    timestamp: input.timestamp,
    kind: 'temp',
    channel,
    contactId: contact?.id ?? null,
  })
  return { thread: created, channel, dedupKey, created: true }
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
  const row = (await db
    .prepare(
      `SELECT message_text, draft_reply, status
       FROM inbound_messages
       WHERE thread_id = ?
       ORDER BY message_timestamp DESC
       LIMIT 1`
    )
    .get(threadId)) as { message_text?: string; draft_reply?: string; status?: string } | undefined
  return {
    preview: String(row?.message_text || '').slice(0, 160),
    hasOpenDraft: Boolean(row?.draft_reply && row.status !== 'sent'),
  }
}

async function extraAttentionByBooking(
  db: DbClient,
  tenantId: number
): Promise<Map<number, string>> {
  const flags = new Map<number, string>()
  if (await sqliteTableExists(db, 'welcome_drafts')) {
    const rows = ((await db
      .prepare(
        `SELECT booking_id FROM welcome_drafts
         WHERE tenant_id = ? AND status = 'pending_approval' AND booking_id IS NOT NULL`
      )
      .all(tenantId)) || []) as Array<{ booking_id: number }>
    for (const row of rows) flags.set(asNumber(row.booking_id), 'welcome')
  }
  if (await sqliteTableExists(db, 'late_checkin_drafts')) {
    const rows = ((await db
      .prepare(
        `SELECT booking_id FROM late_checkin_drafts
         WHERE tenant_id = ? AND status = 'pending_approval' AND booking_id IS NOT NULL`
      )
      .all(tenantId)) || []) as Array<{ booking_id: number }>
    for (const row of rows) flags.set(asNumber(row.booking_id), 'late_checkin')
  }
  return flags
}

export async function ensureArrivingBookingThreads(
  db: DbClient,
  tenantId: number,
  now: Date = new Date()
): Promise<void> {
  await ensureUmiSchema(db)
  const today = sastDateString(now)
  const tomorrow = addDaysIsoDate(today, 1)
  const bookings = ((await db
    .prepare(
      `SELECT id, guest_name, guest_phone, check_in, check_out, suite_or_unit, nightsbridge_booking_id, status
       FROM bookings
       WHERE tenant_id = ?
         AND COALESCE(status, '') NOT IN ('cancelled', 'canceled')
         AND substr(check_in, 1, 10) IN (?, ?)`
    )
    .all(tenantId, today, tomorrow)) || []) as BookingMatch[]

  const extra = await extraAttentionByBooking(db, tenantId)
  const extraIds = [...extra.keys()]
  let extraBookings: BookingMatch[] = []
  if (extraIds.length > 0) {
    extraBookings = ((await db
      .prepare(
        `SELECT id, guest_name, guest_phone, check_in, check_out, suite_or_unit, nightsbridge_booking_id, status
         FROM bookings WHERE tenant_id = ? AND id IN (${extraIds.map(() => '?').join(',')})`
      )
      .all(tenantId, ...extraIds)) || []) as BookingMatch[]
  }

  const seen = new Set<number>()
  for (const booking of [...bookings, ...extraBookings]) {
    const id = asNumber(booking.id)
    if (seen.has(id)) continue
    seen.add(id)
    const existing = await findBookingThread(db, tenantId, id)
    if (existing) continue
    const from = normalizeZaE164(booking.guest_phone) || `booking:${id}`
    await insertThread(db, {
      tenantId,
      source: 'nb',
      from,
      timestamp: new Date().toISOString(),
      kind: 'booking',
      bookingId: id,
      guestName: booking.guest_name,
      channel: 'whatsapp_cloud',
    })
  }
}

export async function listInboxThreads(
  db: DbClient,
  tenantId: number,
  options: { filter?: 'all' | 'needs-attention'; q?: string } = {}
): Promise<InboxThread[]> {
  await ensureUmiSchema(db)
  await applyTempHygiene(db, tenantId)
  try {
    await ensureArrivingBookingThreads(db, tenantId)
  } catch {
    // bookings table may be missing in narrow fixtures
  }

  const extra = await extraAttentionByBooking(db, tenantId)
  const rows = ((await db
    .prepare(
      `SELECT t.*, b.guest_name as booking_guest_name, b.check_in, b.check_out,
              b.suite_or_unit, b.nightsbridge_booking_id
       FROM inbound_threads t
       LEFT JOIN bookings b ON b.id = t.booking_id
       WHERE t.tenant_id = ?
         AND COALESCE(t.status, '') <> 'linked'`
    )
    .all(tenantId)) || []) as Array<
    UmiThreadRow & {
      booking_guest_name?: string
      check_in?: string
      check_out?: string
      suite_or_unit?: string
      nightsbridge_booking_id?: string
    }
  >

  const threads: InboxThread[] = []
  for (const row of rows) {
    const preview = await latestMessagePreview(db, asNumber(row.id))
    const hasExtra = row.booking_id ? extra.has(asNumber(row.booking_id)) : false
    const pendingReply = Boolean(row.pending_reply) || preview.hasOpenDraft
    const thread: InboxThread = {
      id: asNumber(row.id),
      threadKind: row.thread_kind === 'booking' ? 'booking' : 'temp',
      bookingId: row.booking_id ? asNumber(row.booking_id) : null,
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
      hasOpenDraft: preview.hasOpenDraft || hasExtra,
      needsAttention:
        pendingReply ||
        preview.hasOpenDraft ||
        hasExtra ||
        row.thread_kind === 'temp' ||
        row.hygiene_status === 'nudged' ||
        row.hygiene_status === 'expired',
      sortBucket: 2,
      hygieneStatus: row.hygiene_status,
      fromNumber: row.from_number,
    }
    thread.sortBucket = inboxSortBucket(thread)
    threads.push(thread)
  }

  let result = sortInboxThreads(threads)
  if (options.filter === 'needs-attention') {
    result = result.filter((thread) => thread.needsAttention)
  }
  if (options.q?.trim()) {
    const q = options.q.trim().toLowerCase()
    result = result.filter((thread) =>
      [thread.bookerName, thread.fromNumber, thread.suite, thread.nightsbridgeBookingId, String(thread.bookingId || '')]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }
  return result
}

export async function getThreadDetail(db: DbClient, tenantId: number, threadId: number) {
  await ensureUmiSchema(db)
  const thread = (await db
    .prepare(
      `SELECT t.*, b.guest_name as booking_guest_name, b.check_in, b.check_out,
              b.suite_or_unit, b.nightsbridge_booking_id, b.guest_phone as booking_phone
       FROM inbound_threads t
       LEFT JOIN bookings b ON b.id = t.booking_id
       WHERE t.id = ? AND t.tenant_id = ?`
    )
    .get(threadId, tenantId)) as any
  if (!thread) return null

  const messages = ((await db
    .prepare(
      `SELECT id, direction, channel, source_tag, sender_address, message_text,
              message_timestamp, is_spam, draft_reply, draft_source, status, from_number
       FROM inbound_messages
       WHERE thread_id = ?
       ORDER BY message_timestamp ASC, id ASC`
    )
    .all(threadId)) || []) as any[]

  let openDraft: { text: string; source: string; kind: string } | null = null
  const inboundDraft = [...messages].reverse().find((message) => message.draft_reply)
  if (inboundDraft?.draft_reply) {
    openDraft = {
      text: inboundDraft.draft_reply,
      source: inboundDraft.draft_source || 'heuristic',
      kind: 'inbound',
    }
  } else if (thread.booking_id) {
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
    status: thread.status,
    hygieneStatus: thread.hygiene_status,
    metadata: parseJson(thread.metadata),
    openDraft,
    linkCandidates,
    messages: messages.map((message) => ({
      id: asNumber(message.id),
      direction: message.direction,
      channel: message.channel || mapSourceToChannel(thread.source),
      sourceTag: message.source_tag,
      senderAddress: message.sender_address,
      body: message.message_text,
      timestamp: message.message_timestamp,
      isSpam: Boolean(message.is_spam),
      draftReply: message.draft_reply || null,
      draftSource: message.draft_source || null,
    })),
  }
}

export { parseJson }
