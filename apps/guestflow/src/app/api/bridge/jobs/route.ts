import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { listJobs, publicJob, type SendJobStatus } from '@/lib/send-jobs'
import { verifySharedSecret } from '@/lib/inbound-ingest'

export const dynamic = 'force-dynamic'

function verifyBridge(request: NextRequest): boolean {
  return verifySharedSecret(
    request,
    [process.env.BRIDGE_JOB_SECRET, process.env.CRON_SECRET, process.env.INBOUND_WEBHOOK_SECRET],
    ['x-bridge-secret', 'x-webhook-secret']
  )
}

export async function GET(request: NextRequest) {
  if (!verifyBridge(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const status = (request.nextUrl.searchParams.get('status') || 'queued') as SendJobStatus
  const allowed: SendJobStatus[] = ['pending', 'queued', 'claimed', 'sent', 'failed', 'blocked']
  if (!allowed.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status filter' }, { status: 400 })
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)
  const db = await getDbAsync()
  const jobs = await listJobs(db, status, limit)

  return NextResponse.json({
    success: true,
    jobs: jobs.map((job) => publicJob(job)),
  })
}
