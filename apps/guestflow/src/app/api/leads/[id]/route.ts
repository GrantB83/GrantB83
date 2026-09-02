import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    const leadId = parseInt(params.id)

    if (!status || !['new', 'contacted', 'qualified', 'won', 'lost'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const db = getDb()
    const stmt = db.prepare('UPDATE waitlist SET status = ? WHERE id = ?')
    const result = stmt.run(status, leadId)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lead update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
