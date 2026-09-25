import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { addStaffUser, assertNoSecretLeak, listStaffUsers } from '@/lib/staff-auth'
import { getStaffSessionFromRequest } from '@/lib/staff-session'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'
import { publishActiveAlertEmails } from '@/lib/publish-alert-emails'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const db = await getDbAsync()
  await ensureStaffUsersSchema(db)
  const session = await getStaffSessionFromRequest(request, db)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const users = await listStaffUsers(db)
  const payload = {
    success: true,
    email: session.email,
    display_name: session.displayName,
    users,
  }
  assertNoSecretLeak(payload)
  return NextResponse.json(payload)
}

export async function POST(request: NextRequest) {
  const db = await getDbAsync()
  await ensureStaffUsersSchema(db)
  const session = await getStaffSessionFromRequest(request, db)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const result = await addStaffUser(db, {
    email: typeof body.email === 'string' ? body.email : '',
    password: typeof body.password === 'string' ? body.password : '',
    displayName: typeof body.display_name === 'string' ? body.display_name : null,
    actorEmail: session.email,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const payload = { success: true, user: result.user }
  assertNoSecretLeak(payload)
  await publishActiveAlertEmails(db).catch(() => undefined)
  return NextResponse.json(payload, { status: 201 })
}
