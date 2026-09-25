import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { authenticateStaff, clientIpFromHeaders } from '@/lib/staff-auth'
import { applyStaffSessionCookie } from '@/lib/staff-session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const db = await getDbAsync()
    const result = await authenticateStaff(db, {
      email,
      password,
      ip: clientIpFromHeaders(request.headers),
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const response = NextResponse.json({
      success: true,
      email: result.email,
      display_name: result.displayName,
    })
    applyStaffSessionCookie(response, result.rawToken)
    return response
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
