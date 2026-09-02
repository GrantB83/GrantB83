import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface BookingData {
  guestName: string
  propertyName: string
  roomNumber: string
  checkIn: string
  checkOut: string
  status: string
  lateCheckIn: boolean
  missingFields: string[]
  adults?: number
  children?: number
  pets?: boolean
  specialRequests?: string
}

/**
 * POST /api/daily-brief/export
 * 
 * Export daily ops brief as markdown or plain text
 * Mirrors Phase 8 quote export and Phase 13 leave-behind export patterns
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantName, targetDate, bookings, format } = body as {
      tenantName: string
      targetDate: string
      bookings: BookingData[]
      format: 'markdown' | 'text'
    }

    if (!tenantName || !targetDate || !bookings) {
      return NextResponse.json(
        { error: 'tenantName, targetDate, and bookings are required' },
        { status: 400 }
      )
    }

    const arrivals = bookings.filter(b => b.status === 'arriving')
    const inHouse = bookings.filter(b => b.status === 'inhouse')
    const departures = bookings.filter(b => b.status === 'departing')
    const redAlerts = bookings.filter(b => b.lateCheckIn && b.status === 'arriving')
    const amberWarnings = bookings.filter(b => b.missingFields.length > 0 || (b.specialRequests && !b.lateCheckIn))

    let content = ''

    if (format === 'markdown') {
      content = generateMarkdown(tenantName, targetDate, arrivals, inHouse, departures, redAlerts, amberWarnings)
    } else {
      content = generatePlainText(tenantName, targetDate, arrivals, inHouse, departures, redAlerts, amberWarnings)
    }

    const contentType = format === 'markdown' ? 'text/markdown' : 'text/plain'
    const extension = format === 'markdown' ? 'md' : 'txt'

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="daily-brief-${targetDate}.${extension}"`
      }
    })

  } catch (error) {
    console.error('Error exporting daily brief:', error)
    return NextResponse.json(
      { error: 'Failed to export brief', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function generateMarkdown(
  tenantName: string,
  targetDate: string,
  arrivals: BookingData[],
  inHouse: BookingData[],
  departures: BookingData[],
  redAlerts: BookingData[],
  amberWarnings: BookingData[]
): string {
  let md = `# Daily Operations Brief\n\n`
  md += `**Tenant:** ${tenantName}  \n`
  md += `**Date:** ${targetDate}  \n`
  md += `**Generated:** ${new Date().toISOString().split('T')[0]}\n\n`
  md += `---\n\n`

  md += `## Summary\n\n`
  md += `- **Arrivals:** ${arrivals.length}\n`
  md += `- **In-House:** ${inHouse.length}\n`
  md += `- **Departures:** ${departures.length}\n\n`

  if (redAlerts.length > 0) {
    md += `## 🔴 RED - Action Required\n\n`
    redAlerts.forEach(booking => {
      md += `### ${booking.guestName} - ${booking.propertyName}\n`
      md += `- **Room:** ${booking.roomNumber || 'TBD'}\n`
      md += `- **Alert:** Late check-in expected\n`
      md += `- **Action:** Confirm arrival time and after-hours access\n\n`
    })
  }

  if (amberWarnings.length > 0) {
    md += `## 🟡 AMBER - Today's Priorities\n\n`
    amberWarnings.forEach(booking => {
      md += `### ${booking.guestName} - ${booking.propertyName}\n`
      if (booking.missingFields.length > 0) {
        md += `- **Missing:** ${booking.missingFields.join(', ')}\n`
      }
      if (booking.specialRequests) {
        md += `- **Note:** ${booking.specialRequests}\n`
      }
      md += `\n`
    })
  }

  if (arrivals.length > 0) {
    md += `## Arrivals Today (${arrivals.length})\n\n`
    arrivals.forEach(booking => {
      md += `### ${booking.guestName}\n`
      md += `- **Property:** ${booking.propertyName}\n`
      md += `- **Room:** ${booking.roomNumber || 'TBD'}\n`
      md += `- **Guests:** ${booking.adults || 0} adult(s)`
      if (booking.children) md += `, ${booking.children} child(ren)`
      if (booking.pets) md += ` 🐾`
      md += `\n`
      if (booking.specialRequests) md += `- **Requests:** ${booking.specialRequests}\n`
      md += `\n`
    })
  }

  if (inHouse.length > 0) {
    md += `## In-House Guests (${inHouse.length})\n\n`
    inHouse.forEach(booking => {
      md += `- ${booking.guestName} - ${booking.propertyName} Room ${booking.roomNumber || 'TBD'} (checkout ${booking.checkOut})\n`
    })
    md += `\n`
  }

  if (departures.length > 0) {
    md += `## Departures Today (${departures.length})\n\n`
    departures.forEach(booking => {
      md += `- ${booking.guestName} - ${booking.propertyName} Room ${booking.roomNumber || 'TBD'} (checkout ${booking.checkOut})\n`
    })
    md += `\n`
  }

  md += `## Housekeeping Schedule\n\n`
  if (departures.length > 0) {
    md += `### Morning Departures\n`
    departures.forEach(booking => {
      md += `- [ ] ${booking.propertyName} Room ${booking.roomNumber || 'TBD'}\n`
    })
    md += `\n`
  }
  if (arrivals.length > 0) {
    md += `### Afternoon Arrival Prep\n`
    arrivals.forEach(booking => {
      md += `- [ ] ${booking.propertyName} Room ${booking.roomNumber || 'TBD'}\n`
    })
    md += `\n`
  }

  md += `---\n\n`
  md += `**Note:** This is a DRAFT brief generated from GuestFlow fixtures. WhatsApp/email send requires H11 approval.\n`

  return md
}

function generatePlainText(
  tenantName: string,
  targetDate: string,
  arrivals: BookingData[],
  inHouse: BookingData[],
  departures: BookingData[],
  redAlerts: BookingData[],
  amberWarnings: BookingData[]
): string {
  let txt = `DAILY OPERATIONS BRIEF\n`
  txt += `${'='.repeat(60)}\n\n`
  txt += `Tenant: ${tenantName}\n`
  txt += `Date: ${targetDate}\n`
  txt += `Generated: ${new Date().toISOString().split('T')[0]}\n\n`

  txt += `SUMMARY\n`
  txt += `${'-'.repeat(60)}\n`
  txt += `Arrivals:   ${arrivals.length}\n`
  txt += `In-House:   ${inHouse.length}\n`
  txt += `Departures: ${departures.length}\n\n`

  if (redAlerts.length > 0) {
    txt += `RED - ACTION REQUIRED\n`
    txt += `${'-'.repeat(60)}\n`
    redAlerts.forEach(booking => {
      txt += `${booking.guestName} - ${booking.propertyName}\n`
      txt += `  Room: ${booking.roomNumber || 'TBD'}\n`
      txt += `  Alert: Late check-in expected\n`
      txt += `  Action: Confirm arrival time and after-hours access\n\n`
    })
  }

  if (amberWarnings.length > 0) {
    txt += `AMBER - TODAY'S PRIORITIES\n`
    txt += `${'-'.repeat(60)}\n`
    amberWarnings.forEach(booking => {
      txt += `${booking.guestName} - ${booking.propertyName}\n`
      if (booking.missingFields.length > 0) {
        txt += `  Missing: ${booking.missingFields.join(', ')}\n`
      }
      if (booking.specialRequests) {
        txt += `  Note: ${booking.specialRequests}\n`
      }
      txt += `\n`
    })
  }

  if (arrivals.length > 0) {
    txt += `ARRIVALS TODAY (${arrivals.length})\n`
    txt += `${'-'.repeat(60)}\n`
    arrivals.forEach(booking => {
      txt += `${booking.guestName}\n`
      txt += `  Property: ${booking.propertyName}\n`
      txt += `  Room: ${booking.roomNumber || 'TBD'}\n`
      txt += `  Guests: ${booking.adults || 0} adult(s)`
      if (booking.children) txt += `, ${booking.children} child(ren)`
      if (booking.pets) txt += ` (pet)`
      txt += `\n`
      if (booking.specialRequests) txt += `  Requests: ${booking.specialRequests}\n`
      txt += `\n`
    })
  }

  if (inHouse.length > 0) {
    txt += `IN-HOUSE GUESTS (${inHouse.length})\n`
    txt += `${'-'.repeat(60)}\n`
    inHouse.forEach(booking => {
      txt += `- ${booking.guestName} - ${booking.propertyName} Room ${booking.roomNumber || 'TBD'} (checkout ${booking.checkOut})\n`
    })
    txt += `\n`
  }

  if (departures.length > 0) {
    txt += `DEPARTURES TODAY (${departures.length})\n`
    txt += `${'-'.repeat(60)}\n`
    departures.forEach(booking => {
      txt += `- ${booking.guestName} - ${booking.propertyName} Room ${booking.roomNumber || 'TBD'} (checkout ${booking.checkOut})\n`
    })
    txt += `\n`
  }

  txt += `HOUSEKEEPING SCHEDULE\n`
  txt += `${'-'.repeat(60)}\n`
  if (departures.length > 0) {
    txt += `Morning Departures:\n`
    departures.forEach(booking => {
      txt += `  [ ] ${booking.propertyName} Room ${booking.roomNumber || 'TBD'}\n`
    })
    txt += `\n`
  }
  if (arrivals.length > 0) {
    txt += `Afternoon Arrival Prep:\n`
    arrivals.forEach(booking => {
      txt += `  [ ] ${booking.propertyName} Room ${booking.roomNumber || 'TBD'}\n`
    })
    txt += `\n`
  }

  txt += `${'='.repeat(60)}\n`
  txt += `NOTE: This is a DRAFT brief. WhatsApp/email send requires H11 approval.\n`

  return txt
}
