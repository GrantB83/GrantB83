import { NextResponse } from 'next/server'
import { getDb, getDefaultTenantId } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDb()
    const tenants = db.prepare('SELECT id, name, location, timezone, created_at FROM tenants ORDER BY name').all()
    const defaultTenantId = getDefaultTenantId()

    return NextResponse.json({ 
      tenants,
      defaultTenantId
    })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, location, timezone } = body

    if (!name || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, location' },
        { status: 400 }
      )
    }

    const db = getDb()
    const result = db.prepare(
      'INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)'
    ).run(name, location, timezone || 'Africa/Johannesburg')

    const newTenant = db.prepare(
      'SELECT id, name, location, timezone, created_at FROM tenants WHERE id = ?'
    ).get(result.lastInsertRowid)

    return NextResponse.json(newTenant, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
