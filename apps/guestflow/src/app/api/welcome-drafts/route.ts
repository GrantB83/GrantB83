import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { format, parseISO, addDays, isWithinInterval } from 'date-fns'

interface Booking {
  id: number
  tenant_id: number
  guest_name: string
  check_in: string
  check_out: string
  room_number: string | null
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
}

function generateWelcomeMessage(booking: Booking, property: Property | null): { message: string, missingFields: string[] } {
  const missingFields: string[] = []
  const guestPhone = '[GUEST_PHONE]'
  const rateCard = '[RATE CARD REQUIRED]'
  
  missingFields.push('guest_phone')
  missingFields.push('rate_card')

  const checkInDate = parseISO(booking.check_in)
  const checkOutDate = parseISO(booking.check_out)
  const checkInFormatted = format(checkInDate, 'EEEE, d MMM yyyy')
  const checkOutFormatted = format(checkOutDate, 'EEEE, d MMM yyyy')
  
  const propertyName = property?.name || 'Our Guesthouse'
  const location = property?.location || 'Dullstroom'
  
  const message = `# Welcome Message Stub — ${booking.guest_name}

**Check-in:** ${checkInFormatted}
**Check-out:** ${checkOutFormatted}
**Property:** ${propertyName}
${booking.room_number ? `**Room:** ${booking.room_number}` : ''}

---

Hi there,

Looking forward to welcoming you to ${propertyName} in ${location} on ${checkInFormatted}!

We're preparing everything for your arrival and want to make sure your stay is comfortable.

**Contact:** ${guestPhone}
**Rate:** ${rateCard}

If you have any questions or special requests ahead of your stay, please don't hesitate to reach out.

Warm regards,
The GuestFlow Team
${location}`

  return { message, missingFields }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = parseInt(searchParams.get('tenant_id') || '1')
    const asOfDate = searchParams.get('as_of') || format(new Date(), 'yyyy-MM-dd')
    const windowDays = parseInt(searchParams.get('window_days') || '1')

    const db = getDb()
    
    // Calculate date range
    const startDate = parseISO(asOfDate)
    const endDate = addDays(startDate, windowDays)
    
    // Fetch bookings within the window
    const bookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE tenant_id = ? 
      AND check_in >= ? 
      AND check_in < ?
      ORDER BY check_in ASC
    `).all(tenantId, asOfDate, format(endDate, 'yyyy-MM-dd')) as Booking[]

    // Fetch properties for this tenant
    const properties = db.prepare(`
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
      const { message, missingFields } = generateWelcomeMessage(booking, property || null)
      
      drafts.push({
        id: booking.id,
        guestName: booking.guest_name,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        property: property?.name || 'Unknown Property',
        roomNumber: booking.room_number,
        message,
        missingFields
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
