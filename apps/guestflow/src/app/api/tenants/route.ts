import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = await getDbAsync()
    const tenants = await db
      .prepare('SELECT id, name, location, timezone, created_at FROM tenants ORDER BY name')
      .all()
    const defaultTenantId = await getDefaultTenantIdAsync()

    return jsonSafeResponse({
      tenants,
      defaultTenantId,
    })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return jsonSafeResponse({ error: 'Failed to fetch tenants' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, location, timezone } = body

    if (!name || !location) {
      return jsonSafeResponse(
        { error: 'Missing required fields: name, location' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    const result = await db
      .prepare('INSERT INTO tenants (name, location, timezone) VALUES (?, ?, ?)')
      .run(name, location, timezone || 'Africa/Johannesburg')

    const newTenant = await db
      .prepare('SELECT id, name, location, timezone, created_at FROM tenants WHERE id = ?')
      .get(result.lastInsertRowid)

    return jsonSafeResponse(newTenant, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return jsonSafeResponse({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
