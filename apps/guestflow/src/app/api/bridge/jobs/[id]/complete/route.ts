import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { completeJob, getJob, publicJob, type SendJobTerminalStatus } from '@/lib/send-jobs'
import { verifySharedSecret } from '@/lib/inbound-ingest'

export const dynamic = 'force-dynamic'

function verifyBridge(request: NextRequest): boolean {
  return verifySharedSecret(
    request,
    [process.env.BRIDGE_JOB_SECRET, process.env.CRON_SECRET, process.env.INBOUND_WEBHOOK_SECRET],
    ['x-bridge-secret', 'x-webhook-secret']
  )
}

async function applyThreadOutcome(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  job: NonNullable<Awaited<ReturnType<typeof getJob>>>,
  status: SendJobTerminalStatus
) {
  const now = new Date().toISOString()

  if (status === 'sent') {
    await db.batch([
      {
        sql: `
          INSERT INTO inbound_messages (
            thread_id, message_text, message_timestamp, tenant_id,
            direction, whatsapp_message_id
          ) VALUES (?, ?, ?, 1, 'outbound', ?)
        `,
        args: [job.thread_id, job.body_text, now, `wa_web_${job.id}`],
      },
      {
        sql: `
          UPDATE inbound_threads
          SET status = 'sent', last_message_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [now, job.thread_id],
      },
    ])
    return
  }

  const error = job.error_code || status
  await db.batch([
    {
      sql: `
        INSERT INTO inbound_messages (
          thread_id, message_text, message_timestamp, tenant_id,
          direction, send_error
        ) VALUES (?, ?, ?, 1, 'outbound', ?)
      `,
      args: [job.thread_id, job.body_text, now, error],
    },
    {
      sql: `
        UPDATE inbound_threads
        SET status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [job.thread_id],
    },
  ])
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  if (!verifyBridge(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const id = Number(context.params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ success: false, error: 'Invalid job id' }, { status: 400 })
  }

  let payload: { status?: string; error?: string } = {}
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const status = payload.status as SendJobTerminalStatus
  if (status !== 'sent' && status !== 'failed' && status !== 'blocked') {
    return NextResponse.json(
      { success: false, error: 'status must be sent, failed, or blocked' },
      { status: 400 }
    )
  }

  try {
    const db = await getDbAsync()
    const before = await getJob(db, id)
    const job = await completeJob(db, id, status, payload.error || null)
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    if (before && before.status !== 'sent' && before.status !== 'failed' && before.status !== 'blocked') {
      try {
        await applyThreadOutcome(db, job, status)
      } catch (threadError) {
        console.warn('[Bridge complete] thread update skipped:', threadError)
      }
    }

    return NextResponse.json({
      success: true,
      job: publicJob(job),
    })
  } catch (error: any) {
    const http = error?.code === 'already_complete' || error?.code === 'invalid_status' ? 409 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Complete failed' },
      { status: http }
    )
  }
}
