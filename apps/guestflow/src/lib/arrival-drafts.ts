/**
 * Scheduled arrival drafts — create/update only. Never sends.
 */

import type { DbClient } from './db'
import {
  ARRIVAL_DRAFTS_CONFIG,
  ARRIVAL_STAGE_LIST,
  ARRIVAL_TIME_ZONE,
  NO_CONTACT_REASON,
  TEMPLATE_PENDING_REASON,
  type ArrivalStageId,
} from './arrival-drafts-config'
import { ensureArrivalDraftsSchema } from './arrival-drafts-schema'
import {
  fillArrivalStageBody,
  replaceAccessCodesBlock,
  resolvedCodesBlock,
  unresolvedCodesBlock,
} from './arrival-templates'
import {
  CODES_UNRESOLVED_REASON,
  isActiveGuestBooking,
  isCancelledStatus,
  isOwnerBlock,
} from './booking-filters'
import { resolveContactPresence } from './contact-presence'
import { ACCESS_CODE_PLACEHOLDER } from './access-codes-schema'
import { CODE_MISSING_PLACEHOLDER } from './arrival-drafts-config'
import { generateGuestToken, calculateTokenExpiry } from './token'
import { scrubArrivalDraftSermon } from './scrub-arrival-sermon'
import { getGuestPortalUrl } from './portal-url'
import { propertyFacingDetails, resolveAccessCodesForSuite } from './property-resolve'
import { addDaysIsoDate, bookingDateOnly, sastDateString } from './umi-sort'
import { ensureUmiSchema } from './umi-schema'
import {
  ensureBookingThreadForOutbound,
  markThreadPendingDraft,
} from './umi-threads'
import type { UmiChannel } from './umi-channels'
import { getWindowState } from '@/lib/wa-window'
import { getWaTemplateByName } from '@/lib/wa-templates'
import { isWhatsAppApproved } from '@/lib/wa-templates-seed'

export type ArrivalDraftStatus =
  | 'drafted'
  | 'needs_attention'
  | 'template_pending_approval'
  | 'sent'
  | 'discarded'

export interface ArrivalDraftRow {
  id: number
  tenant_id: number
  booking_id: number
  stage: ArrivalStageId
  stage_label: string
  status: ArrivalDraftStatus
  channel: string | null
  thread_id: number | null
  message_id: number | null
  draft_body: string | null
  template_name: string | null
  window_state: string | null
  attention_reason: string | null
  fingerprint: string | null
  codes_snapshot: string | null
  due_date: string | null
}

export interface ArrivalBookingRow {
  id: number
  tenant_id: number
  guest_name: string
  guest_phone?: string | null
  guest_email?: string | null
  check_in: string
  check_out: string
  suite_or_unit?: string | null
  room_number?: string | null
  status?: string | null
}

export interface ArrivalJobResult {
  ok: true
  timezone: typeof ARRIVAL_TIME_ZONE
  todaySast: string
  hourSast: number
  created: number
  updated: number
  discarded: number
  skipped: number | 'before_run_hour'
  noContact: number
  unresolvedCodes: number
}

function asNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value)
  return Number(value)
}

export function sastHour(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: ARRIVAL_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now)
  return Number(hour)
}

export function bookingFingerprint(
  checkIn: string,
  checkOut: string,
  suite: string
): string {
  return `${bookingDateOnly(checkIn) || ''}|${bookingDateOnly(checkOut) || ''}|${String(suite || '').trim()}`
}

export function stageDueDate(checkIn: string, offsetDays: number): string | null {
  const date = bookingDateOnly(checkIn)
  if (!date) return null
  return addDaysIsoDate(date, offsetDays)
}

export function dueStagesForCheckIn(
  checkIn: string,
  todaySast: string
): ArrivalStageId[] {
  const due: ArrivalStageId[] = []
  for (const stage of ARRIVAL_STAGE_LIST) {
    const dueDate = stageDueDate(checkIn, stage.offsetDays)
    if (dueDate === todaySast) due.push(stage.id)
  }
  return due
}

