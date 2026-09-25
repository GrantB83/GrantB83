import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { evaluateStaffAlerts } from '@/lib/staff-alerts'
import { ensureSprint2Schema } from '@/lib/sprint2-schema'
import { ensureUmiSchema } from '@/lib/umi-schema'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const header = request.headers.get('authorization') || request.headers.get('x-cron-secret') || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : header
  let query = ''
  try {
    query = request.nextUrl?.searchParams.get('secret') || new URL(request.url).searchParams.get('secret') || ''
  } catch {
    query = ''
  }
  return bearer === secret || query === secret
}

export async function GET(request: NextRequest) {
  return POST(request)
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const db = await getDbAsync()
  await ensureSprint2Schema(db)
  await ensureStaffUsersSchema(db)
  await ensureUmiSchema(db)
  const result = await evaluateStaffAlerts(db)
  return NextResponse.json({
    ok: true,
    evaluatedAt: new Date().toISOString(),
    ...result,
  })
}
