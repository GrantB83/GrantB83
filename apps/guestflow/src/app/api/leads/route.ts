import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant_id parameter' }, { status: 400 })
    }

    const db = getDb()
    const leads = db.prepare(`
      SELECT w.id, w.name, w.email, w.property_name, w.room_count, w.current_system, w.phone, w.notes, w.status, w.created_at,
             t.name as tenant_name
      FROM waitlist w
      LEFT JOIN tenants t ON w.tenant_id = t.id
      WHERE w.tenant_id = ? OR w.tenant_id IS NULL
      ORDER BY w.created_at DESC
    `).all(parseInt(tenantId, 10))

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
