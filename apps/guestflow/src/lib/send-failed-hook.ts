import type { DbClient } from '@/lib/db'
import { guestFirstName } from '@/lib/staff-alert-email'
import { notifyFailedApproveSend } from '@/lib/staff-alerts'

export interface SendFailedEvent {
  db?: DbClient
  threadId: number
  messageId?: number
  channel: string
  errorPlain: string
  provider?: string
  actorEmail?: string | null
  guestFirstName?: string | null
  bookingRef?: string | null
  attemptId?: string
}

export function onSendFailed(event: SendFailedEvent): void {
  void runSendFailedAlert(event)
}

async function runSendFailedAlert(event: SendFailedEvent): Promise<void> {
  const db = event.db
  if (!db) {
    console.warn('[onSendFailed]', {
      threadId: event.threadId,
      messageId: event.messageId,
      channel: event.channel,
      errorPlain: event.errorPlain,
      provider: event.provider,
    })
    return
  }

  let actorEmail = event.actorEmail ?? null
  if (!actorEmail) {
    const row = (await db
      .prepare(`SELECT guest_name, last_handler_email FROM inbound_threads WHERE id = ?`)
      .get(event.threadId)) as { guest_name?: string; last_handler_email?: string } | undefined
    actorEmail = row?.last_handler_email || null
    if (!event.guestFirstName && row?.guest_name) {
      event = { ...event, guestFirstName: guestFirstName(row.guest_name) }
    }
  }

  await notifyFailedApproveSend({
    db,
    actorEmail,
    threadId: event.threadId,
    guestFirstName: event.guestFirstName,
    bookingRef: event.bookingRef ?? `T-${event.threadId}`,
    channel: event.channel,
    attemptId: event.attemptId || (event.messageId ? String(event.messageId) : undefined),
  }).catch((error) => {
    console.warn('[onSendFailed] notifyFailedApproveSend failed:', error)
  })
}
