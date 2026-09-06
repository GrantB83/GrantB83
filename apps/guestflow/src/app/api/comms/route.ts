import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/comms
 * 
 * Fetch unified communications timeline
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')

    const db = await getDbAsync()

    // Fetch inbound and outbound messages
    const messages = await db.prepare(`
      SELECT 
        id,
        timestamp,
        'inbound' as direction,
        'whatsapp' as channel,
        text as content,
        COALESCE(from_name, from_number, 'Unknown') as sender,
        CASE WHEN draft_reply IS NOT NULL AND status = 'drafted' THEN 'draft' ELSE 'delivered' END as status
      FROM inbound_messages
      WHERE tenant_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).all(tenantId) as any[]

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Error fetching comms:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}
