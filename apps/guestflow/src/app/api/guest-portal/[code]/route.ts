import { NextRequest, NextResponse } from 'next/server'
import { ensureContactSchema } from '@/lib/contact-schema'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { hashToken, getStayPhase } from '@/lib/token'
import { CODES_UNRESOLVED_REASON, propertyFacingDetails, resolveAccessCodesForSuite } from '@/lib/property-resolve'
import {
  PORTAL_SSID,
  portalSecurityCopy,
} from '@/lib/portal-security'
import { roomDisplay } from '@/lib/room-catalog'

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
    await ensureContactSchema(db)
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
        b.guest_email as guestEmail,
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
    const security = portalSecurityCopy(booking.checkInDate, booking.checkOutDate)
    const showAccessCodes = security.open

    // Resolve access codes from DB-first with env fallback
    // Extract property and suite from booking data
    const tenantId = await getDefaultTenantIdAsync()
    
    const suite = booking.suiteOrUnit || ''
    const resolvedCodes = await resolveAccessCodesForSuite(db, tenantId, suite)
    const facing = propertyFacingDetails(resolvedCodes.ok ? resolvedCodes.property : null)
    const accessCodes = resolvedCodes.ok ? resolvedCodes.codes : null
    const codesUnresolved = !resolvedCodes.ok
    const propertyDisplayName = facing.displayName
    const propertyAddress = facing.address
    const mapsUrl = facing.mapsUrl
    const parkingInstructions = facing.parkingInstructions || 'Parking details will be provided upon arrival'

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
        suiteOrUnit: roomDisplay(booking.suiteOrUnit, { mappingGap: codesUnresolved }).displayName,
        propertyName: propertyDisplayName,
        adults: booking.adults || 2,
        children: booking.children || 0,
        notes: booking.notes || '',
        guestPhone: booking.guestPhone || '',
        guestEmail: booking.guestEmail || ''
      },
      property: {
        name: propertyDisplayName,
        displayName: propertyDisplayName,
        location: 'Dullstroom, Mpumalanga, South Africa',
        address: propertyAddress,
        mapsUrl: mapsUrl || '',
        contact: {
          // IMPORTANT: Use real contact details from environment or config
          // Never invent phone numbers or emails
          phone: process.env.PROPERTY_PHONE || '',
          email: process.env.PROPERTY_CONTACT_EMAIL || process.env.PROPERTY_EMAIL || 'stay@thebrowns.co.za',
          whatsapp: process.env.PROPERTY_OPS_WHATSAPP || process.env.PROPERTY_WHATSAPP || ''
        }
      },
      rooms: [
        roomDisplay(booking.suiteOrUnit, { mappingGap: codesUnresolved }),
      ],
      stayPacket: {
        securityOpen: showAccessCodes,
        wifi: {
          network: showAccessCodes ? PORTAL_SSID : '',
          password: showAccessCodes ? (accessCodes?.wifi.password || '') : '',
        },
        accessCodes: {
          available: showAccessCodes && !codesUnresolved,
          gateCode: showAccessCodes && accessCodes ? accessCodes.gateCode : '',
          doorCode: showAccessCodes && accessCodes ? accessCodes.doorCode : '',
          lockboxCode: showAccessCodes && accessCodes?.lockboxCode ? accessCodes.lockboxCode : '',
          message: security.message,
        },
        needsAttentionReason: codesUnresolved ? CODES_UNRESOLVED_REASON : undefined,
        checkIn: {
          from: '14:00',
          to: ''
        },
        checkOut: {
          by: '10:00'
        },
        parking: {
          // Property-specific parking instructions from Cottage Falcon template
          instructions: parkingInstructions
        },
        // IMPORTANT: Directions should be property-specific and verified
        // Placeholder policy - update when real directions are approved
        directions: process.env.PROPERTY_DIRECTIONS || 'Directions to The Browns will be provided closer to your arrival date.\n\nPlease contact us if you need specific directions or have any questions about finding the property.',
        houseRules: [
          'Check-in: From 14:00 | Check-out: 10:00',
          'Housekeepers available at 279 Blue Crane Drive until 5 PM',
          'Quiet hours: 22:00 - 07:00',
          'No smoking inside the suites',
          'Please respect the property and fellow guests'
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
