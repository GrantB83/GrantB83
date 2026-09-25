import type { DbClient } from '@/lib/db'
import { ensureDeliverySchema } from '@/lib/delivery-schema'
import {
  applyProviderReceipt,
  pollAfterMinutes,
  type DeliveryRow,
} from '@/lib/delivery-status'
import { RESEND_EMAILS_URL } from '@/lib/email'

const TWILIO_MESSAGES = 'https://api.twilio.com/2010-04-01/Accounts'

export interface PollResult {
  checked: number
  updated: number
}

function isDueForPoll(row: DeliveryRow, now: Date, afterMinutes: number): boolean {
  if ((row.delivery_status || 'pending') !== 'pending') return false
  const queued = Date.parse(row.queued_at || '')
  if (!Number.isFinite(queued)) return false
  if (now.getTime() - queued < afterMinutes * 60 * 1000) return false
  const updated = Date.parse(row.delivery_updated_at || '')
  if (Number.isFinite(updated) && updated > queued) return false
  return true
}

async function pollTwilio(sid: string): Promise<{ status: string; errorCode?: string; errorMessage?: string } | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) return null
  const auth = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
  const response = await fetch(`${TWILIO_MESSAGES}/${accountSid}/Messages/${sid}.json`, {
    headers: { Authorization: auth },
  })
  if (!response.ok) return null
  const data = (await response.json()) as {
    status?: string
    error_code?: string | number
    error_message?: string
  }
  if (!data.status) return null
  return {
    status: data.status,
    errorCode: data.error_code != null ? String(data.error_code) : undefined,
    errorMessage: data.error_message,
  }
}

async function pollResend(id: string): Promise<{ status: string } | null> {
  if (!process.env.RESEND_API_KEY) return null
  const response = await fetch(`${RESEND_EMAILS_URL}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  })
  if (!response.ok) return null
  const data = (await response.json()) as { last_event?: string; status?: string }
  const status = data.last_event || data.status
  if (!status) return null
  return { status }
}

export async function pollPendingDeliveries(
  db: DbClient,
  now: Date = new Date()
): Promise<PollResult> {
  await ensureDeliverySchema(db)
  const after = pollAfterMinutes()
  const rows = ((await db
    .prepare(
      `SELECT id, thread_id, channel, delivery_status, delivery_read, provider_message_id,
              whatsapp_message_id, queued_at, delivery_updated_at
       FROM inbound_messages
       WHERE direction = 'outbound'
         AND COALESCE(delivery_status, 'pending') = 'pending'
         AND (provider_message_id IS NOT NULL OR whatsapp_message_id IS NOT NULL)
       ORDER BY queued_at ASC
       LIMIT 50`
    )
    .all()) || []) as Array<DeliveryRow & { delivery_updated_at?: string | null }>

  let checked = 0
  let updated = 0
  for (const row of rows) {
    if (!isDueForPoll(row, now, after)) continue
    const providerId = row.provider_message_id || row.whatsapp_message_id
    if (!providerId) continue
    checked += 1
    const channel = (row.channel || '').toLowerCase()
    let receipt: { status: string; errorCode?: string; errorMessage?: string } | null = null
    if (channel === 'email') {
      const polled = await pollResend(providerId)
      if (polled) receipt = polled
    } else {
      receipt = await pollTwilio(providerId)
    }
    if (!receipt) continue
    const applied = await applyProviderReceipt(db, {
      providerMessageId: providerId,
      providerStatus: receipt.status,
      errorCode: receipt.errorCode,
      errorMessage: receipt.errorMessage,
      at: now.toISOString(),
    })
    if (applied.updated) updated += 1
  }
  return { checked, updated }
}

export { isDueForPoll }