export function isStageStillAhead(checkIn: string, offsetDays: number, todaySast: string): boolean {
  const dueDate = stageDueDate(checkIn, offsetDays)
  return Boolean(dueDate && dueDate >= todaySast)
}

function suiteOf(booking: ArrivalBookingRow): string {
  return String(booking.suite_or_unit || booking.room_number || '').trim()
}

async function loadDraft(
  db: DbClient,
  tenantId: number,
  bookingId: number,
  stage: ArrivalStageId
): Promise<ArrivalDraftRow | null> {
  const row = (await db
    .prepare(
      `SELECT * FROM arrival_drafts WHERE tenant_id = ? AND booking_id = ? AND stage = ? LIMIT 1`
    )
    .get(tenantId, bookingId, stage)) as ArrivalDraftRow | undefined
  return row || null
}

async function mintPortalUrl(db: DbClient, booking: ArrivalBookingRow): Promise<string> {
  try {
    const { token, hash } = generateGuestToken()
    const expiry = booking.check_out
      ? calculateTokenExpiry(booking.check_out)
      : calculateTokenExpiry(addDaysIsoDate(bookingDateOnly(booking.check_in) || sastDateString(), 14))
    await db
      .prepare(
        `INSERT INTO guest_tokens (booking_id, token_hash, expires_at) VALUES (?, ?, ?)`
      )
      .run(booking.id, hash, expiry.toISOString())
    return getGuestPortalUrl(token)
  } catch {
    return ''
  }
}

async function templateStatusForStage(
  db: DbClient,
  tenantId: number,
  stageId: ArrivalStageId
): Promise<{
  pending: boolean
  names: string[]
}> {
  const names = [...ARRIVAL_DRAFTS_CONFIG.stages[stageId].templateNames]
  let pending = false
  for (const name of names) {
    const row = await getWaTemplateByName(db, tenantId, name)
    if (!row || !isWhatsAppApproved(row.whatsapp_approval_status)) {
      pending = true
      break
    }
  }
  return { pending, names }
}


/**
 * Clean any existing sermon text in arrival draft messages for this thread.
 * One-shot idempotent scrub that runs on each draft upsert.
 */
async function scrubThreadSermonPreviews(db: DbClient, threadId: number): Promise<void> {
  const existing = (await db
    .prepare(
      `SELECT id, message_text FROM inbound_messages 
       WHERE thread_id = ? 
       AND source_tag = 'arrival-scheduler' 
       AND message_text LIKE '%Approve&Send required%'`
    )
    .all(threadId)) as Array<{ id: number; message_text: string }>

  for (const row of existing) {
    const cleaned = scrubArrivalDraftSermon(row.message_text)
    if (cleaned !== row.message_text) {
      await db
        .prepare(`UPDATE inbound_messages SET message_text = ? WHERE id = ?`)
        .run(cleaned, row.id)
    }
  }
}

/**
 * Global one-shot DB scrub: clean sermon text from ALL arrival draft messages.
 * Idempotent bulk UPDATE across all matching inbound_messages rows.
 * Runs from cron entrypoint to immediately clean Preview DB rows without waiting for per-thread upsert.
 */
async function scrubAllSermonPreviews(db: DbClient): Promise<number> {
  const existing = (await db
    .prepare(
      `SELECT id, message_text FROM inbound_messages 
       WHERE (source_tag = 'arrival-scheduler' OR message_text LIKE '%Approve&Send required%')
       AND message_text LIKE '%Approve&Send required%'`
    )
    .all()) as Array<{ id: number; message_text: string }>

  let scrubbedCount = 0
  for (const row of existing) {
    const cleaned = scrubArrivalDraftSermon(row.message_text)
    if (cleaned !== row.message_text) {
      await db
        .prepare(`UPDATE inbound_messages SET message_text = ? WHERE id = ?`)
        .run(cleaned, row.id)
      scrubbedCount++
    }
  }
  return scrubbedCount
}

