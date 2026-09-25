import type { DbClient } from '@/lib/db'
import { ensureDeliverySchema } from '@/lib/delivery-schema'
import { onSendFailed } from '@/lib/send-failed-hook'

export type DeliveryBubble = 'pending' | 'delivered' | 'failed'

export const DEFAULT_STUCK_PENDING_MINUTES = 15
export const DEFAULT_POLL_AFTER_MINUTES = 10

export function stuckPendingMinutes(): number {
  const n = Number(process.env.DELIVERY_STUCK_PENDING_MINUTES)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STUCK_PENDING_MINUTES
}

export function pollAfterMinutes(): number {
  const n = Number(process.env.DELIVERY_POLL_AFTER_MINUTES)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_POLL_AFTER_MINUTES
}

const STATUS_RANK: Record<string, number> = {
  pending: 10,
  delivered: 20,
  read: 30,
  failed: 40,
}

export function rankForBubble(status: DeliveryBubble, read?: boolean): number {
  if (status === 'delivered' && read) return STATUS_RANK.read
  return STATUS_RANK[status] ?? 0
}

export function mapProviderStatus(raw: string | null | undefined): {
  bubble: DeliveryBubble
  read: boolean
} | null {
  if (!raw) return null
  const status = raw.trim().toLowerCase().replace(/^email\./, '')
  if (['queued', 'sending', 'sent', 'accepted', 'scheduled', 'delivery_delayed'].includes(status)) {
    return { bubble: 'pending', read: false }
  }
  if (['delivered'].includes(status)) {
    return { bubble: 'delivered', read: false }
  }
  if (['read', 'opened'].includes(status)) {
    return { bubble: 'delivered', read: true }
  }
  if (['failed', 'undelivered', 'bounced', 'complained', 'rejected'].includes(status)) {
    return { bubble: 'failed', read: false }
  }
  return null
}

export function plainDeliveryError(
  code?: string | null,
  message?: string | null
): string {
  const blob = `${code || ''} ${message || ''}`.toLowerCase()
  if (
    /63016|63051|21617|outside.*24|24h|24-hour|window/.test(blob)
  ) {
    return 'outside 24h window'
  }
  if (/21211|21614|21217|invalid.*number|not a valid/.test(blob)) {
    return 'invalid number'
  }
  if (/bounced|550|mailbox.*not/.test(blob)) {
    return 'email bounced'
  }
  if (/complained|spam/.test(blob)) {
    return 'recipient marked this as spam'
  }
  if (/undelivered/.test(blob)) {
    return 'not delivered'
  }
  const trimmed = (message || '').trim()
  if (trimmed && trimmed.length < 120 && !/token|secret|password|key=/i.test(trimmed)) {
    return trimmed
  }
  return 'delivery failed'
}

export function isStuckPending(
  status: string | null | undefined,
  queuedAt: string | null | undefined,
  now: Date = new Date(),
  thresholdMinutes: number = stuckPendingMinutes()
): boolean {
  if (status !== 'pending' || !queuedAt) return false
  const queued = Date.parse(queuedAt)
  if (!Number.isFinite(queued)) return false
  return now.getTime() - queued >= thresholdMinutes * 60 * 1000
}

export function shouldApplyStatus(input: {
  currentStatus?: string | null
  currentRead?: boolean
  next: DeliveryBubble
  nextRead?: boolean
}): boolean {
  const currentRank = rankForBubble(
    (input.currentStatus as DeliveryBubble) || 'pending',
    Boolean(input.currentRead)
  )
  const nextRank = rankForBubble(input.next, Boolean(input.nextRead))
  return nextRank >= currentRank
}

export function getTwilioStatusCallbackUrl(): string | undefined {
  const explicit = process.env.TWILIO_STATUS_CALLBACK_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!base) return undefined
  return `${base}/api/webhooks/twilio/status`
}

export interface DeliveryRow {
  id: number
  thread_id: number
  channel?: string | null
  delivery_status?: string | null
  delivery_read?: number | null
  provider_message_id?: string | null
  whatsapp_message_id?: string | null
  queued_at?: string | null
  delivery_updated_at?: string | null
  sent_to_test_sink?: number | null
  resend_of?: number | null
  resent_by?: string | null
  resend_in_flight?: number | null
  message_text?: string | null
  from_number?: string | null
  direction?: string | null
}

export async function findOutboundByProviderId(
  db: DbClient,
  providerMessageId: string
): Promise<DeliveryRow | null> {
  await ensureDeliverySchema(db)
  const row = (await db
    .prepare(
      `SELECT * FROM inbound_messages
       WHERE direction = 'outbound'
         AND (provider_message_id = ? OR whatsapp_message_id = ?)
       ORDER BY id DESC
       LIMIT 1`
    )
    .get(providerMessageId, providerMessageId)) as DeliveryRow | undefined
  return row || null
}

export async function applyProviderReceipt(
  db: DbClient,
  input: {
    providerMessageId: string
    providerStatus: string
    errorCode?: string | null
    errorMessage?: string | null
    at?: string
  }
): Promise<{ updated: boolean; message?: DeliveryRow; ignored?: boolean }> {
  await ensureDeliverySchema(db)
  const mapped = mapProviderStatus(input.providerStatus)
  if (!mapped) {
    return { updated: false, ignored: true }
  }
  const existing = await findOutboundByProviderId(db, input.providerMessageId)
  if (!existing) {
    return { updated: false, ignored: true }
  }
  if (
    !shouldApplyStatus({
      currentStatus: existing.delivery_status,
      currentRead: Boolean(existing.delivery_read),
      next: mapped.bubble,
      nextRead: mapped.read,
    })
  ) {
    return { updated: false, ignored: true, message: existing }
  }

  const now = input.at || new Date().toISOString()
  const errorPlain =
    mapped.bubble === 'failed'
      ? plainDeliveryError(input.errorCode, input.errorMessage)
      : null
  const readFlag = mapped.read || Boolean(existing.delivery_read) ? 1 : 0

  await db
    .prepare(
      `UPDATE inbound_messages
       SET delivery_status = ?,
           delivery_read = ?,
           delivery_error_code = ?,
           delivery_error_plain = ?,
           delivery_updated_at = ?
       WHERE id = ?`
    )
    .run(
      mapped.bubble,
      mapped.bubble === 'delivered' ? readFlag : 0,
      mapped.bubble === 'failed' ? input.errorCode || null : null,
      errorPlain,
      now,
      existing.id
    )

  if (mapped.bubble === 'failed') {
    onSendFailed({
      db,
      threadId: Number(existing.thread_id),
      messageId: Number(existing.id),
      channel: existing.channel || 'unknown',
      errorPlain: errorPlain || 'delivery failed',
      attemptId: now,
    })
    await db
      .prepare(
        `UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ? OR id = ?`
      )
      .run(existing.id, existing.resend_of || existing.id)
    if (existing.resend_of) {
      await db
        .prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`)
        .run(existing.resend_of)
    }
  }

  if (mapped.bubble === 'delivered' && existing.resend_of) {
    await db
      .prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`)
      .run(existing.resend_of)
  }

  const updated = (await db
    .prepare(`SELECT * FROM inbound_messages WHERE id = ?`)
    .get(existing.id)) as DeliveryRow

  return { updated: true, message: updated }
}

export function asNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value)
  return Number(value)
}
