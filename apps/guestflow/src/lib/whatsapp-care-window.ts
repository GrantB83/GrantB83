import type { DbClient } from '@/lib/db'

export const CARE_WINDOW_MS = 24 * 60 * 60 * 1000
export const CLOSING_SOON_MS = 5 * 60 * 1000
export const WABA_NUMBER = '+27600200825'

export type CareWindowState = 'open' | 'closing_soon' | 'closed'

export interface CareWindow {
  lastWabaInboundAt: string | null
  windowExpiresAt: string | null
  state: CareWindowState
  remainingMs: number
  closingSoon: boolean
  label: string
}

export function isWabaCloudInbound(input: {
  direction?: string | null
  channel?: string | null
  sourceTag?: string | null
  source?: string | null
}): boolean {
  if (String(input.direction || '').toLowerCase() !== 'inbound') return false
  const channel = String(input.channel || '').toLowerCase()
  const source = String(input.sourceTag || input.source || '').toLowerCase()
  if (channel === 'whatsapp_web' || source === 'whatsapp_web' || source === 'legacy_wa') {
    return false
  }
  return channel === 'whatsapp_cloud' || source === 'twilio_whatsapp'
}

export function formatWindowLabel(state: CareWindowState, remainingMs: number): string {
  if (state === 'closed') return 'Window closed'
  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `Window open, closes in ${hours}h ${minutes}m`
}

export function computeCareWindow(
  lastWabaInboundAt: string | null | undefined,
  now: Date = new Date()
): CareWindow {
  if (!lastWabaInboundAt) {
    return {
      lastWabaInboundAt: null,
      windowExpiresAt: null,
      state: 'closed',
      remainingMs: 0,
      closingSoon: false,
      label: 'Window closed',
    }
  }

  const last = new Date(lastWabaInboundAt)
  if (Number.isNaN(last.getTime())) {
    return computeCareWindow(null, now)
  }

  const expires = new Date(last.getTime() + CARE_WINDOW_MS)
  const remainingMs = expires.getTime() - now.getTime()
  let state: CareWindowState = 'open'
  if (remainingMs <= 0) state = 'closed'
  else if (remainingMs <= CLOSING_SOON_MS) state = 'closing_soon'

  return {
    lastWabaInboundAt: last.toISOString(),
    windowExpiresAt: expires.toISOString(),
    state,
    remainingMs: Math.max(0, remainingMs),
    closingSoon: state === 'closing_soon',
    label: formatWindowLabel(state === 'closing_soon' ? 'open' : state, Math.max(0, remainingMs)),
  }
}

export async function loadLastWabaInboundAt(
  db: DbClient,
  threadId: number
): Promise<string | null> {
  const rows = ((await db
    .prepare(
      `SELECT message_timestamp, channel, source_tag, direction
       FROM inbound_messages
       WHERE thread_id = ? AND direction = 'inbound'
       ORDER BY message_timestamp DESC, id DESC`
    )
    .all(threadId)) || []) as Array<{
    message_timestamp?: string
    channel?: string
    source_tag?: string
    direction?: string
  }>

  for (const row of rows) {
    if (
      isWabaCloudInbound({
        direction: row.direction,
        channel: row.channel,
        sourceTag: row.source_tag,
      })
    ) {
      return row.message_timestamp || null
    }
  }
  return null
}

export async function loadLastWabaInboundAtByThread(
  db: DbClient,
  threadIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  if (threadIds.length === 0) return map
  const rows = ((await db
    .prepare(
      `SELECT thread_id, message_timestamp, channel, source_tag, direction
       FROM inbound_messages
       WHERE direction = 'inbound'
         AND thread_id IN (${threadIds.map(() => '?').join(',')})
       ORDER BY message_timestamp DESC, id DESC`
    )
    .all(...threadIds)) || []) as Array<{
    thread_id: number
    message_timestamp?: string
    channel?: string
    source_tag?: string
    direction?: string
  }>

  for (const row of rows) {
    const id = Number(row.thread_id)
    if (map.has(id)) continue
    if (
      isWabaCloudInbound({
        direction: row.direction,
        channel: row.channel,
        sourceTag: row.source_tag,
      })
    ) {
      if (row.message_timestamp) map.set(id, row.message_timestamp)
    }
  }
  return map
}

export async function getCareWindowForThread(
  db: DbClient,
  threadId: number,
  now: Date = new Date()
): Promise<CareWindow> {
  const last = await loadLastWabaInboundAt(db, threadId)
  return computeCareWindow(last, now)
}
