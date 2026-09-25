import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { runArrivalDraftsJob } from '@/lib/arrival-drafts'

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Invalid or missing CRON_SECRET' },
    { status: 401 }
  )
}

function requestUrl(request: NextRequest): URL {
  return request.nextUrl ?? new URL(request.url)
}

function authorize(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const envSecret = process.env.CRON_SECRET
  if (!envSecret) {
    return { ok: false, status: 500, error: 'CRON_SECRET not configured' }
  }
  const bearer = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = requestUrl(request).searchParams.get('secret')
  const provided =
    (bearer && bearer.startsWith('Bearer ') ? bearer.slice(7) : '') || headerSecret || querySecret
  if (!provided || provided !== envSecret) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true }
}

async function handle(request: NextRequest) {
  const auth = authorize(request)
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized()
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const params = requestUrl(request).searchParams
  const tenantId = Number(params.get('tenant_id') || '1')
  const nowParam = params.get('now')
  const now = nowParam ? new Date(nowParam) : new Date()
  if (nowParam && Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: 'Invalid now timestamp' }, { status: 400 })
  }

  const db = await getDbAsync()
  const result = await runArrivalDraftsJob(db, { tenantId, now })
  return NextResponse.json(result)
}

export async function GET(request: NextRequest) {
  try {
    return await handle(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[arrival-drafts cron]', message)
    return NextResponse.json({ error: 'Arrival drafts job failed', message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
