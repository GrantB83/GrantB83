import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { hashToken, getStayPhase, shouldShowAccessCodes } from '@/lib/token'

/**
 * Guest portal access via magic token
 * No authentication required - token itself is the credential
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const token = params.code

    if (!token) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    const tokenHash = hashToken(token)

    // Find token and associated booking
    const result = await db.prepare(`
      SELECT 
        gt.id as tokenId,
        gt.booking_id as bookingId,
        gt.expires_at as expiresAt,
        gt.revoked,
        gt.used_at as usedAt,
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
      FROM guest_tokens gt
      INNER JOIN bookings b ON gt.booking_id = b.id
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE gt.token_hash = ?
    `).get(tokenHash) as any

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid access link' },
        { status: 404 }
      )
    }

    // Check if token is revoked
    if (result.revoked) {
      return NextResponse.json(
        { error: 'This access link has been revoked. Please contact reception for a new link.' },
        { status: 403 }
      )
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(result.expiresAt)
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'This access link has expired. Please contact reception for a new link.' },
        { status: 403 }
      )
    }

    // Update last accessed timestamp and mark as used if first time
    if (!result.usedAt) {
      await db.prepare(`
        UPDATE guest_tokens 
        SET used_at = datetime('now'), last_accessed_at = datetime('now')
        WHERE id = ?
      `).run(result.tokenId)
    } else {
      await db.prepare(`
        UPDATE guest_tokens 
        SET last_accessed_at = datetime('now')
        WHERE id = ?
      `).run(result.tokenId)
    }

    const booking = result

    // Determine stay phase for time-gating and WEBDIRECT visibility
    const stayPhase = getStayPhase(booking.checkInDate, booking.checkOutDate)
    const showAccessCodes = shouldShowAccessCodes(booking.checkInDate, booking.checkOutDate)

    // Build portal data response
    // IMPORTANT: Never invent WiFi passwords, directions, phone numbers, access codes, or other details
    // Use [PLACEHOLDER] or empty string when data is missing
    // Time-gate access codes to near/during stay window only
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
        accessCodes: {
          // Time-gated: only show from 24h before check-in through checkout
          available: showAccessCodes,
          gateCode: showAccessCodes ? (process.env.PROPERTY_GATE_CODE || '') : '',
          doorCode: showAccessCodes ? (process.env.PROPERTY_DOOR_CODE || '') : '',
          message: showAccessCodes ? '' : 'Access codes will be available 24 hours before your check-in date'
        },
        checkIn: {
          from: '14:00',
          to: '18:00'
        },
        checkOut: {
          by: '10:00'
        },
        parking: {
          // Show parking instructions from NightsBridge/staff facts only
          instructions: process.env.PROPERTY_PARKING || 'Parking details will be provided upon arrival'
        },
        // IMPORTANT: Directions should be property-specific and verified
        // Placeholder policy - update when real directions are approved
        directions: process.env.PROPERTY_DIRECTIONS || 'Directions to The Browns will be provided closer to your arrival date.\n\nPlease contact us if you need specific directions or have any questions about finding the property.',
        houseRules: [
          'Check-in: 14:00 - 18:00 | Check-out: 10:00',
          'Quiet hours: 22:00 - 07:00',
          'No smoking inside the suites',
          'Please respect the property and fellow guests',
          'Report any damages or issues to management immediately'
        ],
        emergencyContact: process.env.EMERGENCY_CONTACT || ''
      },
      // WEBDIRECT booking CTA - only show post-checkout
      // Never show during pre-stay or during-stay phases
      nextStay: stayPhase === 'post-checkout' ? {
        enabled: true,
        title: 'Book Your Next Stay',
        url: 'https://book.nightsbridge.com/24299?promocode=WEBDIRECT',
        message: 'Enjoyed your stay? Book direct and save on your next visit!'
      } : null
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
