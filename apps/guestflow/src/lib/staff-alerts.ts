/**
 * Staff alert recipients, dedupe/cooldown, evaluator, and failed-send hook.
 * Internal only. Never a guest send.
 */

import type { DbClient } from '@/lib/db'
import {
  LEGACY_STAFF_EMAIL,
  emailsEqual,
  isReservedStaffEmail,
  normalizeEmail,
} from '@/lib/staff-users-schema'
import { listStaffUsers } from '@/lib/staff-auth'
import {
  OPS_SETTINGS,
  classifyUnanswered,
  hoursBetween,
  isDigestWindow,
  staffBookingPath,
  staffThreadPath,
  type OpsSettings,
} from '@/lib/ops-settings'
import { guestFirstName, sendStaffAlertEmail } from '@/lib/staff-alert-email'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'
import {
  isTestPhoneThread,
  isSmokeTestThread,
  isEmptyBlockBooking,
} from '@/lib/staff-alert-filters'

export type AlertKind =
  | 'unanswered'
  | 'unanswered_digest'
  | 'nb_missed'
  | 'nb_batch'
  | 'failed_send'
  | 'site_down'
  | 'site_recovery'
  | 'nb_parse_failed'

export const TEST_SINK_ADDRESSES = new Set(
  ['grant830318@gmail.com', 'legacy@guestflow.local'].map((value) => value.toLowerCase())
)
export const TEST_SINK_PHONES = new Set([
  '+15124064300',
  '15124064300',
  '+27600200825',
  '+27000000001',
  '27000000001',
])

export async function listActiveAlertEmails(db: DbClient): Promise<string[]> {
  await ensureStaffUsersSchema(db)
  const users = await listStaffUsers(db)
  return users
    .map((user) => normalizeEmail(user.email))
    .filter((email) => email && !isReservedStaffEmail(email))
}

export function fallbackAlertEmail(): string | null {
  const value = normalizeEmail(process.env.ALERT_FALLBACK_EMAIL)
  return value || null
}

export async function resolveAlertRecipients(
  db: DbClient,
  input: { mode: 'all_active' | 'last_handler' | 'actor'; email?: string | null }
): Promise<string[]> {
  const active = await listActiveAlertEmails(db)
  if (input.mode === 'actor' || input.mode === 'last_handler') {
    const wanted = normalizeEmail(input.email)
    if (wanted && active.some((email) => emailsEqual(email, wanted))) {
      return [wanted]
    }
    if (input.mode === 'actor') {
      return active.length ? [] : fallbackList()
    }
    return active.length ? active : fallbackList()
  }
  return active.length ? active : fallbackList()
}

function fallbackList(): string[] {
  const fallback = fallbackAlertEmail()
  return fallback ? [fallback] : []
}

export function cooldownOpen(
  lastSentAt: string | null | undefined,
  now: Date,
  settings: OpsSettings = OPS_SETTINGS
): boolean {
  if (!lastSentAt) return true
  return hoursBetween(now, new Date(lastSentAt)) >= settings.alertCooldownHours
}

export async function shouldSendAlert(
  db: DbClient,
  input: { dedupeKey: string; recipientEmail: string; now?: Date; settings?: OpsSettings }
): Promise<boolean> {
  await ensureSprint2Schema(db)
  const now = input.now || new Date()
  const settings = input.settings || OPS_SETTINGS
  const row = (await db
    .prepare(
      `SELECT status, last_sent_at FROM staff_alerts
       WHERE dedupe_key = ? AND recipient_email = ?`
    )
    .get(input.dedupeKey, normalizeEmail(input.recipientEmail))) as
    | { status: string; last_sent_at: string | null }
    | undefined
  if (!row) return true
  if (row.status === 'resolved') return false
  return cooldownOpen(row.last_sent_at, now, settings)
}

