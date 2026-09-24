import { NextRequest } from 'next/server'
import { fetchAllApprovalItems } from '@/lib/approvals-queue'
import { getDbAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import {
  approveStaffOpsDraft,
  ensureStaffOpsDraftsTable,
  rejectStaffOpsDraft,
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

    const allItems = (await fetchAllApprovalItems(db, tenantId)).map(normalizeApprovalItem)

    const items = allItems.sort(
      (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    )

    return jsonSafeResponse({
      success: true,
      items,
    })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return jsonSafeResponse({ success: false, error: 'Failed to fetch approvals' }, { status: 500 })
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
      return jsonSafeResponse(
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
          return jsonSafeResponse({ success: false, error: 'Staff ops draft not found' }, { status: 404 })
        }
        return jsonSafeResponse({
          success: true,
          status: result.status,
          copyContent: result.copyContent,
          copyOnly: true,
        })
      }

      if (action === 'reject') {
        const rejected = await rejectStaffOpsDraft(db, Number(itemId), actor)
        if (!rejected) {
          return jsonSafeResponse(
            { success: false, error: 'Staff ops draft not found or not pending' },
            { status: 404 }
          )
        }
        return jsonSafeResponse({ success: true, status: 'rejected', copyOnly: true })
      }

      return jsonSafeResponse(
        { success: false, error: 'Unsupported action for staff_ops' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      if (content) {
        await db
          .prepare(
            `
          UPDATE inbound_messages
          SET status = 'approved', draft_reply = ?, draft_source = 'human'
          WHERE id = ?
        `
          )
          .run(content, itemId)
      } else {
        await db
          .prepare(
            `
          UPDATE inbound_messages
          SET status = 'approved'
          WHERE id = ?
        `
          )
          .run(itemId)
      }
      try {
        await db
          .prepare(
            `
          UPDATE inbound_threads
          SET status = 'approved', updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT thread_id FROM inbound_messages WHERE id = ?)
        `
          )
          .run(itemId)
      } catch (error) {
        console.warn('thread approve sync skipped:', error)
      }
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

    return jsonSafeResponse({ success: true })
  } catch (error) {
    console.error('Error updating approval:', error)
    return jsonSafeResponse({ success: false, error: 'Failed to update approval' }, { status: 500 })
  }
}
