import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bookings?tenant_id=N&date=YYYY-MM-DD
 * 
 * Fetch bookings for a tenant, optionally filtered by date for daily brief generation
 * Returns bookings with status derived from date comparison
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Fetch all bookings for tenant with related data
    const bookings = db.prepare(`
      SELECT 
        b.id,
        b.tenant_id,
        b.property_id,
        b.guest_name,
        b.check_in,
        b.check_out,
        b.room_number,
        b.status,
        p.name as property_name,
        i.guest_email,
        i.guest_phone,
        i.adults,
        i.children,
        i.pets,
        i.special_requests
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN inquiries i ON b.inquiry_id = i.id
      WHERE b.tenant_id = ?
      ORDER BY b.check_in ASC
    `).all(tenantId)

    // Derive status based on target date if requested
    const processedBookings = bookings.map((booking: any) => {
      const checkIn = booking.check_in
      const checkOut = booking.check_out
      
      // Derive status relative to target date
      let derivedStatus = booking.status
      if (checkIn === targetDate) {
        derivedStatus = 'arriving'
      } else if (checkOut === targetDate) {
        derivedStatus = 'departing'
      } else if (targetDate > checkIn && targetDate < checkOut) {
        derivedStatus = 'inhouse'
      }

      // Detect late check-in from special requests
      const lateCheckIn = booking.special_requests?.toLowerCase().includes('late') || false

      // Detect missing fields
      const missingFields = []
      if (!booking.guest_email) missingFields.push('email')
      if (!booking.guest_phone) missingFields.push('phone')
      if (!booking.room_number || booking.room_number === 'TBD') missingFields.push('room')

      return {
        ...booking,
        derivedStatus,
        lateCheckIn,
        missingFields
      }
    })

    return NextResponse.json({
      success: true,
      targetDate,
      bookings: processedBookings
    })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
