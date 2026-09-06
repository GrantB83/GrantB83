import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

/**
 * GET /api/tickets
 * 
 * Fetch guest tickets (outlier/exception cases)
 * 
 * Query params:
 * - tenant_id: filter by tenant (default 1)
 * - status: filter by status (new, triaged, staff_notified, in_progress, resolved)
 * - category: filter by category
 * - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')
    const status = searchParams.get('status') || undefined
    const category = searchParams.get('category') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    const db = await getDbAsync()

    let query = `
      SELECT 
        t.*,
        th.from_number,
        th.source,
        b.check_in,
        b.check_out
      FROM guest_tickets t
      LEFT JOIN inbound_threads th ON th.id = t.thread_id
      LEFT JOIN bookings b ON b.id = t.booking_id
      WHERE t.tenant_id = ?
    `

    const params: any[] = [tenantId]

    if (status) {
      query += ` AND t.status = ?`
      params.push(status)
    }

    if (category) {
      query += ` AND t.category = ?`
      params.push(category)
    }

    query += `
      ORDER BY t.created_at DESC
      LIMIT ?
    `
    params.push(limit)

    const tickets = await db.prepare(query).all(...params) as any[]

    // Get stats
    const stats = await db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM guest_tickets
      WHERE tenant_id = ?
      GROUP BY status
    `).all(tenantId) as any[]

    const statusCounts = stats.reduce((acc, row) => {
      acc[row.status] = row.count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      tickets,
      stats: {
        total: tickets.length,
        byStatus: statusCounts
      }
    })

  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tickets
 * 
 * Update ticket status or assignment
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketId, status, assignedTo, staffBriefReady } = body

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'ticketId required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    const updates: string[] = []
    const params: any[] = []

    if (status) {
      updates.push('status = ?')
      params.push(status)
      if (status === 'resolved') {
        updates.push('resolved_at = CURRENT_TIMESTAMP')
      }
    }

    if (assignedTo !== undefined) {
      updates.push('assigned_to = ?')
      params.push(assignedTo)
    }

    if (staffBriefReady !== undefined) {
      updates.push('staff_brief_ready = ?')
      params.push(staffBriefReady ? 1 : 0)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      )
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')

    const query = `
      UPDATE guest_tickets 
      SET ${updates.join(', ')}
      WHERE id = ?
    `
    params.push(ticketId)

    await db.prepare(query).run(...params)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}
