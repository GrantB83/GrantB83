import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/exceptions
 * 
 * Fetch exception items (missing rate cards, timeouts, tickets)
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
        problem_description as what_asked,
        context_found as what_ai_found,
        reason_stopped as why_stopped,
        suggested_next_step as next_step,
        status,
        created_at,
        metadata
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
        whatAsked: ex.what_asked || 'No description',
        whatAiFound: ex.what_ai_found || 'No context found',
        whyStopped: ex.why_stopped || 'Exception raised',
        nextStep: ex.next_step || 'Manual review required',
        status: ex.status,
        createdAt: ex.created_at,
        metadata: ex.metadata ? JSON.parse(ex.metadata) : {}
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
 * Update exception status
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

    // Log the action
    await db.prepare(`
      INSERT INTO audit_log (tenant_id, actor, action, item_type, item_id, content_before, content_after, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(1, 'Grant', `status_change_${status}`, 'exception', exceptionId, '', status)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating exception:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update exception' },
      { status: 500 }
    )
  }
}