async function writeThreadDraft(
  db: DbClient,
  input: {
    tenantId: number
    booking: ArrivalBookingRow
    channel: UmiChannel
    timestamp: string
    preview: string
    draftBody: string | null
    existingMessageId?: number | null
  }
): Promise<{ threadId: number; messageId: number | null }> {
  const from =
    resolveContactPresence({
      phone: input.booking.guest_phone,
      email: input.booking.guest_email,
    }).phone ||
    resolveContactPresence({
      phone: input.booking.guest_phone,
      email: input.booking.guest_email,
    }).email ||
    'no-contact'
  const thread = await ensureBookingThreadForOutbound(db, input.tenantId, input.booking, {
    timestamp: input.timestamp,
    channel: input.channel,
    source: 'arrival-scheduler',
    from,
  })

  // Idempotent one-shot: scrub any existing sermon text in this thread's arrival drafts
  await scrubThreadSermonPreviews(db, thread.id)

  if (input.existingMessageId) {
    await db
      .prepare(
        `UPDATE inbound_messages
         SET message_text = ?, draft_reply = ?, draft_source = 'heuristic', status = 'drafted',
             channel = ?, source_tag = 'arrival-scheduler'
         WHERE id = ?`
      )
      .run(input.preview, input.draftBody, input.channel, input.existingMessageId)
    await markThreadPendingDraft(db, thread.id)
    return { threadId: thread.id, messageId: input.existingMessageId }
  }

  const inserted = await db
    .prepare(
      `INSERT INTO inbound_messages (
         thread_id, tenant_id, direction, from_number, message_text, message_timestamp,
         channel, source_tag, draft_reply, draft_source, status
       ) VALUES (?, ?, 'outbound', ?, ?, ?, ?, 'arrival-scheduler', ?, 'heuristic', 'drafted')`
    )
    .run(
      thread.id,
      input.tenantId,
      from,
      input.preview,
      input.timestamp,
      input.channel,
      input.draftBody
    )
  await markThreadPendingDraft(db, thread.id)
  const messageId = inserted?.lastInsertRowid != null ? asNumber(inserted.lastInsertRowid) : null
  return { threadId: thread.id, messageId }
}

