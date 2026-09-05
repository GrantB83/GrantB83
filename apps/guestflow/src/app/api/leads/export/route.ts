import { NextResponse } from 'next/server'
import { getDb, getDefaultTenantId } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id') || getDefaultTenantId()

    const db = getDb()
    const leads = db.prepare(`
      SELECT 
        w.id,
        w.name,
        w.email,
        w.property_name,
        w.room_count,
        w.current_system,
        w.phone,
        w.notes,
        w.status,
        w.created_at,
        t.name as tenant_name
      FROM waitlist w
      LEFT JOIN tenants t ON w.tenant_id = t.id
      WHERE w.tenant_id = ? OR w.tenant_id IS NULL
      ORDER BY w.created_at DESC
    `).all(tenantId) as any[]

    const csvHeader = 'ID,Name,Email,Property Name,Room Count,Current System,Phone,Notes,Status,Submitted,Tenant\n'
    const csvRows = leads.map(lead => {
      const fields = [
        lead.id,
        lead.name,
        lead.email,
        lead.property_name,
        lead.room_count,
        lead.current_system || '',
        lead.phone || '',
        (lead.notes || '').replace(/"/g, '""'),
        lead.status || 'new',
        new Date(lead.created_at).toISOString(),
        lead.tenant_name || ''
      ]
      return fields.map(field => `"${field}"`).join(',')
    }).join('\n')

    const csv = csvHeader + csvRows

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="guestflow-leads-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
