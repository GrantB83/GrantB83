import { NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDbAsync()
    const stmt = db.prepare(
      'SELECT id, tenant_id, name, location, room_count, created_at FROM properties ORDER BY name'
    )
    const properties = await stmt.all()

    return NextResponse.json({ properties })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, name, location, roomCount } = body

    if (!name || !location || !roomCount) {
      return NextResponse.json(
        { error: 'Missing required fields: name, location, roomCount' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    const finalTenantId = tenantId || await getDefaultTenantIdAsync()
    
    const insertStmt = db.prepare(
      'INSERT INTO properties (tenant_id, name, location, room_count) VALUES (?, ?, ?, ?)'
    )
    const result = await insertStmt.run(finalTenantId, name, location, roomCount)

    const selectStmt = db.prepare(
      'SELECT id, tenant_id, name, location, room_count, created_at FROM properties WHERE id = ?'
    )
    const newProperty = await selectStmt.get(result.lastInsertRowid)

    return NextResponse.json(newProperty, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 })
  }
}