async function upsertDraftRow(
  db: DbClient,
  row: {
    tenantId: number
    bookingId: number
    stage: ArrivalStageId
    stageLabel: string
    status: ArrivalDraftStatus
    channel: string | null
    threadId: number | null
    messageId: number | null
    draftBody: string | null
    templateName: string | null
    windowState: string | null
    attentionReason: string | null
    fingerprint: string
    codesSnapshot: string | null
    dueDate: string
  }
): Promise<'created' | 'updated'> {
  const existing = await loadDraft(db, row.tenantId, row.bookingId, row.stage)
  if (!existing) {
    await db
      .prepare(
        `INSERT INTO arrival_drafts (
           tenant_id, booking_id, stage, stage_label, status, channel, thread_id, message_id,
           draft_body, template_name, window_state, attention_reason, fingerprint, codes_snapshot, due_date
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.tenantId,
        row.bookingId,
        row.stage,
        row.stageLabel,
        row.status,
        row.channel,
        row.threadId,
        row.messageId,
        row.draftBody,
        row.templateName,
        row.windowState,
        row.attentionReason,
        row.fingerprint,
        row.codesSnapshot,
        row.dueDate
      )
    return 'created'
  }
  await db
    .prepare(
      `UPDATE arrival_drafts
       SET stage_label = ?, status = ?, channel = ?, thread_id = ?, message_id = ?,
           draft_body = ?, template_name = ?, window_state = ?, attention_reason = ?,
           fingerprint = ?, codes_snapshot = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(
      row.stageLabel,
      row.status,
      row.channel,
      row.threadId,
      row.messageId,
      row.draftBody,
      row.templateName,
      row.windowState,
      row.attentionReason,
      row.fingerprint,
      row.codesSnapshot,
      row.dueDate,
      existing.id
    )
  return 'updated'
}

async function discardDraft(db: DbClient, draft: ArrivalDraftRow): Promise<void> {
  await db
    .prepare(
      `UPDATE arrival_drafts
       SET status = 'discarded', draft_body = NULL, attention_reason = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(draft.id)
  if (draft.message_id) {
    try {
      await db
        .prepare(
          `UPDATE inbound_messages
           SET draft_reply = NULL, status = 'discarded', message_text = ?
           WHERE id = ?`
        )
        .run(`[Arrival draft ${draft.stage_label}] discarded`, draft.message_id)
    } catch {
      // fixture may lack status
    }
  }
}

export async function resolveT1Codes(
  db: DbClient,
  tenantId: number,
  suite: string
): Promise<{
  block: string
  snapshot: Record<string, string> | null
  attention: string | null
  directions: string
}> {
  const resolved = await resolveAccessCodesForSuite(db, tenantId, suite)
  if (!resolved.ok) {
    return {
      block: unresolvedCodesBlock(),
      snapshot: null,
      attention: CODES_UNRESOLVED_REASON,
      directions: '',
    }
  }
  const facing = propertyFacingDetails(resolved.property)
  const gate =
    !resolved.codes.gateCode || resolved.codes.gateCode === ACCESS_CODE_PLACEHOLDER
      ? CODE_MISSING_PLACEHOLDER
      : resolved.codes.gateCode
  const door =
    !resolved.codes.doorCode || resolved.codes.doorCode === ACCESS_CODE_PLACEHOLDER
      ? CODE_MISSING_PLACEHOLDER
      : resolved.codes.doorCode
  const lockbox =
    !resolved.codes.lockboxCode || resolved.codes.lockboxCode === ACCESS_CODE_PLACEHOLDER
      ? CODE_MISSING_PLACEHOLDER
      : resolved.codes.lockboxCode
  const missing = [gate, door, lockbox].includes(CODE_MISSING_PLACEHOLDER)
  return {
    block: resolvedCodesBlock({ gateCode: gate, doorCode: door, lockboxCode: lockbox }),
    snapshot: { gate, door, lockbox, property: resolved.property },
    attention: missing ? CODE_MISSING_PLACEHOLDER : null,
    directions: [facing.address, facing.mapsUrl].filter(Boolean).join(' — '),
  }
}

export async function refreshArrivalDraftCodesAtSend(
  db: DbClient,
  input: { tenantId?: number; threadId: number; body: string }
): Promise<{ body: string; attentionReason: string | null; refreshed: boolean }> {
  await ensureArrivalDraftsSchema(db)
  const tenantId = input.tenantId ?? 1
  const draft = (await db
    .prepare(
      `SELECT ad.*, b.suite_or_unit, b.room_number
       FROM arrival_drafts ad
       JOIN bookings b ON b.id = ad.booking_id
       WHERE ad.thread_id = ?
         AND ad.tenant_id = ?
         AND ad.status IN ('drafted', 'needs_attention', 'template_pending_approval')
         AND ad.stage = 't-1'
       ORDER BY ad.id DESC
       LIMIT 1`
    )
    .get(input.threadId, tenantId)) as
    | (ArrivalDraftRow & { suite_or_unit?: string | null; room_number?: string | null })
    | undefined

  if (!draft || draft.stage !== 't-1' || !draft.booking_id) {
    return { body: input.body, attentionReason: null, refreshed: false }
  }

  const suite = String(draft.suite_or_unit || draft.room_number || '').trim()
  const live = await resolveT1Codes(db, tenantId, suite)
  const nextBody = replaceAccessCodesBlock(input.body, live.block)
  await db
    .prepare(
      `UPDATE arrival_drafts
       SET draft_body = ?, codes_snapshot = ?, attention_reason = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(
      nextBody,
      live.snapshot ? JSON.stringify(live.snapshot) : null,
      live.attention,
      live.attention ? 'needs_attention' : draft.status === 'template_pending_approval'
        ? 'template_pending_approval'
        : 'drafted',
      draft.id
    )
  return { body: nextBody, attentionReason: live.attention, refreshed: true }
}

export async function markArrivalDraftSent(db: DbClient, threadId: number): Promise<void> {
  try {
    await db
      .prepare(
        `UPDATE arrival_drafts
         SET status = 'sent', updated_at = CURRENT_TIMESTAMP
         WHERE thread_id = ? AND status IN ('drafted', 'needs_attention', 'template_pending_approval')`
      )
      .run(threadId)
  } catch {
    // schema may be absent in older send fixtures
  }
}

async function createOrRefreshStage(
  db: DbClient,
  tenantId: number,
  booking: ArrivalBookingRow,
  stageId: ArrivalStageId,
  todaySast: string,
  now: Date,
  counts: ArrivalJobResult
): Promise<void> {
  const stage = ARRIVAL_DRAFTS_CONFIG.stages[stageId]
  const dueDate = stageDueDate(booking.check_in, stage.offsetDays) || todaySast
  const suite = suiteOf(booking)
  const fingerprint = bookingFingerprint(booking.check_in, booking.check_out, suite)
  const existing = await loadDraft(db, tenantId, booking.id, stageId)

  if (existing?.status === 'sent') {
    counts.skipped = typeof counts.skipped === 'number' ? counts.skipped + 1 : 1
    return
  }
  if (
    existing &&
    existing.status !== 'discarded' &&
    existing.fingerprint === fingerprint
  ) {
    counts.skipped = typeof counts.skipped === 'number' ? counts.skipped + 1 : 1
    return
  }

  const contact = resolveContactPresence({
    phone: booking.guest_phone,
    email: booking.guest_email,
  })
  const timestamp = now.toISOString()

  if (!contact.hasContact) {
    const written = await writeThreadDraft(db, {
      tenantId,
      booking,
      channel: 'whatsapp_cloud',
      timestamp,
      preview: `[Needs attention] ${NO_CONTACT_REASON} for ${stage.label} — no guest draft.`,
      draftBody: null,
      existingMessageId: existing?.message_id,
    })
    const action = await upsertDraftRow(db, {
      tenantId,
      bookingId: booking.id,
      stage: stageId,
      stageLabel: stage.label,
      status: 'needs_attention',
      channel: null,
      threadId: written.threadId,
      messageId: written.messageId,
      draftBody: null,
      templateName: stage.templateNames.join('+'),
      windowState: 'n/a',
      attentionReason: NO_CONTACT_REASON,
      fingerprint,
      codesSnapshot: null,
      dueDate,
    })
    counts.noContact += 1
    if (action === 'created') counts.created += 1
    else counts.updated += 1
    return
  }

  const channel: UmiChannel = contact.channel === 'email' ? 'email' : 'whatsapp_cloud'
  const existingThreadId = existing?.thread_id || null
  let windowOpen = true
  if (contact.channel === 'whatsapp') {
    if (existingThreadId) {
      const window = await getWindowState(db, existingThreadId)
      windowOpen = window.open
    } else {
      windowOpen = false
    }
  }

  let codesBlock = ''
  let codesSnapshot: string | null = null
  let attention: string | null = null
  let directions = ''
  if (stageId === 't-1') {
    const live = await resolveT1Codes(db, tenantId, suite)
    codesBlock = live.block
    codesSnapshot = live.snapshot ? JSON.stringify(live.snapshot) : null
    attention = live.attention
    directions = live.directions
    if (attention) counts.unresolvedCodes += 1
  }

  const portalUrl = await mintPortalUrl(db, booking)
  const filled = fillArrivalStageBody(stageId, {
    guestName: booking.guest_name,
    checkIn: bookingDateOnly(booking.check_in) || booking.check_in,
    checkOut: bookingDateOnly(booking.check_out) || booking.check_out,
    suite: suite || 'your suite',
    portalUrl,
    directions,
    accessCodesBlock: codesBlock,
  })

  let status: ArrivalDraftStatus = attention ? 'needs_attention' : 'drafted'
  let windowState = contact.channel === 'email' ? 'n/a' : windowOpen ? 'open' : 'closed'
  if (contact.channel === 'whatsapp' && !windowOpen) {
    const templates = await templateStatusForStage(db, tenantId, stageId)
    if (templates.pending) {
      status = 'template_pending_approval'
      attention = attention || TEMPLATE_PENDING_REASON
    }
  }

  const preview = `Arrival draft ${stage.label}`
  const written = await writeThreadDraft(db, {
    tenantId,
    booking,
    channel,
    timestamp,
    preview,
    draftBody: filled.body,
    existingMessageId: existing?.message_id,
  })
  const action = await upsertDraftRow(db, {
    tenantId,
    bookingId: booking.id,
    stage: stageId,
    stageLabel: stage.label,
    status,
    channel: contact.channel,
    threadId: written.threadId,
    messageId: written.messageId,
    draftBody: filled.body,
    templateName: filled.templateName,
    windowState,
    attentionReason: attention,
    fingerprint,
    codesSnapshot,
    dueDate,
  })
  if (action === 'created') counts.created += 1
  else counts.updated += 1
}

export async function runArrivalDraftsJob(
  db: DbClient,
  options: { tenantId?: number; now?: Date } = {}
): Promise<ArrivalJobResult> {
  const tenantId = options.tenantId ?? 1
  const now = options.now ?? new Date()
  await ensureUmiSchema(db)
  await ensureArrivalDraftsSchema(db)

  // Global one-shot: scrub any existing sermon text from ALL arrival draft previews
  // Ensures Preview DB rows (Ilonka #47, Anneri #46) show clean labels immediately
  const scrubbedCount = await scrubAllSermonPreviews(db)
  if (scrubbedCount > 0) {
    console.log(`[runArrivalDraftsJob] Scrubbed ${scrubbedCount} sermon preview(s)`)
  }

  const todaySast = sastDateString(now)
  const hour = sastHour(now)
  const counts: ArrivalJobResult = {
    ok: true,
    timezone: ARRIVAL_TIME_ZONE,
    todaySast,
    hourSast: hour,
    created: 0,
    updated: 0,
    discarded: 0,
    skipped: 0,
    noContact: 0,
    unresolvedCodes: 0,
  }

  if (hour < ARRIVAL_DRAFTS_CONFIG.runHourSast) {
    counts.skipped = 'before_run_hour'
    return counts
  }

  const horizon = addDaysIsoDate(todaySast, 3)
  const bookings = ((await db
    .prepare(
      `SELECT * FROM bookings
       WHERE tenant_id = ?
         AND date(check_in) >= date(?)
         AND date(check_in) <= date(?)`
    )
    .all(tenantId, todaySast, horizon)) || []) as ArrivalBookingRow[]

  const byId = new Map<number, ArrivalBookingRow>()
  for (const booking of bookings) byId.set(asNumber(booking.id), { ...booking, id: asNumber(booking.id) })

  const openDrafts = ((await db
    .prepare(
      `SELECT * FROM arrival_drafts
       WHERE tenant_id = ? AND status IN ('drafted', 'needs_attention', 'template_pending_approval')`
    )
    .all(tenantId)) || []) as ArrivalDraftRow[]

  for (const draft of openDrafts) {
    let booking = byId.get(asNumber(draft.booking_id))
    if (!booking) {
      booking = (await db
        .prepare(
          `SELECT * FROM bookings WHERE id = ? AND tenant_id = ? LIMIT 1`
        )
        .get(draft.booking_id, tenantId)) as ArrivalBookingRow | undefined
    }
    if (!booking || !isActiveGuestBooking(booking) || isOwnerBlock(booking) || isCancelledStatus(booking.status)) {
      await discardDraft(db, draft)
      counts.discarded += 1
      continue
    }
    const suite = suiteOf(booking)
    const fingerprint = bookingFingerprint(booking.check_in, booking.check_out, suite)
    if (draft.fingerprint && draft.fingerprint !== fingerprint) {
      const stillDue = dueStagesForCheckIn(booking.check_in, todaySast).includes(draft.stage)
      if (!stillDue) {
        await discardDraft(db, draft)
        counts.discarded += 1
      }
    }
  }

  for (const booking of byId.values()) {
    if (!isActiveGuestBooking(booking)) continue
    const due = dueStagesForCheckIn(booking.check_in, todaySast)
    for (const stageId of due) {
      await createOrRefreshStage(db, tenantId, booking, stageId, todaySast, now, counts)
    }
  }

  return counts
}

export { ARRIVAL_TIME_ZONE }
