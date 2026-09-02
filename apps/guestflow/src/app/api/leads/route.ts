import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const inviteCodeFilter = searchParams.get('invite_code') // Phase 31: optional invite code filter

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 })
    }

    const db = getDb()
    
    // Phase 31: Join with invite_codes table to fetch code string
    // Support filtering by: specific code, "any" (has attribution), or "none" (no attribution)
    let query = `
      SELECT w.id, w.name, w.email, w.property_name, w.room_count, w.current_system, w.phone, w.notes, w.status, w.created_at,
             t.name as tenant_name,
             ic.code as invite_code
      FROM waitlist w
      LEFT JOIN tenants t ON w.tenant_id = t.id
      LEFT JOIN invite_codes ic ON w.invite_code_id = ic.id
      WHERE (w.tenant_id = ? OR w.tenant_id IS NULL)
    `
    
    const params: any[] = [parseInt(tenantId, 10)]
    
    // Phase 31: Apply invite code filter
    if (inviteCodeFilter === 'any') {
      query += ` AND w.invite_code_id IS NOT NULL`
    } else if (inviteCodeFilter === 'none') {
      query += ` AND w.invite_code_id IS NULL`
    } else if (inviteCodeFilter) {
      // Specific code filter: join again to match code string
      query += ` AND ic.code = ?`
      params.push(inviteCodeFilter)
    }
    
    query += ` ORDER BY w.created_at DESC`

    const leads = db.prepare(query).all(...params)

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