export async function recordAlertSend(
  db: DbClient,
  input: {
    dedupeKey: string
    recipientEmail: string
    kind: AlertKind
    payload: Record<string, unknown>
    sentAt: string
    tenantId?: number
  }
): Promise<void> {
  await ensureSprint2Schema(db)
  const email = normalizeEmail(input.recipientEmail)
  const existing = (await db
    .prepare(`SELECT id FROM staff_alerts WHERE dedupe_key = ? AND recipient_email = ?`)
    .get(input.dedupeKey, email)) as { id: number } | undefined
  if (existing) {
    await db
      .prepare(
        `UPDATE staff_alerts
         SET kind = ?, status = 'open', last_sent_at = ?, payload_json = ?, resolved_at = NULL
         WHERE id = ?`
      )
      .run(input.kind, input.sentAt, JSON.stringify(input.payload), existing.id)
    return
  }
  await db
    .prepare(
      `INSERT INTO staff_alerts
        (tenant_id, dedupe_key, recipient_email, kind, status, last_sent_at, payload_json)
       VALUES (?, ?, ?, ?, 'open', ?, ?)`
    )
    .run(input.tenantId || 1, input.dedupeKey, email, input.kind, input.sentAt, JSON.stringify(input.payload))
}

export async function markAlertResolved(
  db: DbClient,
  input: { dedupeKey: string; recipientEmail: string; now?: Date }
): Promise<{ notified: boolean }> {
  await ensureSprint2Schema(db)
  const email = normalizeEmail(input.recipientEmail)
  const now = (input.now || new Date()).toISOString()
  const row = (await db
    .prepare(
      `SELECT id, status, resolved_notified_at, payload_json, kind
       FROM staff_alerts WHERE dedupe_key = ? AND recipient_email = ?`
    )
    .get(input.dedupeKey, email)) as
    | {
        id: number
        status: string
        resolved_notified_at: string | null
        payload_json: string | null
        kind: AlertKind
      }
    | undefined
  if (!row || row.status === 'resolved' && row.resolved_notified_at) {
    return { notified: false }
  }
  let notified = false
  if (!row.resolved_notified_at) {
    const payload = safeJson(row.payload_json)
    const send = await sendStaffAlertEmail({
      to: email,
      kind: row.kind === 'site_down' ? 'site_recovery' : row.kind,
      extraLine: 'Resolved.',
      guestFirstName: typeof payload.guestFirstName === 'string' ? payload.guestFirstName : null,
      bookingRef: typeof payload.bookingRef === 'string' ? payload.bookingRef : null,
      staffLink: typeof payload.staffLink === 'string' ? payload.staffLink : null,
    })
    notified = Boolean(send.success)
  }
  await db
    .prepare(
      `UPDATE staff_alerts
       SET status = 'resolved', resolved_at = ?, resolved_notified_at = ?
       WHERE id = ?`
    )
    .run(now, notified ? now : row.resolved_notified_at, row.id)
  return { notified }
}

function safeJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

export async function dispatchAlerts(
  db: DbClient,
  input: {
    dedupeKey: string
    kind: AlertKind
    recipients: string[]
    payload: {
      guestFirstName?: string | null
      bookingRef?: string | null
      staffLink?: string | null
      extraLine?: string | null
    }
    now?: Date
    send?: typeof sendStaffAlertEmail
  }
): Promise<{ sent: number; skipped: number }> {
  const send = input.send || sendStaffAlertEmail
  const now = input.now || new Date()
  let sent = 0
  let skipped = 0
  for (const recipient of input.recipients) {
    const email = normalizeEmail(recipient)
    if (!email) continue
    if (!(await shouldSendAlert(db, { dedupeKey: input.dedupeKey, recipientEmail: email, now }))) {
      skipped += 1
      continue
    }
    const result = await send({
      to: email,
      kind: input.kind,
      guestFirstName: input.payload.guestFirstName,
      bookingRef: input.payload.bookingRef,
      staffLink: input.payload.staffLink,
      extraLine: input.payload.extraLine,
    })
    if (result.success) {
      await recordAlertSend(db, {
        dedupeKey: input.dedupeKey,
        recipientEmail: email,
        kind: input.kind,
        payload: input.payload,
        sentAt: now.toISOString(),
      })
      sent += 1
    } else {
      skipped += 1
    }
  }
  return { sent, skipped }
}

