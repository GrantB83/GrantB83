import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const DEMO_PASSWORD = 'demo2026'

// GET /api/invite-codes?tenant_id=N - List invite codes for tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })
    }

    const db = getDb()
    const codes = db.prepare(`
      SELECT 
        id, tenant_id, code, max_uses, uses_count, expires_at, note, created_at
      FROM invite_codes
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).all(tenantId)

    return NextResponse.json({ codes })
  } catch (error) {
    console.error('Error fetching invite codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invite-codes - Create new invite code
export async function POST(request: Request) {
  try {
    // Check demo auth
    const authHeader = request.headers.get('authorization')
    const providedPassword = authHeader?.replace('Bearer ', '')
    
    if (providedPassword !== DEMO_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid demo password' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { tenantId, code, maxUses, expiresAt, note } = data

    if (!tenantId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, code' },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Check if code already exists
    const existing = db.prepare('SELECT id FROM invite_codes WHERE code = ?').get(code)
    if (existing) {
      return NextResponse.json(
        { error: 'Invite code already exists' },
        { status: 409 }
      )
    }

    const result = db.prepare(`
      INSERT INTO invite_codes (tenant_id, code, max_uses, expires_at, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenantId, code, maxUses || 1, expiresAt || null, note || null)

    const newCode = db.prepare('SELECT * FROM invite_codes WHERE id = ?').get(result.lastInsertRowid)

    return NextResponse.json({ success: true, code: newCode }, { status: 201 })
  } catch (error) {
    console.error('Error creating invite code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
