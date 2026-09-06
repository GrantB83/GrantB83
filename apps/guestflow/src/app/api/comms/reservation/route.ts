import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/comms/reservation
 * 
 * Fetch reservation details for a guest
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const guestName = searchParams.get('guest')

    if (!guestName) {
      return NextResponse.json(
        { success: false, error: 'guest parameter required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    const reservation = await db.prepare(`
      SELECT 
        b.id,
        b.guest_name as guestName,
        b.check_in as checkIn,
        b.check_out as checkOut,
        COALESCE(b.property_name, p.name, 'Unknown Property') as property,
        COALESCE(b.suite_or_unit, 'Unknown Suite') as suite,
        b.adults,
        b.children,
        b.guest_phone as phone,
        i.guest_email as email,
        b.status
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN inquiries i ON b.inquiry_id = i.id
      WHERE b.guest_name = ?
      ORDER BY b.check_in DESC
      LIMIT 1
    `).get(guestName) as any

    if (!reservation) {
      return NextResponse.json({
        success: false,
        error: 'No reservation found for guest'
      })
    }

    return NextResponse.json({
      success: true,
      reservation
    })

  } catch (error) {
    console.error('Error fetching reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reservation' },
      { status: 500 }
    )
  }
}
