import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { ensureStaffUsersSchema } from '@/lib/staff-users-schema'
import {
  clearStaffSessionCookie,
  deleteStaffSessionByToken,
  readSessionTokenFromRequest,
} from '@/lib/staff-session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = readSessionTokenFromRequest(request)
    if (token) {
      const db = await getDbAsync()
      await ensureStaffUsersSchema(db)
      await deleteStaffSessionByToken(db, token)
    }
  } catch {
    // still clear the cookie
  }
  const response = NextResponse.json({ success: true })
  clearStaffSessionCookie(response)
  return response
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
