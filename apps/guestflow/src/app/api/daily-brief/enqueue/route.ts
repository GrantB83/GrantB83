import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import {
  buildDailyBriefSnapshot,
  generateWhatsAppBrief,
  johannesburgTodayIso,
  normalizeDate,
  addDaysToDate,
  type RawBookingRow,
} from '@/lib/daily-brief'
import { resolveStaffOpsEnqueueGate } from '@/lib/daily-brief-enqueue'
import { enqueueStaffOpsDraft } from '@/lib/staff-ops-drafts'

export const dynamic = 'force-dynamic'

/**
 * POST /api/daily-brief/enqueue
 * Enqueue WhatsApp-ready daily brief into staff_ops_drafts (copy-only, no send).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tenantId = parseInt(String(body.tenant_id ?? ''), 10)
    const targetDate = body.target_date
      ? normalizeDate(String(body.target_date))
      : johannesburgTodayIso()
    const force = Boolean(body.force)
    const actor = body.actor ? String(body.actor) : undefined

    if (Number.isNaN(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'tenant_id is required and must be a number' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    const gate = await resolveStaffOpsEnqueueGate(db)

    if (!gate.enqueueSupported) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enqueue not supported',
          enqueueBlocker: gate.enqueueBlocker,
        },
        { status: 503 }
      )
    }

    const tenant = (await db
      .prepare('SELECT id, name FROM tenants WHERE id = ?')
      .get(tenantId)) as { id: number; name: string } | undefined

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    }

    const tomorrowDate = addDaysToDate(targetDate, 1)
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
        b.late_check_in
      FROM bookings b
      WHERE b.tenant_id = ?
        AND date(b.check_in) <= date(?)
        AND date(b.check_out) >= date(?)
      ORDER BY b.check_in ASC, b.guest_name ASC
    `
      )
      .all(tenantId, tomorrowDate, targetDate)) as RawBookingRow[]

    const snapshot = buildDailyBriefSnapshot(tenant.id, tenant.name, targetDate, rows)
    const briefText = generateWhatsAppBrief(snapshot)

    const hasOperations =
      snapshot.today.arrivals.length > 0 ||
      snapshot.today.departures.length > 0 ||
      snapshot.today.inHouse.length > 0 ||
      snapshot.tomorrow.arrivals.length > 0

    if (!briefText.trim() || !hasOperations) {
      return NextResponse.json(
        { success: false, error: 'No operations to enqueue for this date' },
        { status: 409 }
      )
    }

    const result = await enqueueStaffOpsDraft(db, {
      tenantId,
      briefDate: targetDate,
      draftContent: briefText,
      actor,
      force,
    })

    return NextResponse.json(
      {
        success: true,
        draftId: result.draftId,
        status: result.status,
        briefDate: result.briefDate,
        existing: result.existing,
        approvalQueuePath: gate.approvalQueuePath,
      },
      { status: result.existing ? 200 : 201 }
    )
  } catch (error) {
    console.error('POST daily-brief/enqueue error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to enqueue daily brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
