import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { removeStaffUser } from '@/lib/staff-auth'
import { getStaffSessionFromRequest } from '@/lib/staff-session'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'
import { publishActiveAlertEmails } from '@/lib/publish-alert-emails'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const db = await getDbAsync()
  await ensureStaffUsersSchema(db)
  const session = await getStaffSessionFromRequest(request, db)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = Number(context.params.id)
  const result = await removeStaffUser(db, {
    id,
    actorEmail: session.email,
    actorUserId: session.userId,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  await publishActiveAlertEmails(db).catch(() => undefined)
  return NextResponse.json({ success: true })
}
