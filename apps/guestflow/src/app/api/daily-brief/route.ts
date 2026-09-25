import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import {
  buildDailyBriefSnapshot,
  flattenBookingsForDate,
  generateWhatsAppBrief,
  johannesburgTodayIso,
  normalizeDate,
  addDaysToDate,
  type RawBookingRow,
} from '@/lib/daily-brief'
import { resolveStaffOpsEnqueueGate } from '@/lib/daily-brief-enqueue'
import { ACTIVE_GUEST_BOOKING_SQL } from '@/lib/booking-filters'
import { attachResolvedPropertyNames, countOwnerBlocksForDate } from '@/lib/property-resolve'

export const dynamic = 'force-dynamic'

/**
 * GET /api/daily-brief
 * Staff ops daily brief from GuestFlow bookings (no NB scrape).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantIdParam = searchParams.get('tenant_id')
    const dateParam = searchParams.get('date')

    if (!tenantIdParam) {
      return NextResponse.json(
        { success: false, error: 'tenant_id is required' },
        { status: 400 }
      )
    }

    const tenantId = parseInt(tenantIdParam, 10)
    if (Number.isNaN(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'tenant_id must be a number' },
        { status: 400 }
      )
    }

    const targetDate = dateParam ? normalizeDate(dateParam) : johannesburgTodayIso()
    const tomorrowDate = addDaysToDate(targetDate, 1)

    const db = await getDbAsync()

    const tenant = (await db
      .prepare('SELECT id, name FROM tenants WHERE id = ?')
      .get(tenantId)) as { id: number; name: string } | undefined

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const rows = (await db
      .prepare(
        `
      SELECT
        b.id,
        b.guest_name,
        b.guest_phone,
        b.check_in,
        b.check_out,
        b.suite_or_unit,
        b.room_number,
        b.property_name,
        b.adults,
        b.children,
        b.notes,
        b.late_check_in,
        b.status
      FROM bookings b
      WHERE b.tenant_id = ?
        AND date(b.check_in) <= date(?)
        AND date(b.check_out) >= date(?)
        AND ${ACTIVE_GUEST_BOOKING_SQL}
      ORDER BY b.check_in ASC, b.guest_name ASC
    `
      )
      .all(tenantId, tomorrowDate, targetDate)) as RawBookingRow[]

    const enrichedRows = await attachResolvedPropertyNames(db, tenantId, rows)
    const snapshot = buildDailyBriefSnapshot(tenant.id, tenant.name, targetDate, enrichedRows)
    snapshot.ownerBlocksToday = await countOwnerBlocksForDate(db, tenantId, targetDate)
    const briefText = generateWhatsAppBrief(snapshot)
    const bookings = flattenBookingsForDate(enrichedRows, targetDate)
    const enqueueGate = await resolveStaffOpsEnqueueGate(db)

    return NextResponse.json({
      success: true,
      tenantId: snapshot.tenantId,
      tenantName: snapshot.tenantName,
      targetDate: snapshot.targetDate,
      tomorrowDate: snapshot.tomorrowDate,
      today: snapshot.today,
      tomorrow: snapshot.tomorrow,
      exceptions: snapshot.exceptions,
      briefText,
      bookings,
      generatedAt: snapshot.generatedAt,
      enqueueSupported: enqueueGate.enqueueSupported,
      enqueueBlocker: enqueueGate.enqueueBlocker,
      approvalQueuePath: enqueueGate.approvalQueuePath,
      fallbackActions: enqueueGate.fallbackActions,
    })
  } catch (error) {
    console.error('GET daily-brief error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build daily brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
