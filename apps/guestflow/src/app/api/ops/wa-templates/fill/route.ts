import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { fillTemplateVariables, getWaTemplateByName } from '@/lib/wa-templates'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const threadId = Number(request.nextUrl.searchParams.get('threadId'))
  const name = String(request.nextUrl.searchParams.get('name') || '')
  if (!name) {
    return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
  }

  const db = await getDbAsync()
  const tenantId = await getDefaultTenantIdAsync()
  const template = await getWaTemplateByName(db, tenantId, name)
  if (!template) {
    return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
  }

  let guestName: string | null = null
  let suite: string | null = null
  let checkIn: string | null = null
  let checkOut: string | null = null
  let bookingId: number | null = null

  if (threadId) {
    const row = (await db
      .prepare(
        `SELECT t.guest_name, b.guest_name as booking_guest_name, b.suite_or_unit,
                b.check_in, b.check_out, b.id as booking_id
         FROM inbound_threads t
         LEFT JOIN bookings b ON b.id = t.booking_id
         WHERE t.id = ?`
      )
      .get(threadId)) as
      | {
          guest_name?: string
          booking_guest_name?: string
          suite_or_unit?: string
          check_in?: string
          check_out?: string
          booking_id?: number
        }
      | undefined
    if (row) {
      guestName = row.booking_guest_name || row.guest_name || null
      suite = row.suite_or_unit || null
      checkIn = row.check_in || null
      checkOut = row.check_out || null
      bookingId = row.booking_id ? Number(row.booking_id) : null
    }
  }

  const fill = await fillTemplateVariables(db, tenantId, template, {
    guestName,
    suite,
    checkIn,
    checkOut,
    bookingId,
  })

  return NextResponse.json({
    success: true,
    template,
    ...fill,
  })
}
