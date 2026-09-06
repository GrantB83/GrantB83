import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { format, parseISO } from 'date-fns'

/**
 * GET /api/inbound/queue
 * 
 * Fetch inbound message queue for ops review
 * 
 * Query params:
 * - tenant_id: filter by tenant (default 1)
 * - status: filter by status (new, classified, drafted, approved, sent, failed, closed)
 * - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    const db = await getDbAsync()

    // Build query
    let query = `
      SELECT 
        t.id as thread_id,
        t.from_number,
        t.guest_name,
        t.source,
        t.intent,
        t.confidence,
        t.status,
        t.assigned_to,
        t.first_message_at,
        t.last_message_at,
        t.metadata,
        COUNT(m.id) as message_count,
        MAX(m.message_timestamp) as latest_message_time
      FROM inbound_threads t
      LEFT JOIN inbound_messages m ON m.thread_id = t.id
      WHERE t.tenant_id = ?
    `

    const params: any[] = [tenantId]

    if (status) {
      query += ` AND t.status = ?`
      params.push(status)
    }

    query += `
      GROUP BY t.id
      ORDER BY t.last_message_at DESC
      LIMIT ?
    `
    params.push(limit)

    const threads = await db.prepare(query).all(...params) as any[]

    // For each thread, get the latest message and classification
    const enrichedThreads = await Promise.all(
      threads.map(async (thread) => {
        // Get latest message
        const latestMessage = await db.prepare(`
          SELECT 
            id, message_text, message_timestamp, 
            is_classified, draft_reply
          FROM inbound_messages
          WHERE thread_id = ?
          ORDER BY message_timestamp DESC
          LIMIT 1
        `).get(thread.thread_id) as any

        // Get latest classification
        const latestClassification = await db.prepare(`
          SELECT 
            intent, confidence, extracted_data, missing_fields
          FROM message_classifications
          WHERE thread_id = ?
          ORDER BY classified_at DESC
          LIMIT 1
        `).get(thread.thread_id) as any

        return {
          threadId: thread.thread_id,
          fromNumber: thread.from_number,
          guestName: thread.guest_name,
          source: thread.source,
          intent: thread.intent,
          confidence: thread.confidence,
          status: thread.status,
          assignedTo: thread.assigned_to,
          firstMessageAt: thread.first_message_at,
          lastMessageAt: thread.last_message_at,
          messageCount: thread.message_count,
          latestMessage: latestMessage ? {
            id: latestMessage.id,
            text: latestMessage.message_text,
            timestamp: latestMessage.message_timestamp,
            isClassified: latestMessage.is_classified,
            draftReply: latestMessage.draft_reply
          } : null,
          classification: latestClassification ? {
            intent: latestClassification.intent,
            confidence: latestClassification.confidence,
            extractedData: latestClassification.extracted_data ? 
              JSON.parse(latestClassification.extracted_data) : {},
            missingFields: latestClassification.missing_fields ?
              JSON.parse(latestClassification.missing_fields) : []
          } : null,
          metadata: thread.metadata ? JSON.parse(thread.metadata) : {}
        }
      })
    )

    // Get stats
    const stats = await db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM inbound_threads
      WHERE tenant_id = ?
      GROUP BY status
    `).all(tenantId) as any[]

    const statusCounts = stats.reduce((acc, row) => {
      acc[row.status] = row.count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      threads: enrichedThreads,
      stats: {
        total: enrichedThreads.length,
        byStatus: statusCounts
      }
    })

  } catch (error) {
    console.error('Error fetching inbound queue:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbound queue' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/inbound/queue
 * 
 * Update thread status or assignment
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { threadId, status, assignedTo } = body

    if (!threadId) {
      return NextResponse.json(
        { success: false, error: 'threadId required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    const updates: string[] = []
    const params: any[] = []

    if (status) {
      updates.push('status = ?')
      params.push(status)
    }

    if (assignedTo !== undefined) {
      updates.push('assigned_to = ?')
      params.push(assignedTo)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      )
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')

    const query = `
      UPDATE inbound_threads 
      SET ${updates.join(', ')}
      WHERE id = ?
    `
    params.push(threadId)

    await db.prepare(query).run(...params)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating thread:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update thread' },
      { status: 500 }
    )
  }
}
