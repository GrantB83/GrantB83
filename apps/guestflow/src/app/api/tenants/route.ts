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
