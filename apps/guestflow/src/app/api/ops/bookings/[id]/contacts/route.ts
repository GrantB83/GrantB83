import { NextRequest, NextResponse } from 'next/server'
import { applyBookingContact, validateContactInput } from '@/lib/contact-apply'
import { ensureContactSchema } from '@/lib/contact-schema'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const bookingId = Number(context.params.id)
  if (!Number.isFinite(bookingId)) {
    return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { phone?: string; email?: string }
  const validated = validateContactInput(body)
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const db = await getDbAsync()
  await ensureContactSchema(db)
  const tenantId = await getDefaultTenantIdAsync()
  const booking = (await db
    .prepare(`SELECT id, guest_name, nightsbridge_booking_id, check_out, suite_or_unit FROM bookings WHERE id = ?`)
    .get(bookingId)) as
    | {
        id: number
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
    bookingId,
    phone: validated.phone,
    email: validated.email,
    source: 'staff',
    sourceRef: 'staff-ui',
    displayName: booking.guest_name,
    lastStayAt: booking.check_out,
    lastSuite: booking.suite_or_unit,
    nbid: booking.nightsbridge_booking_id,
  })

  return NextResponse.json({
    success: true,
    sent: false,
    phoneApplied: result.phoneApplied,
    emailApplied: result.emailApplied,
    phone: result.phone,
    email: result.email,
    emailKind: result.emailKind,
    source: 'staff',
  })
}