export async function stampLastHandler(
  db: DbClient,
  threadId: number,
  email: string | null | undefined
): Promise<void> {
  const value = normalizeEmail(email)
  if (!value || isReservedStaffEmail(value)) return
  try {
    await db
      .prepare(`UPDATE inbound_threads SET last_handler_email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(value, threadId)
  } catch {
    // column may be missing until ensureUmiSchema
  }
}

export function isStaffOrTestPeer(
  fromNumber: string | null | undefined,
  staffEmails: string[]
): boolean {
  const raw = String(fromNumber || '').trim()
  if (!raw) return false
  const email = normalizeEmail(raw)
  if (email && (TEST_SINK_ADDRESSES.has(email) || staffEmails.some((s) => emailsEqual(s, email)))) {
    return true
  }
  if (emailsEqual(raw, LEGACY_STAFF_EMAIL)) return true
  const digits = raw.replace(/\D/g, '')
  if (TEST_SINK_PHONES.has(raw) || TEST_SINK_PHONES.has(`+${digits}`) || TEST_SINK_PHONES.has(digits)) {
    return true
  }
  return false
}

export async function notifyFailedApproveSend(input: {
  db: DbClient
  actorEmail: string | null | undefined
  threadId: number
  bookingRef?: string | null
  guestFirstName?: string | null
  channel?: string
  attemptId?: string
  now?: Date
  send?: typeof sendStaffAlertEmail
}): Promise<{ sent: number; skipped: number }> {
  const recipients = await resolveAlertRecipients(input.db, {
    mode: 'actor',
    email: input.actorEmail,
  })
  const attempt = input.attemptId || String(input.now?.toISOString() || Date.now())
  return dispatchAlerts(input.db, {
    dedupeKey: `failed-send:${input.threadId}:${attempt}`,
    kind: 'failed_send',
    recipients,
    payload: {
      guestFirstName: input.guestFirstName,
      bookingRef: input.bookingRef,
      staffLink: staffThreadPath(input.threadId),
    },
    now: input.now,
    send: input.send,
  })
}

export interface EvaluateResult {
  sent: number
  skipped: number
  resolved: number
  kinds: Record<string, number>
}

export async function evaluateStaffAlerts(
  db: DbClient,
  input: { now?: Date; send?: typeof sendStaffAlertEmail; tenantId?: number } = {}
): Promise<EvaluateResult> {
  await ensureSprint2Schema(db)
  await ensureStaffUsersSchema(db)
  const now = input.now || new Date()
  const result: EvaluateResult = {
    sent: 0,
    skipped: 0,
    resolved: 0,
    kinds: {},
  }

  const unanswered = await evaluateUnanswered(db, { now, send: input.send, tenantId: input.tenantId || 1 })
  mergeEval(result, unanswered, 'unanswered')

  const nb = await evaluateNbFreshness(db, { now, send: input.send })
  mergeEval(result, nb, 'nb')

  const health = await evaluateHealthFromProbes(db, { now, send: input.send })
  mergeEval(result, health, 'health')

  return result
}

function mergeEval(target: EvaluateResult, part: { sent: number; skipped: number; resolved?: number }, kind: string) {
  target.sent += part.sent
  target.skipped += part.skipped
  target.resolved += part.resolved || 0
  target.kinds[kind] = (target.kinds[kind] || 0) + part.sent
}

export async function evaluateUnanswered(
  db: DbClient,
  input: { now: Date; send?: typeof sendStaffAlertEmail; tenantId: number }
): Promise<{ sent: number; skipped: number }> {
  const staffEmails = await listActiveAlertEmails(db)
  let threads: Array<Record<string, unknown>> = []
  try {
    threads = (await db
      .prepare(
        `SELECT t.id, t.last_inbound_at, t.last_outbound_at, t.last_handler_email, t.pending_reply,
                t.from_number, t.guest_name, t.booking_id, t.thread_kind, t.metadata
         FROM inbound_threads t
         WHERE t.pending_reply = 1`
      )
      .all()) as Array<Record<string, unknown>>
  } catch {
    return { sent: 0, skipped: 0 }
  }

  const digestItems: Array<Record<string, unknown>> = []
  let sent = 0
  let skipped = 0

  for (const thread of threads) {
    const threadId = Number(thread.id)
    const inboundAt = thread.last_inbound_at ? new Date(String(thread.last_inbound_at)) : null
    if (!inboundAt || Number.isNaN(inboundAt.getTime())) continue
    if (thread.last_outbound_at && new Date(String(thread.last_outbound_at)) >= inboundAt) continue
    if (isStaffOrTestPeer(String(thread.from_number || ''), staffEmails)) continue
    if (await latestInboundIsSpam(db, threadId)) continue

    // Alert noise filter: Exclude test phones, smoke markers, and empty BLOCK bookings
    if (isTestPhoneThread(String(thread.from_number || ''), TEST_SINK_PHONES)) {
      console.log(`[staff-alerts] Thread ${threadId} excluded from alerts: test_phone`)
      continue
    }
    if (isSmokeTestThread({ guest_name: String(thread.guest_name || ''), metadata: String(thread.metadata || '') })) {
      console.log(`[staff-alerts] Thread ${threadId} excluded from alerts: smoke_marker`)
      continue
    }
    if (await isEmptyBlockBooking(db, { id: threadId, booking_id: Number(thread.booking_id || 0) || null })) {
      console.log(`[staff-alerts] Thread ${threadId} excluded from alerts: empty_block`)
      continue
    }

    const action = classifyUnanswered({ inboundAt, now: input.now })
    if (action === 'wait') continue
    if (action === 'digest') {
      digestItems.push(thread)
      continue
    }

    const recipients = await resolveAlertRecipients(db, {
      mode: 'last_handler',
      email: typeof thread.last_handler_email === 'string' ? thread.last_handler_email : null,
    })
    const booking = await bookingHint(db, Number(thread.booking_id || 0))
    const part = await dispatchAlerts(db, {
      dedupeKey: `unanswered:${threadId}`,
      kind: 'unanswered',
      recipients,
      payload: {
        guestFirstName: guestFirstName(String(thread.guest_name || booking?.guest_name || '')),
        bookingRef: booking?.nightsbridge_booking_id || (booking?.id ? `B-${booking.id}` : `T-${threadId}`),
        staffLink: staffThreadPath(threadId),
      },
      now: input.now,
      send: input.send,
    })
    sent += part.sent
    skipped += part.skipped
  }

  if (digestItems.length && isDigestWindow(input.now)) {
    const { sastDateKey } = await import('@/lib/ops-settings')
    const key = `unanswered-digest:${sastDateKey(input.now)}`
    const recipients = await resolveAlertRecipients(db, { mode: 'all_active' })
    const names = digestItems
      .map((thread) => guestFirstName(String(thread.guest_name || '')) || `T-${thread.id}`)
      .slice(0, 20)
    const part = await dispatchAlerts(db, {
      dedupeKey: key,
      kind: 'unanswered_digest',
      recipients,
      payload: {
        guestFirstName: names[0] || 'Guests',
        bookingRef: `${digestItems.length} thread(s)`,
        staffLink: staffThreadPath(Number(digestItems[0].id)),
        extraLine: `Threads: ${names.join(', ')}`,
      },
      now: input.now,
      send: input.send,
    })
    sent += part.sent
    skipped += part.skipped
  }

  return { sent, skipped }
}

async function latestInboundIsSpam(db: DbClient, threadId: number): Promise<boolean> {
  try {
    const row = (await db
      .prepare(
        `SELECT is_spam FROM inbound_messages
         WHERE thread_id = ? AND (direction IS NULL OR direction = 'inbound')
         ORDER BY message_timestamp DESC LIMIT 1`
      )
      .get(threadId)) as { is_spam?: number } | undefined
    return Number(row?.is_spam || 0) === 1
  } catch {
    return false
  }
}

async function bookingHint(
  db: DbClient,
  bookingId: number
): Promise<{ id: number; guest_name?: string; nightsbridge_booking_id?: string } | null> {
  if (!bookingId) return null
  try {
    return ((await db
      .prepare(`SELECT id, guest_name, nightsbridge_booking_id FROM bookings WHERE id = ?`)
      .get(bookingId)) as { id: number; guest_name?: string; nightsbridge_booking_id?: string }) || null
  } catch {
    return null
  }
}

export async function evaluateNbFreshness(
  db: DbClient,
  input: { now: Date; send?: typeof sendStaffAlertEmail }
): Promise<{ sent: number; skipped: number; resolved?: number }> {
  await ensureSprint2Schema(db)
  const lastOk = (await db
    .prepare(
      `SELECT finished_at FROM nb_sync_runs
       WHERE layer = 'batch' AND ok = 1
       ORDER BY finished_at DESC LIMIT 1`
    )
    .get()) as { finished_at: string } | undefined

  const recipients = await resolveAlertRecipients(db, { mode: 'all_active' })
  let sent = 0
  let skipped = 0
  let resolved = 0

  const stale =
    !lastOk ||
    hoursBetween(input.now, new Date(lastOk.finished_at)) >= OPS_SETTINGS.nbMissedImportHours

  if (stale) {
    const part = await dispatchAlerts(db, {
      dedupeKey: 'nb-missed-import',
      kind: 'nb_missed',
      recipients,
      payload: {
        guestFirstName: 'Nightsbridge',
        bookingRef: 'batch',
        staffLink: `${staffBookingPath(0).replace(/\?booking=0$/, '')}`,
        extraLine: 'No successful batch within the freshness window.',
      },
      now: input.now,
      send: input.send,
    })
    sent += part.sent
    skipped += part.skipped
  } else {
    for (const email of recipients) {
      const note = await markAlertResolved(db, { dedupeKey: 'nb-missed-import', recipientEmail: email, now: input.now })
      if (note.notified) resolved += 1
    }
  }

  const badRuns = (await db
    .prepare(
      `SELECT id, code, rows FROM nb_sync_runs
       WHERE layer = 'batch' AND ok = 0
         AND code IN ('ERROR', 'ZERO_ROWS', 'ROWDROP_GUARD', 'EMPTY_FILE', 'PARSE_FAILED', 'LOGIN_FAILED')
       ORDER BY id DESC LIMIT 20`
    )
    .all()) as Array<{ id: number; code: string; rows: number | null }>

  for (const run of badRuns) {
    const part = await dispatchAlerts(db, {
      dedupeKey: `nb-batch:${String(run.code).toLowerCase()}:${run.id}`,
      kind: 'nb_batch',
      recipients,
      payload: {
        guestFirstName: 'Nightsbridge',
        bookingRef: run.code,
        extraLine: 'Batch did not apply cleanly.',
      },
      now: input.now,
      send: input.send,
    })
    sent += part.sent
    skipped += part.skipped
  }

  return { sent, skipped, resolved }
}

export function nextHealthStreak(previousStreak: number, ok: boolean): number {
  if (ok) return 0
  return previousStreak + 1
}

export function healthAlertAction(input: {
  previousStreak: number
  ok: boolean
  alreadyAlerted: boolean
  threshold?: number
}): 'none' | 'site_down' | 'site_recovery' {
  const threshold = input.threshold ?? OPS_SETTINGS.healthFailThreshold
  const streak = nextHealthStreak(input.previousStreak, input.ok)
  if (!input.ok && streak >= threshold && !input.alreadyAlerted) return 'site_down'
  if (input.ok && input.alreadyAlerted) return 'site_recovery'
  return 'none'
}

export async function recordHealthProbe(
  db: DbClient,
  input: { ok: boolean; source: string; now?: Date }
): Promise<{ streak: number; action: 'none' | 'site_down' | 'site_recovery' }> {
  await ensureSprint2Schema(db)
  const last = (await db
    .prepare(`SELECT ok, streak FROM health_probes ORDER BY id DESC LIMIT 1`)
    .get()) as { ok: number; streak: number } | undefined
  const previousStreak = last ? Number(last.streak || 0) : 0
  const alreadyAlerted = Boolean(
    (
      await db
        .prepare(
          `SELECT id FROM staff_alerts WHERE dedupe_key = 'site-down' AND status = 'open' LIMIT 1`
        )
        .get()
    )
  )
  const streak = nextHealthStreak(previousStreak, input.ok)
  const action = healthAlertAction({
    previousStreak,
    ok: input.ok,
    alreadyAlerted,
  })
  await db
    .prepare(`INSERT INTO health_probes (checked_at, ok, source, streak) VALUES (?, ?, ?, ?)`)
    .run((input.now || new Date()).toISOString(), input.ok ? 1 : 0, input.source, streak)
  return { streak, action }
}

export async function evaluateHealthFromProbes(
  db: DbClient,
  input: { now: Date; send?: typeof sendStaffAlertEmail }
): Promise<{ sent: number; skipped: number; resolved?: number }> {
  await ensureSprint2Schema(db)
  const last = (await db
    .prepare(`SELECT ok, streak FROM health_probes ORDER BY id DESC LIMIT 1`)
    .get()) as { ok: number; streak: number } | undefined
  if (!last) return { sent: 0, skipped: 0 }
  const recipients = await resolveAlertRecipients(db, { mode: 'all_active' })
  const alreadyAlerted = Boolean(
    (await db.prepare(`SELECT id FROM staff_alerts WHERE dedupe_key = 'site-down' AND status = 'open' LIMIT 1`).get())
  )
  const action = healthAlertAction({
    previousStreak: last.ok ? 0 : Math.max(0, Number(last.streak) - (last.ok ? 0 : 1)),
    ok: Boolean(last.ok),
    alreadyAlerted,
  })
  // Recompute from stored streak + ok directly:
  const storedAction = !last.ok && Number(last.streak) >= OPS_SETTINGS.healthFailThreshold && !alreadyAlerted
    ? 'site_down'
    : last.ok && alreadyAlerted
      ? 'site_recovery'
      : 'none'

  if (storedAction === 'site_down' || action === 'site_down') {
    return dispatchAlerts(db, {
      dedupeKey: 'site-down',
      kind: 'site_down',
      recipients,
      payload: { guestFirstName: 'GuestFlow', bookingRef: 'site', extraLine: 'Deep health failed twice.' },
      now: input.now,
      send: input.send,
    })
  }
  if (storedAction === 'site_recovery' || action === 'site_recovery') {
    let resolved = 0
    let sent = 0
    let skipped = 0
    for (const email of recipients) {
      const note = await markAlertResolved(db, { dedupeKey: 'site-down', recipientEmail: email, now: input.now })
      if (note.notified) resolved += 1
      else skipped += 1
    }
    const recovery = await dispatchAlerts(db, {
      dedupeKey: 'site-recovery',
      kind: 'site_recovery',
      recipients,
      payload: { guestFirstName: 'GuestFlow', bookingRef: 'site', extraLine: 'Deep health recovered.' },
      now: input.now,
      send: input.send,
    })
    sent += recovery.sent
    skipped += recovery.skipped
    return { sent, skipped, resolved }
  }
  return { sent: 0, skipped: 0 }
}
