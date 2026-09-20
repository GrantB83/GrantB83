import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { issueConfirmToken, isSendEligible } from '@/lib/confirm-token'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { threadId?: number }
    const threadId = body.threadId
    if (!threadId || typeof threadId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'threadId is required and must be a number' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    await ensurePhase0Schema(db)

    const thread = (await db
      .prepare(`SELECT id, status FROM inbound_threads WHERE id = ?`)
      .get(threadId)) as { id: number; status: string } | undefined

    if (!thread) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 400 })
    }

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
