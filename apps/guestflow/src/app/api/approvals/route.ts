import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/approvals
 * 
 * Fetch approval queue items
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')

    const db = await getDbAsync()

    // Fetch inbound drafted messages
    const inboundItems = await db.prepare(`
      SELECT 
        id,
        'inbound' as type,
        COALESCE(from_name, from_number, 'Unknown') as guest,
        draft_reply as draft_content,
        'WhatsApp inbound' as source,
        timestamp as created_at,
        'medium' as priority,
        from_number as guest_phone,
        '{}' as metadata
      FROM inbound_messages
      WHERE tenant_id = ? AND status = 'drafted' AND draft_reply IS NOT NULL
      ORDER BY timestamp DESC
    `).all(tenantId) as any[]

    // Fetch guest tickets needing approval
    const ticketItems = await db.prepare(`
      SELECT 
        id,
        CASE WHEN guest_draft_reply IS NOT NULL THEN 'ticket_guest' ELSE 'ticket_staff' END as type,
        guest_name as guest,
        COALESCE(guest_draft_reply, staff_brief) as draft_content,
        category as source,
        created_at,
        CASE WHEN priority = 'high' THEN 'high' ELSE 'medium' END as priority,
        guest_phone,
        '{}' as metadata
      FROM guest_tickets
      WHERE tenant_id = ? AND status IN ('new', 'triaged')
        AND (guest_draft_reply IS NOT NULL OR staff_brief IS NOT NULL)
      ORDER BY created_at DESC
    `).all(tenantId) as any[]

    // P1: Fetch welcome drafts (auto-enqueued from NB ingest)
    const welcomeItems = await db.prepare(`
      SELECT 
        id,
        'welcome' as type,
        guest_name as guest,
        draft_message as draft_content,
        source,
        created_at,
        'medium' as priority,
        guest_phone,
        '{}' as metadata
      FROM welcome_drafts
      WHERE tenant_id = ? AND status = 'pending_approval'
      ORDER BY created_at DESC
    `).all(tenantId) as any[]

    // P1: Fetch late check-in drafts
    const lateItems = await db.prepare(`
      SELECT 
        id,
        'late_checkin' as type,
        guest_name as guest,
        draft_message as draft_content,
        source,
        created_at,
        'high' as priority,
        guest_phone,
        '{}' as metadata
      FROM late_checkin_drafts
      WHERE tenant_id = ? AND status = 'pending_approval'
      ORDER BY created_at DESC
    `).all(tenantId) as any[]

    // Merge all items with phone metadata
    const allItems = [...inboundItems, ...ticketItems, ...welcomeItems, ...lateItems].map(item => ({
      ...item,
      metadata: { guest_phone: item.guest_phone, from_number: item.guest_phone }
    }))

    const items = allItems.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      success: true,
      items
    })

  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/approvals
 * 
 * Take action on an approval item
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, action, content, actor } = body

    if (!itemId || !action) {
      return NextResponse.json(
        { success: false, error: 'itemId and action required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    // Log the action in audit log
    await db.prepare(`
      INSERT INTO audit_log (tenant_id, actor, action, item_type, item_id, content_before, content_after, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(1, actor || 'System', action, 'approval', itemId, '', content || '')

    // Update the item based on action
    if (action === 'approve') {
      await db.prepare(`
        UPDATE inbound_messages
        SET status = 'approved'
        WHERE id = ?
      `).run(itemId)
    } else if (action === 'reject') {
      await db.prepare(`
        UPDATE inbound_messages
        SET status = 'rejected'
        WHERE id = ?
      `).run(itemId)
    } else if (action === 'escalate') {
      await db.prepare(`
        UPDATE inbound_messages
        SET status = 'escalated'
        WHERE id = ?
      `).run(itemId)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating approval:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update approval' },
      { status: 500 }
    )
  }
}
