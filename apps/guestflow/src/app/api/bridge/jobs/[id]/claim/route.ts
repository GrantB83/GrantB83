import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { claimJob, publicJob } from '@/lib/send-jobs'
import { verifySharedSecret } from '@/lib/inbound-ingest'

export const dynamic = 'force-dynamic'

function verifyBridge(request: NextRequest): boolean {
  return verifySharedSecret(
    request,
    [process.env.BRIDGE_JOB_SECRET, process.env.CRON_SECRET, process.env.INBOUND_WEBHOOK_SECRET],
    ['x-bridge-secret', 'x-webhook-secret']
  )
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

  try {
    const db = await getDbAsync()
    const job = await claimJob(db, id)
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        ...publicJob(job),
        claimToken: job.claim_token,
      },
    })
  } catch (error: any) {
    const status = error?.code === 'not_queued' ? 409 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Claim failed' },
      { status }
    )
  }
}
