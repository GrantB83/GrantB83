import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { ensurePhase0Schema } from '@/lib/phase0-schema'

export const dynamic = 'force-dynamic'

/**
 * Phase 0 stub: future Ultra batch worker upserts drafts here.
 * Auth: DRAFT_WORKER_SECRET only. Never CRON_SECRET. No LLM.
 */
function readPresentedSecret(request: NextRequest): string | null {
  const header = request.headers.get('x-draft-worker-secret')
  if (header && header.trim()) return header.trim()
  const auth = request.headers.get('authorization')
  const bearer = auth?.replace(/^Bearer\s+/i, '').trim()
  return bearer || null
}

export function isDraftWorkerAuthorized(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expected = (process.env.DRAFT_WORKER_SECRET || '').trim()
  if (!expected) {
    return { ok: false, status: 401, error: 'DRAFT_WORKER_SECRET is not configured' }
  }

  const cron = (process.env.CRON_SECRET || '').trim()
  if (cron && expected === cron) {
    return { ok: false, status: 403, error: 'DRAFT_WORKER_SECRET must not equal CRON_SECRET' }
  }

  const presented = readPresentedSecret(request)
  if (!presented) {
    return { ok: false, status: 401, error: 'Missing draft worker secret' }
  }
  if (cron && presented === cron) {
    return { ok: false, status: 403, error: 'CRON_SECRET is not accepted for draft writes' }
  }
  if (presented !== expected) {
    return { ok: false, status: 401, error: 'Invalid draft worker secret' }
  }
  return { ok: true }
}

export async function POST(request: NextRequest) {
  const auth = isDraftWorkerAuthorized(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as {
      threadId?: number
      messageId?: number
      draftReply?: string
      draftSource?: string
    }

    const threadId = body.threadId
    const messageId = body.messageId
    const draftReply = (body.draftReply || '').trim()

    if (!threadId || typeof threadId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'threadId is required and must be a number' },
        { status: 400 }
      )
    }
    if (!draftReply) {
      return NextResponse.json({ success: false, error: 'draftReply is required' }, { status: 400 })
    }
    if (body.draftSource && body.draftSource !== 'llm') {
      return NextResponse.json(
        { success: false, error: 'draftSource must be llm for this stub' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    await ensurePhase0Schema(db)

    if (messageId) {
      await db
        .prepare(
          `
          UPDATE inbound_messages
          SET draft_reply = ?, draft_source = 'llm'
          WHERE id = ? AND thread_id = ?
        `
        )
        .run(draftReply, messageId, threadId)
    } else {
      await db
        .prepare(
          `
          UPDATE inbound_messages
          SET draft_reply = ?, draft_source = 'llm'
          WHERE id = (
            SELECT id FROM inbound_messages
            WHERE thread_id = ?
            ORDER BY message_timestamp DESC
            LIMIT 1
          )
        `
        )
        .run(draftReply, threadId)
    }

    return NextResponse.json({
      success: true,
      threadId,
      messageId: messageId || null,
      draftSource: 'llm',
    })
  } catch (error) {
    console.error('[drafts/upsert]', error)
    return NextResponse.json({ success: false, error: 'Failed to upsert draft' }, { status: 500 })
  }
}
