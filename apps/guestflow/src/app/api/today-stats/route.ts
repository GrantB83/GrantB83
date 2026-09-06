import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { startOfDay, endOfDay, addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * GET /api/today-stats
 * 
 * Fetch today's dashboard stats: approvals, exceptions, next 24h, NB freshness, AI activity
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')

    const db = await getDbAsync()

    // Approvals - get drafted items needing approval
    const draftedInbound = await db.prepare(`
      SELECT COUNT(*) as count
      FROM inbound_messages
      WHERE tenant_id = ? AND is_classified = 1 AND draft_reply IS NOT NULL AND status = 'drafted'
    `).get(tenantId) as any

    const draftedInboundItems = await db.prepare(`
      SELECT 
        'Inbound' as type,
        COALESCE(from_name, from_number) as guest,
        id
      FROM inbound_messages
      WHERE tenant_id = ? AND is_classified = 1 AND draft_reply IS NOT NULL AND status = 'drafted'
      ORDER BY timestamp DESC
      LIMIT 5
    `).all(tenantId) as any[]

    // Exceptions - get active tickets
    const exceptions = await db.prepare(`
      SELECT COUNT(*) as count
      FROM guest_tickets
      WHERE tenant_id = ? AND status IN ('new', 'triaged', 'in_progress')
    `).get(tenantId) as any

    const exceptionItems = await db.prepare(`
      SELECT 
        category,
        guest_name as guest,
        id
      FROM guest_tickets
      WHERE tenant_id = ? AND status IN ('new', 'triaged', 'in_progress')
      ORDER BY created_at DESC
      LIMIT 5
    `).all(tenantId) as any[]

    // Next 24h bookings
    const now = new Date()
    const tomorrow = addDays(now, 1)
    const todayStart = startOfDay(now).toISOString().split('T')[0]
    const tomorrowEnd = endOfDay(tomorrow).toISOString().split('T')[0]

    const arriving = await db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE tenant_id = ? AND check_in >= ? AND check_in <= ?
    `).get(tenantId, todayStart, tomorrowEnd) as any

    const departing = await db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE tenant_id = ? AND check_out >= ? AND check_out <= ?
    `).get(tenantId, todayStart, tomorrowEnd) as any

    const inHouse = await db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE tenant_id = ? AND check_in <= ? AND check_out >= ?
    `).get(tenantId, todayStart, todayStart) as any

    // NightsBridge freshness
    const lastSync = await db.prepare(`
      SELECT MAX(created_at) as last_sync
      FROM bookings
      WHERE tenant_id = ?
    `).get(tenantId) as any

    let nbFreshness: { lastSync: string | null; hoursAgo: number | null; status: 'fresh' | 'stale' | 'missing' }
    if (lastSync?.last_sync) {
      const syncTime = new Date(lastSync.last_sync)
      const hoursAgo = (now.getTime() - syncTime.getTime()) / (1000 * 60 * 60)
      
      nbFreshness = {
        lastSync: lastSync.last_sync,
        hoursAgo,
        status: hoursAgo < 12 ? 'fresh' : 'stale'
      }
    } else {
      nbFreshness = {
        lastSync: null,
        hoursAgo: null,
        status: 'missing'
      }
    }

    // AI Activity (recent classifications, drafts created)
    const aiActivity = [
      {
        action: 'Classified inbound messages',
        count: draftedInbound.count || 0,
        timestamp: 'Last hour'
      }
    ]

    return NextResponse.json({
      success: true,
      stats: {
        approvals: {
          count: (draftedInbound.count || 0),
          items: draftedInboundItems
        },
        exceptions: {
          count: exceptions.count || 0,
          items: exceptionItems.map((item: any) => ({
            category: item.category || 'Unknown',
            guest: item.guest || 'Unknown',
            id: item.id
          }))
        },
        next24h: {
          arriving: arriving.count || 0,
          departing: departing.count || 0,
          inHouse: inHouse.count || 0
        },
        nbFreshness,
        aiActivity
      }
    })

  } catch (error) {
    console.error('Error fetching today stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today stats' },
      { status: 500 }
    )
  }
}
