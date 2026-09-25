import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/exceptions
 *
 * Fetch exception items using live guest_tickets columns only.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')
    const status = searchParams.get('status')

    const db = await getDbAsync()

    let query = `
      SELECT 
        id,
        category,
        priority,
        guest_name as guest,
        subject,
        description,
        staff_brief,
        guest_draft_reply,
        assigned_to,
        status,
        created_at
      FROM guest_tickets
      WHERE tenant_id = ?
    `

    const params: any[] = [tenantId]

    if (status) {
      query += ` AND status = ?`
      params.push(status)
    } else {
      query += ` AND status IN ('new', 'triaged', 'in_progress')`
    }

    query += ` ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        ELSE 3 
      END,
      created_at DESC
    `

    const exceptions = await db.prepare(query).all(...params) as any[]

    return NextResponse.json({
      success: true,
      exceptions: exceptions.map(ex => ({
        id: ex.id,
        category: ex.category || 'general_problem',
        priority: ex.priority || 'medium',
        guest: ex.guest || 'Unknown',
        whatAsked: ex.subject || ex.description || 'No description',
        whatAiFound: ex.staff_brief || 'No context found',
        whyStopped: ex.description || ex.staff_brief || 'Exception raised',
        nextStep: ex.staff_brief || 'Manual review required',
        status: ex.status,
        createdAt: ex.created_at,
        metadata: {},
      }))
    })

  } catch (error) {
    console.error('Error fetching exceptions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exceptions' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/exceptions
 *
 * Update exception status. audit_log is optional.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { exceptionId, status } = body

    if (!exceptionId || !status) {
      return NextResponse.json(
        { success: false, error: 'exceptionId and status required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    await db.prepare(`
      UPDATE guest_tickets
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, exceptionId)

    try {
      await db.prepare(`
        INSERT INTO audit_log (tenant_id, actor, action, item_type, item_id, content_before, content_after, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(1, 'Grant', `status_change_${status}`, 'exception', exceptionId, '', status)
    } catch {
      // audit_log is not on the live Turso schema
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating exception:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update exception' },
      { status: 500 }
    )
  }
}
