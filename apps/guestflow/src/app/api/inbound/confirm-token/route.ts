import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { issueConfirmToken, isSendEligible } from '@/lib/confirm-token'
import { ensurePhase0Schema } from '@/lib/phase0-schema'
import { ensureDeliverySchema } from '@/lib/delivery-schema'
import { isStuckPending } from '@/lib/delivery-status'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      threadId?: number
      purpose?: string
      messageId?: number
    }
    const threadId = body.threadId
    if (!threadId || typeof threadId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'threadId is required and must be a number' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    await ensurePhase0Schema(db)
    await ensureDeliverySchema(db)

    const thread = (await db
      .prepare(`SELECT id, status FROM inbound_threads WHERE id = ?`)
      .get(threadId)) as { id: number; status: string } | undefined

    if (!thread) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 400 })
    }

    if (body.purpose === 'resend') {
      const messageId = Number(body.messageId)
      if (!Number.isFinite(messageId) || messageId <= 0) {
        return NextResponse.json(
          { success: false, error: 'messageId is required for resend confirmToken' },
          { status: 400 }
        )
      }
      const target = (await db
        .prepare(
          `SELECT id, thread_id, direction, delivery_status, queued_at
           FROM inbound_messages WHERE id = ?`
        )
        .get(messageId)) as {
        id: number
        thread_id: number
        direction?: string
        delivery_status?: string
        queued_at?: string
      } | undefined
      if (!target || Number(target.thread_id) !== threadId || target.direction !== 'outbound') {
        return NextResponse.json(
          { success: false, error: 'Resend target is not an outbound message on this thread' },
          { status: 400 }
        )
      }
      const failed = target.delivery_status === 'failed'
      const stuck = isStuckPending(target.delivery_status || 'pending', target.queued_at)
      if (!failed && !stuck) {
        return NextResponse.json(
          { success: false, error: 'Resend confirmToken is only issued for Failed or stuck-Pending messages' },
          { status: 400 }
        )
      }
    } else {
      const latestMessage = (await db
        .prepare(
          `
        SELECT id, status FROM inbound_messages
        WHERE thread_id = ?
        ORDER BY message_timestamp DESC
        LIMIT 1
      `
        )
        .get(threadId)) as { id: number; status?: string } | undefined

      if (!isSendEligible(thread.status, latestMessage?.status)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Thread is not approved or ready. Approve before requesting a confirmToken.',
          },
          { status: 400 }
        )
      }
    }

    const issued = await issueConfirmToken(db, { tenantId: 1, threadId })
    return NextResponse.json({
      success: true,
      confirmToken: issued.confirmToken,
      expiresAt: issued.expiresAt,
      threadId,
    })
  } catch (error) {
    console.error('[confirm-token]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to issue confirmToken' },
      { status: 500 }
    )
  }
}
