import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { waitlistId, tenantId } = await request.json()

    if (!waitlistId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing waitlistId or tenantId' },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Verify the waitlist entry exists and belongs to the tenant
    const entry = db.prepare('SELECT * FROM waitlist WHERE id = ? AND tenant_id = ?').get(waitlistId, tenantId) as any

    if (!entry) {
      return NextResponse.json(
        { error: 'Waitlist entry not found or does not belong to tenant' },
        { status: 404 }
      )
    }

    // Update status to 'converted' to mark as processed into CRM
    const stmt = db.prepare('UPDATE waitlist SET status = ? WHERE id = ?')
    stmt.run('converted', waitlistId)

    return NextResponse.json({ 
      success: true,
      lead: {
        id: entry.id,
        name: entry.name,
        email: entry.email,
        property_name: entry.property_name,
        status: 'converted'
      }
    })
  } catch (error: any) {
    console.error('Waitlist conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
