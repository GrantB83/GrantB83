import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import {
  approveStaffOpsDraft,
  ensureStaffOpsDraftsTable,
  rejectStaffOpsDraft,
  staffOpsDraftsTableExists,
} from '@/lib/staff-ops-drafts'

export const dynamic = 'force-dynamic'

function normalizeApprovalItem(item: Record<string, unknown>) {
  const metadata =
    typeof item.metadata === 'string'
      ? JSON.parse(item.metadata as string)
      : (item.metadata as Record<string, unknown>) || {}

  const guestPhone = (item.guest_phone as string | null) ?? null

  return {
    id: item.id,
    type: item.type,
    guest: item.guest,
    draftContent: item.draft_content,
    source: item.source,
    createdAt: item.created_at,
    priority: item.priority,
    guestPhone,
    metadata: {
      ...metadata,
      guest_phone: guestPhone,
      from_number: guestPhone,
    },
  }
}

/**
 * GET /api/approvals
 *
 * Fetch approval queue items including copy-only staff_ops drafts.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')

    const db = await getDbAsync()

    const inboundItems = (await db
      .prepare(
        `
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
    `
      )
      .all(tenantId)) as Record<string, unknown>[]

    const ticketItems = (await db
      .prepare(
        `
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
    `
      )
      .all(tenantId)) as Record<string, unknown>[]

    const welcomeItems = (await db
      .prepare(
        `
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
    `
      )
      .all(tenantId)) as Record<string, unknown>[]

    const lateItems = (await db
      .prepare(
        `
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
    `
      )
      .all(tenantId)) as Record<string, unknown>[]

    let staffOpsItems: Record<string, unknown>[] = []
    if (await staffOpsDraftsTableExists(db)) {
      staffOpsItems = (await db
        .prepare(
          `
        SELECT 
          id,
          'staff_ops' as type,
          'Daily brief ' || brief_date as guest,
          draft_content,
          'daily-brief' as source,
          created_at,
          'medium' as priority,
          NULL as guest_phone,
          json_object('copy_only', 1, 'brief_date', brief_date) as metadata
        FROM staff_ops_drafts
        WHERE tenant_id = ? AND status = 'pending_approval'
        ORDER BY created_at DESC
      `
        )
        .all(tenantId)) as Record<string, unknown>[]
    }

    const allItems = [
      ...inboundItems,
      ...ticketItems,
      ...welcomeItems,
      ...lateItems,
      ...staffOpsItems,
    ].map(normalizeApprovalItem)

    const items = allItems.sort(
      (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    )

    return NextResponse.json({
      success: true,
      items,
    })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

/**
 * PATCH /api/approvals
 *
 * Take action on an approval item. staff_ops returns copyContent only — never WhatsApp send.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, action, content, actor, type } = body

    if (!itemId || !action) {
      return NextResponse.json(
        { success: false, error: 'itemId and action required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    try {
      await db
        .prepare(
          `
      INSERT INTO audit_log (tenant_id, actor, action, item_type, item_id, content_before, content_after, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
        )
        .run(1, actor || 'System', action, type || 'approval', itemId, '', content || '')
    } catch (auditError) {
      console.warn('audit_log insert skipped:', auditError)
    }

    if (type === 'staff_ops') {
      await ensureStaffOpsDraftsTable(db)

      if (action === 'approve') {
        const result = await approveStaffOpsDraft(db, Number(itemId), actor)
        if (!result) {
          return NextResponse.json({ success: false, error: 'Staff ops draft not found' }, { status: 404 })
        }
        return NextResponse.json({
          success: true,
          status: result.status,
          copyContent: result.copyContent,
          copyOnly: true,
        })
      }

      if (action === 'reject') {
        const rejected = await rejectStaffOpsDraft(db, Number(itemId), actor)
        if (!rejected) {
          return NextResponse.json(
            { success: false, error: 'Staff ops draft not found or not pending' },
            { status: 404 }
          )
        }
        return NextResponse.json({ success: true, status: 'rejected', copyOnly: true })
      }

      return NextResponse.json(
        { success: false, error: 'Unsupported action for staff_ops' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      await db
        .prepare(
          `
        UPDATE inbound_messages
        SET status = 'approved'
        WHERE id = ?
      `
        )
        .run(itemId)
    } else if (action === 'reject') {
      await db
        .prepare(
          `
        UPDATE inbound_messages
        SET status = 'rejected'
        WHERE id = ?
      `
        )
        .run(itemId)
    } else if (action === 'escalate') {
      await db
        .prepare(
          `
        UPDATE inbound_messages
        SET status = 'escalated'
        WHERE id = ?
      `
        )
        .run(itemId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating approval:', error)
    return NextResponse.json({ success: false, error: 'Failed to update approval' }, { status: 500 })
  }
}
