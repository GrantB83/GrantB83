import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const tenantId = searchParams.get('tenant_id')
    const day = searchParams.get('day')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
    }

    const db = getDb()

    // If day is specified, filter by arrival/departure/in-house on that day
    if (day) {
      const bookings = db
        .prepare(
          `SELECT * FROM bookings 
           WHERE tenant_id = ? 
           AND (
             check_in = ? OR 
             check_out = ? OR 
             (check_in < ? AND check_out > ?)
           )
           ORDER BY check_in ASC`
        )
        .all(tenantId, day, day, day, day)

      return NextResponse.json({ bookings })
    }

    // Otherwise return all bookings for tenant
    const bookings = db
      .prepare('SELECT * FROM bookings WHERE tenant_id = ? ORDER BY check_in ASC')
      .all(tenantId)

    return NextResponse.json({ bookings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id, bookings } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
    }

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return NextResponse.json({ error: 'bookings array required' }, { status: 400 })
    }

    const db = getDb()

    const insert = db.prepare(
      `INSERT INTO bookings 
       (tenant_id, guest_name, check_in, check_out, suite_or_unit, adults, children, notes, late_check_in, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const inserted = []
    const errors = []

    for (const booking of bookings) {
      try {
        if (!booking.guestName || !booking.checkInDate || !booking.checkOutDate) {
          errors.push({
            guest: booking.guestName || 'Unknown',
            field: !booking.guestName ? 'guestName' : !booking.checkInDate ? 'checkInDate' : 'checkOutDate',
            reason: 'Required field missing',
          })
          continue
        }

        const result = insert.run(
          tenant_id,
          booking.guestName,
          booking.checkInDate,
          booking.checkOutDate,
          booking.suiteOrUnit || null,
          booking.adults || 2,
          booking.children || 0,
          booking.notes || null,
          booking.lateCheckIn ? 1 : 0,
          booking.status || ''
        )

        inserted.push({ id: result.lastInsertRowid, ...booking })
      } catch (err: any) {
        errors.push({
          guest: booking.guestName || 'Unknown',
          field: 'database',
          reason: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      errors: errors.length > 0 ? errors : undefined,
      bookings: inserted,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
