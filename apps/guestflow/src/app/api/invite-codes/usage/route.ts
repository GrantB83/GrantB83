import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEMO_PASSWORD = 'demo2026'

// GET /api/invite-codes/usage?tenant_id=N - Get usage report for tenant
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })
    }

    const db = getDb()
    
    // Get all invite codes for tenant with attribution counts
    const codes = db.prepare(`
      SELECT 
        ic.id,
        ic.code,
        ic.max_uses,
        ic.uses_count,
        ic.expires_at,
        ic.note,
        ic.created_at,
        COUNT(w.id) as waitlist_leads_count
      FROM invite_codes ic
      LEFT JOIN waitlist w ON w.invite_code_id = ic.id
      WHERE ic.tenant_id = ?
      GROUP BY ic.id
      ORDER BY ic.created_at DESC
    `).all(tenantId)

    return NextResponse.json({ codes })
  } catch (error) {
    console.error('Error fetching invite code usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
