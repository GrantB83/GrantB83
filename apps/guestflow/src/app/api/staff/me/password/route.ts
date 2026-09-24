import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { changeOwnPassword } from '@/lib/staff-auth'
import { getStaffSessionFromRequest } from '@/lib/staff-session'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const db = await getDbAsync()
  await ensureStaffUsersSchema(db)
  const session = await getStaffSessionFromRequest(request, db)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const result = await changeOwnPassword(db, {
    session,
    currentPassword: typeof body.currentPassword === 'string' ? body.currentPassword : '',
    newPassword: typeof body.newPassword === 'string' ? body.newPassword : '',
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ success: true })
}
