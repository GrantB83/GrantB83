import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { lastName } = await req.json()
    const code = params.code

    if (!code || !lastName) {
      return NextResponse.json(
        { error: 'Booking code and last name are required' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Find booking by code (booking ID) and last name match
    const booking = db.prepare(`
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
        b.guest_phone as guestPhone,
        p.name as propertyFullName,
        p.location as propertyLocation
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE b.id = ? OR CAST(b.id AS TEXT) = ?
    `).get(parseInt(code) || 0, code) as any

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify last name matches (case-insensitive, check if provided last name is in guest name)
    const guestNameLower = booking.guestName?.toLowerCase() || ''
    const lastNameLower = lastName.toLowerCase().trim()
    
    if (!guestNameLower.includes(lastNameLower)) {
      return NextResponse.json(
        { error: 'Invalid booking reference or last name' },
        { status: 403 }
      )
    }

    // Build portal data response
    // IMPORTANT: Never invent WiFi passwords, directions, phone numbers, or other details
    // Use [PLACEHOLDER] or empty string when data is missing
    const portalData = {
      booking: {
        id: booking.id,
        guestName: booking.guestName || '[GUEST NAME MISSING]',
        checkInDate: booking.checkInDate || '',
        checkOutDate: booking.checkOutDate || '',
        suiteOrUnit: booking.suiteOrUnit || '',
        propertyName: booking.propertyName || 'The Browns Luxury Guest Suites',
        adults: booking.adults || 2,
        children: booking.children || 0,
        notes: booking.notes || '',
        guestPhone: booking.guestPhone || ''
      },
      property: {
        name: 'The Browns Luxury Guest Suites',
        displayName: "The Browns' Dullstroom",
        location: 'Dullstroom, Mpumalanga, South Africa',
        contact: {
          // IMPORTANT: Use real contact details from environment or config
          // Never invent phone numbers or emails
          phone: process.env.PROPERTY_PHONE || '',
          email: process.env.PROPERTY_EMAIL || 'grant@thebrowns.co.za',
          whatsapp: process.env.PROPERTY_WHATSAPP || ''
        }
      },
      stayPacket: {
        wifi: {
          // IMPORTANT: WiFi credentials should be stored in environment variables
          // or property-specific configuration. Never hardcode or invent.
          // Empty string will trigger [WIFI DETAILS PENDING] message in UI
          network: process.env.WIFI_NETWORK || '',
          password: process.env.WIFI_PASSWORD || ''
        },
        checkIn: {
          from: '14:00',
          to: '18:00'
        },
        checkOut: {
          by: '10:00'
        },
        // IMPORTANT: Directions should be property-specific and verified
        // Placeholder policy - update when real directions are approved
        directions: process.env.PROPERTY_DIRECTIONS || `Directions to The Browns will be provided closer to your arrival date.

Please contact us if you need specific directions or have any questions about finding the property.`,
        houseRules: [
          'Check-in: 14:00 - 18:00 | Check-out: 10:00',
          'Quiet hours: 22:00 - 07:00',
          'No smoking inside the suites',
          'Please respect the property and fellow guests',
          'Report any damages or issues to management immediately'
        ],
        emergencyContact: process.env.EMERGENCY_CONTACT || ''
      }
    }

    return NextResponse.json(portalData)

  } catch (error: any) {
    console.error('Guest portal error:', error)
    return NextResponse.json(
      { error: 'Unable to load booking details' },
      { status: 500 }
    )
  }
}
