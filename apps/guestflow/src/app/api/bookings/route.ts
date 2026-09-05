import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenant_id')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    const db = await getDbAsync()
    
    let query = `
      SELECT 
        b.id,
        b.guest_name as guestName,
        b.check_in as checkInDate,
        b.check_out as checkOutDate,
        b.suite_or_unit as suiteOrUnit,
        b.property_name as propertyName,
        b.adults,
        b.children,
        b.notes,
        b.late_check_in as lateCheckIn,
        b.guest_phone as guestPhone,
        b.status,
        b.created_at as createdAt,
        p.name as propertyFullName
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    if (tenantId) {
      query += ' AND b.tenant_id = ?'
      params.push(parseInt(tenantId))
    }

    if (status) {
      query += ' AND b.status = ?'
      params.push(status)
    }

    if (fromDate) {
      query += ' AND b.check_in >= ?'
      params.push(fromDate)
    }

    if (toDate) {
      query += ' AND b.check_out <= ?'
      params.push(toDate)
    }

    query += ' ORDER BY b.check_in ASC, b.created_at DESC'

    const stmt = db.prepare(query)
    const bookings = await stmt.all(...params)

    return NextResponse.json({ bookings })
  } catch (error: any) {
    console.error('GET bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, bookings } = await req.json()

    if (!tenant_id || !bookings || !Array.isArray(bookings)) {
      return NextResponse.json(
        { error: 'tenant_id and bookings array are required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    let inserted = 0
    const errors: any[] = []

    const insertStmt = db.prepare(`
      INSERT INTO bookings (
        tenant_id,
        guest_name,
        suite_or_unit,
        check_in,
        check_out,
        adults,
        children,
        notes,
        late_check_in,
        guest_phone,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const booking of bookings) {
      try {
        await insertStmt.run(
          tenant_id,
          booking.guest_name || '',
          booking.suite_or_unit || '',
          booking.check_in || '',
          booking.check_out || '',
          booking.adults || 2,
          booking.children || 0,
          booking.notes || '',
          booking.late_check_in ? 1 : 0,
          booking.guest_phone || '',
          booking.status || 'pending'
        )
        inserted++
      } catch (err: any) {
        errors.push({
          booking: booking.guest_name || 'Unknown',
          error: err.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      errors
    })
  } catch (error: any) {
    console.error('POST bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to save bookings' },
      { status: 500 }
    )
  }
}
