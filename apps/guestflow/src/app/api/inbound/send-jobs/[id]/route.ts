import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { getJob, publicJob } from '@/lib/send-jobs'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const id = Number(context.params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ success: false, error: 'Invalid job id' }, { status: 400 })
  }

  try {
    const db = await getDbAsync()
    const job = await getJob(db, id)
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        channel: job.channel,
        status: job.status,
        errorCode: job.error_code,
        updatedAt: job.updated_at,
        delivered: job.status === 'sent',
      },
      public: publicJob(job),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
