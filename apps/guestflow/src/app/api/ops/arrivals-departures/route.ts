import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenant_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'from and to dates are required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    
    // Base query for both arrivals and departures
    const baseQuery = `
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

    // Query for arrivals: check_in between from and to
    let arrivalsQuery = baseQuery
    const arrivalsParams: any[] = []

    if (tenantId) {
      arrivalsQuery += ' AND b.tenant_id = ?'
      arrivalsParams.push(parseInt(tenantId))
    }

    // Filter by check_in date within range
    arrivalsQuery += ' AND b.check_in >= ? AND b.check_in <= ?'
    arrivalsParams.push(from, to)

    // Exclude cancelled by default
    arrivalsQuery += ' AND b.status != ?'
    arrivalsParams.push('cancelled')

    // Sort by check_in ASC, then property, then suite
    arrivalsQuery += ' ORDER BY b.check_in ASC, b.property_name ASC, b.suite_or_unit ASC'

    // Query for departures: check_out between from and to
    let departuresQuery = baseQuery
    const departuresParams: any[] = []

    if (tenantId) {
      departuresQuery += ' AND b.tenant_id = ?'
      departuresParams.push(parseInt(tenantId))
    }

    // Filter by check_out date within range
    departuresQuery += ' AND b.check_out >= ? AND b.check_out <= ?'
    departuresParams.push(from, to)

    // Exclude cancelled by default
    departuresQuery += ' AND b.status != ?'
    departuresParams.push('cancelled')

    // Sort by check_out ASC, then property, then suite
    departuresQuery += ' ORDER BY b.check_out ASC, b.property_name ASC, b.suite_or_unit ASC'

    // Execute queries
    const arrivalsStmt = db.prepare(arrivalsQuery)
    const arrivals = await arrivalsStmt.all(...arrivalsParams)

    const departuresStmt = db.prepare(departuresQuery)
    const departures = await departuresStmt.all(...departuresParams)

    return NextResponse.json({ arrivals, departures })
  } catch (error: any) {
    // Never log guest_phone or PII
    console.error('GET arrivals-departures error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch arrivals and departures' },
      { status: 500 }
    )
  }
}
