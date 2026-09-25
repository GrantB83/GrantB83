import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { inferCheckinStatuses, generateLateCheckinInstructions } from '@/lib/checkin-inference'
import { ACTIVE_GUEST_BOOKING_SQL, isActiveGuestBooking } from '@/lib/booking-filters'
import { johannesburgTodayIso } from '@/lib/daily-brief'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checkin-status
 * 
 * Get check-in statuses for today's arrivals
 * Infers who has/hasn't checked in from guests group context + bookings
 * 
 * Query params:
 * - tenant_id: filter by tenant (default 1)
 * - date: date to check (default today)
 * - needs_late_checkin: filter only guests needing late check-in instructions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')
    const date = searchParams.get('date') || johannesburgTodayIso()
    const needsLateCheckinOnly = searchParams.get('needs_late_checkin') === 'true'

    const db = await getDbAsync()

    // Get bookings for the specified date (active guests only, SAST date)
    const rawBookings = await db.prepare(`
      SELECT * FROM bookings
      WHERE tenant_id = ?
      AND substr(check_in, 1, 10) = ?
      AND ${ACTIVE_GUEST_BOOKING_SQL}
      ORDER BY check_in ASC
    `).all(tenantId, date) as any[]
    const bookings = rawBookings.filter(isActiveGuestBooking)

    // Get check-in events for these bookings
    const bookingIds = bookings.map(b => b.id)
    let events: any[] = []

    if (bookingIds.length > 0) {
      const placeholders = bookingIds.map(() => '?').join(',')
      events = await db.prepare(`
        SELECT * FROM guest_checkin_events
        WHERE tenant_id = ?
        AND (booking_id IN (${placeholders}) OR event_timestamp >= ?)
        ORDER BY event_timestamp DESC
      `).all(tenantId, ...bookingIds, `${date}T00:00:00Z`) as any[]
    }

    // Infer check-in statuses
    const statuses = inferCheckinStatuses(bookings, events)

    // Filter if only late check-in needed
    let filteredStatuses = statuses
    if (needsLateCheckinOnly) {
      filteredStatuses = statuses.filter(s => s.needsLateCheckinInstructions)
    }

    // Generate late check-in instructions for those who need it
    const statusesWithInstructions = filteredStatuses.map(status => ({
      ...status,
      lateCheckinInstructions: status.needsLateCheckinInstructions 
        ? generateLateCheckinInstructions(status)
        : null
    }))

    return NextResponse.json({
      success: true,
      date,
      statuses: statusesWithInstructions,
      stats: {
        total: statuses.length,
        unknown: statuses.filter(s => s.checkinStatus === 'unknown').length,
        notArrived: statuses.filter(s => s.checkinStatus === 'not_arrived').length,
        arrived: statuses.filter(s => s.checkinStatus === 'arrived').length,
        inHouse: statuses.filter(s => s.checkinStatus === 'in_house').length,
        late: statuses.filter(s => s.checkinStatus === 'late').length,
        needsLateInstructions: statuses.filter(s => s.needsLateCheckinInstructions).length
      }
    })

  } catch (error) {
    console.error('Error fetching check-in statuses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch check-in statuses' },
      { status: 500 }
    )
  }
}
