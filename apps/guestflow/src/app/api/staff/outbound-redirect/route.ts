import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { getOutboundStatus, setOutboundRedirect } from '@/lib/outbound-redirect'
import { getStaffSessionFromRequest } from '@/lib/staff-session'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = await getDbAsync()
  await ensureStaffUsersSchema(db)
  const session = await getStaffSessionFromRequest(request, db)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const status = await getOutboundStatus(db)
  return NextResponse.json({
    on: status.redirectStatus === 'on',
    mode: status.mode,
    redirectStatus: status.redirectStatus,
  })
}

export async function POST(request: NextRequest) {
  const db = await getDbAsync()
  await ensureStaffUsersSchema(db)
  const session = await getStaffSessionFromRequest(request, db)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  if (typeof body.on !== 'boolean') {
    return NextResponse.json({ error: 'on must be a boolean' }, { status: 400 })
  }
  const result = await setOutboundRedirect(db, body.on, session.email)
  return NextResponse.json({
    on: result.next === 'on',
    old: result.old,
    next: result.next,
  })
}
