import { NextRequest, NextResponse } from 'next/server'
import { applyBookingContact, validateContactInput } from '@/lib/contact-apply'
import { ensureContactSchema } from '@/lib/contact-schema'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { ensureUmiSchema } from '@/lib/umi-schema'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const threadId = Number(context.params.id)
  if (!Number.isFinite(threadId)) {
    return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { phone?: string; email?: string }
  const validated = validateContactInput(body)
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const db = await getDbAsync()
  await ensureUmiSchema(db)
  await ensureContactSchema(db)
  const tenantId = await getDefaultTenantIdAsync()
  const thread = (await db
    .prepare(`SELECT id, booking_id FROM inbound_threads WHERE id = ? AND tenant_id = ?`)
    .get(threadId, tenantId)) as { id: number; booking_id: number | null } | undefined
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }
  if (!thread.booking_id) {
    return NextResponse.json({ error: 'Thread is not linked to a booking' }, { status: 400 })
  }

  const booking = (await db
    .prepare(`SELECT guest_name, nightsbridge_booking_id, check_out, suite_or_unit FROM bookings WHERE id = ?`)
    .get(thread.booking_id)) as
    | {
        guest_name: string
        nightsbridge_booking_id: string | null
        check_out: string | null
        suite_or_unit: string | null
      }
    | undefined
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const result = await applyBookingContact(db, {
    tenantId,
    bookingId: thread.booking_id,
    phone: validated.phone,
    email: validated.email,
    source: 'staff',
    sourceRef: `thread:${threadId}`,
    displayName: booking.guest_name,
    lastStayAt: booking.check_out,
    lastSuite: booking.suite_or_unit,
    nbid: booking.nightsbridge_booking_id,
  })

  return NextResponse.json({
    success: true,
    sent: false,
    bookingId: thread.booking_id,
    phoneApplied: result.phoneApplied,
    emailApplied: result.emailApplied,
    phone: result.phone,
    email: result.email,
    emailKind: result.emailKind,
    source: 'staff',
  })
}
