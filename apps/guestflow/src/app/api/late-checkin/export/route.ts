import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantName, targetDate, afterHoursThreshold, lateBookings, stats, format } = body

    if (!lateBookings || !Array.isArray(lateBookings)) {
      return NextResponse.json({ error: 'Invalid late bookings data' }, { status: 400 })
    }

    let content = ''

    if (format === 'markdown') {
      content = generateMarkdown(tenantName, targetDate, afterHoursThreshold, lateBookings, stats)
    } else {
      content = generateText(tenantName, targetDate, afterHoursThreshold, lateBookings, stats)
    }

    const contentType = format === 'markdown' ? 'text/markdown' : 'text/plain'
    const filename = `late-checkin-queue-${targetDate}.${format === 'markdown' ? 'md' : 'txt'}`

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateMarkdown(
  tenantName: string,
  targetDate: string,
  afterHoursThreshold: string,
  lateBookings: any[],
  stats: any
): string {
  const lines: string[] = []

  lines.push(`# Late / After-Hours Check-In Queue`)
  lines.push(``)
  lines.push(`**Tenant:** ${tenantName}`)
  lines.push(`**Target Date:** ${targetDate}`)
  lines.push(`**After-Hours Threshold:** ${afterHoursThreshold}`)
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  if (stats) {
    lines.push(`## Queue Summary`)
    lines.push(``)
    lines.push(`- **Total Late Check-Ins:** ${stats.totalLate}`)
    lines.push(`- **After-Hours:** ${stats.afterHours}`)
    lines.push(`- **Note Keyword (late/after-hours/ETA):** ${stats.noteKeyword}`)
    lines.push(`- **Unknown Check-In Time:** ${stats.unknownTime}`)
    lines.push(`- **Missing Phone:** ${stats.missingPhone}`)
    lines.push(`- **Missing ETA:** ${stats.missingETA}`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  }

  lines.push(`## Late Check-In Details (${lateBookings.length})`)
  lines.push(``)

  lateBookings.forEach((booking, index) => {
    lines.push(`### ${index + 1}. ${booking.guestName}`)
    lines.push(``)
    lines.push(`- **Property:** ${booking.propertyName}`)
    lines.push(`- **Room:** ${booking.roomNumber}`)
    lines.push(`- **Check-In:** ${booking.checkIn}`)
    lines.push(`- **Check-Out:** ${booking.checkOut}`)
    lines.push(`- **Guests:** ${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}`)
    lines.push(`- **Phone:** ${booking.guestPhone}`)
    lines.push(`- **Estimated Arrival:** ${booking.estimatedArrival}`)
    
    const reasonLabel = booking.lateReason === 'after-hours' ? 'AFTER HOURS' :
      booking.lateReason === 'note-keyword' ? 'LATE (NOTE)' : 'TIME UNKNOWN'
    lines.push(`- **Reason:** ${reasonLabel}`)
    
    if (booking.missingFields && booking.missingFields.length > 0) {
      lines.push(`- **⚠️ Missing:** ${booking.missingFields.join(', ')}`)
    }
    
    if (booking.notes) {
      lines.push(``)
      lines.push(`**Notes:** ${booking.notes}`)
    }
    
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  })

  lines.push(`## Hard Gates (Phase 19)`)
  lines.push(``)
  lines.push(`- ✅ DRAFT ONLY — Never sends WhatsApp or email automatically`)
  lines.push(`- ✅ Never invents guest phone — Uses [GUEST_PHONE] placeholder when missing`)
  lines.push(`- ✅ Never invents ETA — Uses [ETA UNKNOWN] placeholder when not specified`)
  lines.push(`- ✅ Fixtures only — Uses tenant bookings from SQLite, no live OTA integrations`)
  lines.push(`- ✅ Local demo only — Export operations are local-only with no external storage`)
  lines.push(``)

  return lines.join('\n')
}

function generateText(
  tenantName: string,
  targetDate: string,
  afterHoursThreshold: string,
  lateBookings: any[],
  stats: any
): string {
  const lines: string[] = []

  lines.push(`LATE / AFTER-HOURS CHECK-IN QUEUE`)
  lines.push(`=`.repeat(60))
  lines.push(``)
  lines.push(`Tenant: ${tenantName}`)
  lines.push(`Target Date: ${targetDate}`)
  lines.push(`After-Hours Threshold: ${afterHoursThreshold}`)
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(``)
  lines.push(`=`.repeat(60))
  lines.push(``)

  if (stats) {
    lines.push(`QUEUE SUMMARY`)
    lines.push(`-`.repeat(60))
    lines.push(``)
    lines.push(`Total Late Check-Ins: ${stats.totalLate}`)
    lines.push(`After-Hours: ${stats.afterHours}`)
    lines.push(`Note Keyword (late/after-hours/ETA): ${stats.noteKeyword}`)
    lines.push(`Unknown Check-In Time: ${stats.unknownTime}`)
    lines.push(`Missing Phone: ${stats.missingPhone}`)
    lines.push(`Missing ETA: ${stats.missingETA}`)
    lines.push(``)
    lines.push(`=`.repeat(60))
    lines.push(``)
  }

  lines.push(`LATE CHECK-IN DETAILS (${lateBookings.length})`)
  lines.push(``)

  lateBookings.forEach((booking, index) => {
    lines.push(`${index + 1}. ${booking.guestName}`)
    lines.push(`-`.repeat(60))
    lines.push(`Property: ${booking.propertyName}`)
    lines.push(`Room: ${booking.roomNumber}`)
    lines.push(`Check-In: ${booking.checkIn}`)
    lines.push(`Check-Out: ${booking.checkOut}`)
    lines.push(`Guests: ${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}`)
    lines.push(`Phone: ${booking.guestPhone}`)
    lines.push(`Estimated Arrival: ${booking.estimatedArrival}`)
    
    const reasonLabel = booking.lateReason === 'after-hours' ? 'AFTER HOURS' :
      booking.lateReason === 'note-keyword' ? 'LATE (NOTE)' : 'TIME UNKNOWN'
    lines.push(`Reason: ${reasonLabel}`)
    
    if (booking.missingFields && booking.missingFields.length > 0) {
      lines.push(`⚠️ Missing: ${booking.missingFields.join(', ')}`)
    }
    
    if (booking.notes) {
      lines.push(``)
      lines.push(`Notes: ${booking.notes}`)
    }
    
    lines.push(``)
  })

  lines.push(`=`.repeat(60))
  lines.push(`HARD GATES (Phase 19)`)
  lines.push(`=`.repeat(60))
  lines.push(``)
  lines.push(`✅ DRAFT ONLY — Never sends WhatsApp or email automatically`)
  lines.push(`✅ Never invents guest phone — Uses [GUEST_PHONE] placeholder when missing`)
  lines.push(`✅ Never invents ETA — Uses [ETA UNKNOWN] placeholder when not specified`)
  lines.push(`✅ Fixtures only — Uses tenant bookings from SQLite, no live OTA integrations`)
  lines.push(`✅ Local demo only — Export operations are local-only with no external storage`)
  lines.push(``)

  return lines.join('\n')
}
