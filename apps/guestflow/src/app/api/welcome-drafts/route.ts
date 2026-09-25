import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { format, parseISO, addDays, isWithinInterval } from 'date-fns'
import { generateGuestToken, calculateTokenExpiry } from '@/lib/token'
import { getGuestPortalUrl } from '@/lib/portal-url'
import { CODES_UNRESOLVED_REASON, propertyFacingDetails, resolveAccessCodesForSuite } from '@/lib/property-resolve'

export const dynamic = 'force-dynamic'

interface Booking {
  id: number
  tenant_id: number
  guest_name: string
  guest_phone: string | null
  check_in: string
  check_out: string
  room_number: string | null
  suite_or_unit: string | null
  status: string
  property_id: number | null
}

interface Property {
  id: number
  name: string
  location: string
}

interface WelcomeDraft {
  id: number
  guestName: string
  checkIn: string
  checkOut: string
  property: string
  roomNumber: string | null
  message: string
  missingFields: string[]
  portalUrl?: string
  gateCode?: string
  doorCode?: string
  lockboxCode?: string
}

async function generateWelcomeMessage(
  booking: Booking, 
  property: Property | null, 
  portalUrl?: string,
  db?: any,
  tenantId?: number
): Promise<{ message: string, missingFields: string[], gateCode?: string, doorCode?: string, lockboxCode?: string, wifiNetwork?: string, wifiPassword?: string }> {
  const missingFields: string[] = []
  
  // Grant Law (CoS 6 Sep 2026): NEVER include [GUEST_PHONE] or [RATE CARD REQUIRED] in guest-facing WhatsApp draft bodies
  // Missing phone → track in missingFields for ops; resolve from NB booking detail before CoS Admin post
  // Missing rate → not tracked in welcome drafts at all; rate cards are ops/pricing only, not a welcome gap
  
  // Track missing phone ONLY when actually missing (for blocking in queue)
  if (!booking.guest_phone || booking.guest_phone.trim() === '') {
    missingFields.push('guest_phone')
  }

  const checkInDate = parseISO(booking.check_in)
  const checkOutDate = parseISO(booking.check_out)
  const checkInFormatted = format(checkInDate, 'EEEE, d MMM yyyy')
  const checkOutFormatted = format(checkOutDate, 'EEEE, d MMM yyyy')
  
  const suite = booking.room_number || booking.suite_or_unit || ''
  let gateCode: string | undefined
  let doorCode: string | undefined
  let lockboxCode: string | undefined
  let wifiNetwork: string | undefined
  let wifiPassword: string | undefined
  let codesUnresolved = false
  let facing = propertyFacingDetails(null)

  if (db && tenantId) {
    try {
      const resolved = await resolveAccessCodesForSuite(db, tenantId, suite)
      if (resolved.ok) {
        facing = propertyFacingDetails(resolved.property)
        gateCode = resolved.codes.gateCode
        doorCode = resolved.codes.doorCode
        lockboxCode = resolved.codes.lockboxCode
        wifiNetwork = resolved.codes.wifi.network
        wifiPassword = resolved.codes.wifi.password
      } else {
        codesUnresolved = true
        missingFields.push(CODES_UNRESOLVED_REASON)
      }
    } catch (error) {
      console.error('[welcome-drafts] Failed to resolve access codes:', error)
      codesUnresolved = true
      missingFields.push(CODES_UNRESOLVED_REASON)
    }
  } else {
    codesUnresolved = true
    missingFields.push(CODES_UNRESOLVED_REASON)
  }

  const propertyDisplayName = facing.displayName
  const propertyAddress = facing.address
  const mapsUrl = facing.mapsUrl
  const parkingInstructions = facing.parkingInstructions

  const wifiPasswordDisplay = codesUnresolved ? '' : (wifiPassword || '[WIFI]')
  if (!codesUnresolved && !wifiPassword) {
    missingFields.push('wifi_password')
  }
  
  // Extract suite name from booking
  const suiteName = booking.room_number || booking.suite_or_unit || '[SUITE NAME]'
  
  // Guest-facing message body: Matches Cottage Falcon template structure
  // Approve & Send only. No invented content.
  let message = `Hi there! 🌟

Hope you're well. We're excited to welcome you to Dullstroom soon! 🎉

Thank you for choosing ${propertyDisplayName}! ✨

🕒 Check-in Time: From 14:00
📍 Address: ${propertyAddress}`

  // Add maps link if available
  if (mapsUrl) {
    message += `
🔗 Navigation Link (Google Maps): ${mapsUrl}`
  }

  const contactEmail = process.env.PROPERTY_EMAIL || 'stay@thebrowns.co.za'
  
  if (!codesUnresolved && wifiPasswordDisplay) {
    message += `

📶 WiFi Password: ${wifiPasswordDisplay}`
  }

  message += `

🛏️ Suite you booked: ${suiteName}.

🛑 Gate: Once the gate has opened please drive through. Do not wait in the gate.`

  // Add property-specific parking instructions
  if (parkingInstructions) {
    message += `
🚗 Parking: ${parkingInstructions}`
  }

  message += `

🙋 Our housekeepers are available next door at The Browns' Luxury Suites (279 Blue Crane Drive) until 5 PM. They will be expecting you and will gladly show you to your room. After 5 PM, we will give you our self-check-in details.`

  // Add access codes if available and after 5 PM path applies
  if (gateCode || doorCode || lockboxCode) {
    message += `

📍 Self-Check-In Access (after 5 PM):`
    if (gateCode) {
      message += `
- Gate Code: ${gateCode}`
    }
    if (doorCode) {
      message += `
- Door Code: ${doorCode}`
    }
    if (lockboxCode) {
      message += `
- Lockbox Code: ${lockboxCode}`
    }
  }

  message += `
⚡ Loadshedding: Currently no planned loadshedding.

📞 If you need any assistance or guidance, feel free to contact us at ${process.env.PROPERTY_CONTACT_EMAIL || 'stay@thebrowns.co.za'}.`

  // Add portal link if available
  if (portalUrl) {
    message += `

🔗 Your stay portal:
${portalUrl}

(Check-in details, Wi-Fi, access codes, and property info)`
  }

  message += `

Kind regards,
Grant & Liana Brown`

  return { message, missingFields, gateCode, doorCode, lockboxCode, wifiNetwork, wifiPassword }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')
    const asOfDate = searchParams.get('as_of') || format(new Date(), 'yyyy-MM-dd')
    const windowDays = parseInt(searchParams.get('window_days') || '1')

    const db = await getDbAsync()
    
    // Calculate date range
    const startDate = parseISO(asOfDate)
    const endDate = addDays(startDate, windowDays)
    
    // Fetch bookings within the window
    const bookings = await db.prepare(`
      SELECT * FROM bookings 
      WHERE tenant_id = ? 
      AND check_in >= ? 
      AND check_in < ?
      ORDER BY check_in ASC
    `).all(tenantId, asOfDate, format(endDate, 'yyyy-MM-dd')) as Booking[]

    // Fetch properties for this tenant
    const properties = await db.prepare(`
      SELECT * FROM properties WHERE tenant_id = ?
    `).all(tenantId) as Property[]

    const propertiesMap = new Map(properties.map(p => [p.id, p]))
    
    // Generate drafts
    const drafts: WelcomeDraft[] = []
    const skippedNoName: Booking[] = []
    
    for (const booking of bookings) {
      // Skip bookings without guest name
      if (!booking.guest_name || booking.guest_name.trim() === '') {
        skippedNoName.push(booking)
        continue
      }
      
      const property = booking.property_id ? propertiesMap.get(booking.property_id) : null
      
      // Mint portal magic link for this booking
      let portalUrl: string | undefined = undefined
      try {
        // Revoke any existing active tokens for this booking
        await db.prepare(`
          UPDATE guest_tokens 
          SET revoked = 1 
          WHERE booking_id = ? AND revoked = 0
        `).run(booking.id)
        
        // Generate new token
        const { token, hash } = generateGuestToken()
        
        // Calculate expiry (use check_out if available, otherwise check_in + 14 days)
        const expiryDate = booking.check_out 
          ? calculateTokenExpiry(booking.check_out)
          : calculateTokenExpiry(addDays(parseISO(booking.check_in), 14).toISOString().split('T')[0])
        
        // Store token hash in database
        await db.prepare(`
          INSERT INTO guest_tokens (booking_id, token_hash, expires_at)
          VALUES (?, ?, ?)
        `).run(booking.id, hash, expiryDate.toISOString())
        
        // Construct portal URL
        const host = request.headers.get('host')
        portalUrl = getGuestPortalUrl(token, host || undefined)
      } catch (error) {
        console.error(`Failed to generate portal link for booking ${booking.id}:`, error)
        // Continue generating draft but mark portal_url as missing
      }
      
      const { message, missingFields, gateCode, doorCode, lockboxCode } = await generateWelcomeMessage(
        booking, 
        property || null, 
        portalUrl,
        db,
        tenantId
      )
      
      // Add portal_url to missingFields if generation failed
      if (!portalUrl) {
        missingFields.push('portal_url')
      }
      
      drafts.push({
        id: booking.id,
        guestName: booking.guest_name,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        property: property?.name || 'Unknown Property',
        roomNumber: booking.room_number,
        message,
        missingFields,
        portalUrl,
        gateCode,
        doorCode,
        lockboxCode
      })
    }

    return NextResponse.json({
      success: true,
      asOfDate,
      windowDays,
      drafts,
      stats: {
        totalBookings: bookings.length,
        draftCount: drafts.length,
        skippedNoName: skippedNoName.length
      },
      skippedNoName: skippedNoName.map(b => ({
        id: b.id,
        checkIn: b.check_in,
        roomNumber: b.room_number
      }))
    })
  } catch (error) {
    console.error('Error generating welcome drafts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate welcome drafts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { drafts, format: exportFormat } = body

    if (!drafts || !Array.isArray(drafts)) {
      return NextResponse.json(
        { success: false, error: 'Invalid drafts data' },
        { status: 400 }
      )
    }

    if (exportFormat === 'markdown') {
      // Generate markdown export
      let markdown = '# Welcome Message Queue\n\n'
      markdown += `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n\n`
      markdown += '---\n\n'
      
      drafts.forEach((draft: WelcomeDraft, index: number) => {
        markdown += `## ${index + 1}. ${draft.guestName} — ${format(parseISO(draft.checkIn), 'd MMM')}\n\n`
        
        if (draft.missingFields.length > 0) {
          markdown += `**Missing:** ${draft.missingFields.map(f => `[${f.toUpperCase()}]`).join(', ')}\n\n`
        }
        
        markdown += `${draft.message}\n\n`
        markdown += '---\n\n'
      })

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="guestflow-welcome-drafts-${format(new Date(), 'yyyy-MM-dd')}.md"`
        }
      })
    }

    if (exportFormat === 'html') {
      // Generate HTML export
      let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome Message Drafts</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a202c; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .meta { color: #718096; font-size: 14px; margin-bottom: 20px; }
    .missing { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 10px 0; }
    .draft { background: #f7fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .draft pre { white-space: pre-wrap; margin: 0; }
    hr { border: none; border-top: 2px solid #e2e8f0; margin: 30px 0; }
    @media print {
      body { margin: 0; }
      .draft { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Welcome Message Queue</h1>
  <div class="meta">Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
  <hr>
`
      
      drafts.forEach((draft: WelcomeDraft, index: number) => {
        html += `
  <h2>${index + 1}. ${draft.guestName} — ${format(parseISO(draft.checkIn), 'd MMM')}</h2>
  ${draft.missingFields.length > 0 ? `<div class="missing"><strong>Missing:</strong> ${draft.missingFields.map(f => `[${f.toUpperCase()}]`).join(', ')}</div>` : ''}
  <div class="draft">
    <pre>${draft.message}</pre>
  </div>
  <hr>
`
      })

      html += `
</body>
</html>`

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="guestflow-welcome-drafts-${format(new Date(), 'yyyy-MM-dd')}.html"`
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid export format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error exporting welcome drafts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export welcome drafts' },
      { status: 500 }
    )
  }
}
