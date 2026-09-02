import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// POST /api/invite-codes/redeem - Redeem an invite code
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { code } = data

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    const db = getDb()
    
    // Get invite code
    const inviteCode = db.prepare(`
      SELECT id, tenant_id, code, max_uses, uses_count, expires_at, note
      FROM invite_codes
      WHERE code = ?
    `).get(code) as any

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if expired
    if (inviteCode.expires_at) {
      const expiresAt = new Date(inviteCode.expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 })
      }
    }

    // Check if max uses reached
    if (inviteCode.uses_count >= inviteCode.max_uses) {
      return NextResponse.json({ error: 'Invite code has reached maximum uses' }, { status: 400 })
    }

    // Increment uses_count
    db.prepare(`
      UPDATE invite_codes
      SET uses_count = uses_count + 1
      WHERE id = ?
    `).run(inviteCode.id)

    return NextResponse.json({
      success: true,
      inviteCodeId: inviteCode.id,
      tenantId: inviteCode.tenant_id,
      note: inviteCode.note
    }, { status: 200 })
  } catch (error) {
    console.error('Error redeeming invite code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
