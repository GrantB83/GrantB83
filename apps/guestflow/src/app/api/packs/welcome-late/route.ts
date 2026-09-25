import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { CODES_UNRESOLVED_REASON, propertyFacingDetails, resolvePropertyForSuite } from '@/lib/property-resolve'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bookings, targetDate } = body

    if (!bookings || !Array.isArray(bookings)) {
      return NextResponse.json(
        { error: 'bookings array is required' },
        { status: 400 }
      )
    }

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const packName = `browns-welcome-late-pipeline-${timestamp}`
    const date = targetDate || format(new Date(), 'yyyy-MM-dd')

    // Generate pack contents
    const packMd = await generatePackMd(bookings, date, timestamp)
    const approvalMd = generateApprovalMd(bookings, date)
    const bookingsJson = JSON.stringify(bookings, null, 2)
    const manifestJson = generateManifest(packName, timestamp, bookings, date)
    const readmeMd = generateReadme(packName, timestamp, date)

    // Generate CLI command
    const cliCommand = generateCliCommand(packName, date)

    // Return pack as JSON
    return NextResponse.json({
      packName,
      timestamp,
      cliCommand,
      files: {
        'PACK.md': packMd,
        'APPROVAL.md': approvalMd,
        'bookings.json': bookingsJson,
        'manifest.json': manifestJson,
        'README.md': readmeMd,
      }
    })
  } catch (error) {
    console.error('Welcome late pipeline pack generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate welcome late pipeline pack' },
      { status: 500 }
    )
  }
}

async function generatePackMd(bookings: any[], date: string, timestamp: string): Promise<string> {
  const lines: string[] = []
  
  lines.push('# Browns Welcome & Late Check-In Pipeline Pack')
  lines.push('')
  lines.push(`**Generated:** ${timestamp}`)
  lines.push(`**Target Date:** ${date}`)
  lines.push('**Purpose:** Orchestrated pack combining welcome drafts + late check-in queue for Browns Dullstroom')
  lines.push('')
  lines.push('**SAFETY:** Never invents phone/Wi-Fi/ETAs. Never auto-sends. H2 approval required.')
  lines.push('')
  lines.push('---')
  lines.push('')
  
  // Arrivals summary
  const arrivals = bookings.filter((b: any) => b.checkInDate === date)
  const lateCheckIns = bookings.filter((b: any) => b.lateCheckIn || b.unknownEta)
  
  lines.push('## Pack Contents')
  lines.push('')
  lines.push(`- Arrivals for ${date}: ${arrivals.length}`)
  lines.push(`- Late check-ins / unknown ETAs: ${lateCheckIns.length}`)
  lines.push('')
  
  lines.push('---')
  lines.push('')
  
  // Welcome drafts section
  if (arrivals.length > 0) {
    lines.push('## Welcome Message Drafts')
    lines.push('')
    
    for (const [idx, booking] of arrivals.entries()) {
      lines.push(`### ${idx + 1}. ${booking.guestName || '[GUEST NAME]'}`)
      lines.push('')
      const suite = booking.suiteOrUnit || booking.roomNumber || ''
      const db = await getDbAsync()
      const tenantId = await getDefaultTenantIdAsync()
      const propertyKey = await resolvePropertyForSuite(db, tenantId, suite)
      const facing = propertyFacingDetails(propertyKey)
      lines.push(`**Property:** ${facing.displayName}`)
      lines.push(`**Check-in:** ${booking.checkInDate}`)
      lines.push(`**Check-out:** ${booking.checkOutDate || '[TBD]'}`)
      lines.push(`**Guests:** ${booking.adults || '?'} adults${booking.children ? `, ${booking.children} children` : ''}`)
      lines.push('')
      
      if (booking.missingPhone) {
        lines.push('⚠️ **Missing:** Guest phone number [DO NOT INVENT]')
        lines.push('')
      }
      if (!propertyKey) {
        lines.push(`⚠️ **${CODES_UNRESOLVED_REASON}** — draft without gate/lockbox/WiFi codes`)
        lines.push('')
      }
      
      const propertyDisplayName = facing.displayName
      const propertyAddress = facing.address || '[ASK STAFF]'
      const mapsUrl = facing.mapsUrl || '[ASK STAFF]'
      const parkingInstructions = facing.parkingInstructions || '[ASK STAFF]'
      
      lines.push('**Draft Message (Cottage Falcon v1):**')
      lines.push('```')
      lines.push('Hi there! 🌟')
      lines.push('')
      lines.push("Hope you're well. We're excited to welcome you to Dullstroom soon! 🎉")
      lines.push('')
      lines.push(`Thank you for choosing ${propertyDisplayName}! ✨`)
      lines.push('')
      lines.push('🕒 Check-in Time: From 14:00')
      lines.push(`📍 Address: ${propertyAddress}`)
      lines.push(`🔗 Navigation Link (Google Maps): ${mapsUrl}`)
      lines.push('')
      lines.push('📶 WiFi Password: [WIFI]')
      lines.push('')
      lines.push(`🛏️ Suite you booked: ${booking.suiteOrUnit || '[SUITE NAME]'}.`)
      lines.push('')
      lines.push('🛑 Gate: Once the gate has opened please drive through. Do not wait in the gate.')
      lines.push(`🚗 Parking: ${parkingInstructions}`)
      lines.push('')
      lines.push("🙋 Our housekeepers are available next door at The Browns' Luxury Suites (279 Blue Crane Drive) until 5 PM. They will be expecting you and will gladly show you to your room. After 5 PM, we will give you our self-check-in details.")
      lines.push('⚡ Loadshedding: Currently no planned loadshedding.')
      lines.push('')
      lines.push('📞 If you need any assistance or guidance, feel free to contact us at stay@thebrowns.co.za.')
      lines.push('')
      lines.push('Kind regards,')
      lines.push('Grant & Liana Brown')
      lines.push('```')
      lines.push('')
    }
  } else {
    lines.push('## Welcome Message Drafts')
    lines.push('')
    lines.push('⚠️ No same-day arrivals for this date')
    lines.push('')
  }
  
  lines.push('---')
  lines.push('')
  
  // Late check-in queue
  if (lateCheckIns.length > 0) {
    lines.push('## Late Check-In Queue')
    lines.push('')
    lines.push('**After-hours arrivals requiring follow-up:**')
    lines.push('')
    
    lateCheckIns.forEach((booking: any) => {
      lines.push(`### ${booking.guestName || '[GUEST NAME]'}`)
      lines.push('')
      lines.push(`**Expected:** ${booking.expectedArrival || '[UNKNOWN TIME - DO NOT INVENT]'}`)
      lines.push(`**Property:** ${booking.propertyName || booking.suiteOrUnit || '[PROPERTY]'}`)
      lines.push(`**Phone:** ${booking.phone || '[MISSING - DO NOT INVENT]'}`)
      lines.push('')
      lines.push('**Action Required:**')
      lines.push('- [ ] Confirm arrival time')
      lines.push('- [ ] Provide after-hours access instructions')
      lines.push('- [ ] Never invent phone/ETA if missing')
      lines.push('')
    })
  } else {
    lines.push('## Late Check-In Queue')
    lines.push('')
    lines.push('✅ No late check-ins for this date')
    lines.push('')
  }
  
  lines.push('---')
  lines.push('')
  
  lines.push('## Next Steps')
  lines.push('')
  lines.push('1. Review this pack index')
  lines.push('2. Read APPROVAL.md for H2 gate requirements')
  lines.push('3. Fill missing fields (never invent)')
  lines.push('4. Get H2 approval: `APPROVE SEQUENCE welcome <entity>`')
  lines.push('5. CoS sends via WhatsApp (never auto-send)')
  lines.push('')
  
  return lines.join('\n')
}

function generateApprovalMd(bookings: any[], date: string): string {
  const lines: string[] = []
  
  lines.push('# Browns Welcome & Late Check-In - APPROVAL CHECKLIST')
  lines.push('')
  lines.push(`**Target Date:** ${date}`)
  lines.push('')
  lines.push('## Hard Gates')
  lines.push('')
  lines.push('### H2 - Sequence Send')
  lines.push('☐ **Required approval:** `APPROVE SEQUENCE welcome hospitality-partners`')
  lines.push('')
  lines.push('### Never Invent (N7 pattern)')
  lines.push('☐ **No invented phone numbers**')
  lines.push('☐ **No invented Wi-Fi codes**')
  lines.push('☐ **No invented access instructions**')
  lines.push('☐ **No invented ETAs**')
  lines.push('☐ **No auto-send** - CoS review required')
  lines.push('')
  
  lines.push('## Booking Verification')
  lines.push('')
  const arrivals = bookings.filter((b: any) => b.checkInDate === date)
  const lateCheckIns = bookings.filter((b: any) => b.lateCheckIn || b.unknownEta)
  
  lines.push(`- Same-day arrivals: ${arrivals.length}`)
  lines.push(`- Late check-ins: ${lateCheckIns.length}`)
  lines.push('')
  
  arrivals.forEach((booking: any) => {
    lines.push(`### ${booking.guestName || '[GUEST NAME]'}`)
    const missingFields = []
    if (!booking.phone) missingFields.push('phone')
    if (!booking.propertyName && !booking.suiteOrUnit) missingFields.push('property')
    if (!booking.checkOutDate) missingFields.push('check-out date')
    
    if (missingFields.length > 0) {
      lines.push(`⚠️ **Missing:** ${missingFields.join(', ')} [DO NOT INVENT]`)
    } else {
      lines.push('✅ All required fields present')
    }
    lines.push('')
  })
  
  lines.push('## Safety Reminders')
  lines.push('')
  lines.push('- ✅ Offline pack generation only')
  lines.push('- ✅ Never auto-send')
  lines.push('- ✅ CoS owns WhatsApp send')
  lines.push('- ⚠️ H2 gate required before any send')
  lines.push('- ⚠️ Never invent missing data')
  lines.push('')
  lines.push('## Approval')
  lines.push('')
  lines.push('☐ All hard gates checked')
  lines.push('☐ Missing fields acknowledged (not invented)')
  lines.push('☐ H2 approval obtained')
  lines.push('☐ Ready for CoS to send (Grant/Liana approval)')
  lines.push('')
  
  return lines.join('\n')
}

function generateManifest(packName: string, timestamp: string, bookings: any[], date: string): string {
  const arrivals = bookings.filter((b: any) => b.checkInDate === date)
  const lateCheckIns = bookings.filter((b: any) => b.lateCheckIn || b.unknownEta)
  
  return JSON.stringify({
    tool: 'browns-welcome-late-pipeline-pack',
    version: '1.0.0',
    packName,
    generatedAt: timestamp,
    targetDate: date,
    arrivalsCount: arrivals.length,
    lateCheckInsCount: lateCheckIns.length,
    files: [
      'PACK.md',
      'APPROVAL.md',
      'bookings.json',
      'manifest.json',
      'README.md'
    ]
  }, null, 2)
}

function generateReadme(packName: string, timestamp: string, date: string): string {
  const lines: string[] = []
  
  lines.push(`# ${packName}`)
  lines.push('')
  lines.push(`Generated: ${timestamp}`)
  lines.push(`Target Date: ${date}`)
  lines.push('Tool: browns-welcome-late-pipeline-pack')
  lines.push('')
  lines.push('## Purpose')
  lines.push('')
  lines.push('Orchestrated pipeline pack combining welcome drafts + late check-in queue for Browns Dullstroom guest operations.')
  lines.push('')
  lines.push('## Contents')
  lines.push('')
  lines.push('- `PACK.md` - Pack index with welcome drafts and late check-in queue')
  lines.push('- `APPROVAL.md` - H2 gate checklist (READ THIS FIRST)')
  lines.push('- `bookings.json` - Source booking data')
  lines.push('- `manifest.json` - Pack metadata')
  lines.push('')
  lines.push('## CLI Usage (SA Ops)')
  lines.push('')
  lines.push('Run the pipeline via CLI:')
  lines.push('')
  lines.push('```bash')
  lines.push('cd tools/browns-welcome-late-pipeline-pack')
  lines.push('npm run build')
  lines.push(`npm run pack -- --bookings bookings.json --day ${date} --outdir out/`)
  lines.push('```')
  lines.push('')
  lines.push('## Safety')
  lines.push('')
  lines.push('- Offline only')
  lines.push('- Never auto-send')
  lines.push('- Never invent phone/Wi-Fi/ETAs')
  lines.push('- H2 approval required')
  lines.push('- CoS owns WhatsApp send')
  lines.push('')
  
  return lines.join('\n')
}

function generateCliCommand(packName: string, date: string): string {
  return `# Run browns-welcome-late-pipeline-pack CLI
cd tools/browns-welcome-late-pipeline-pack
npm run build
npm run pack -- --bookings bookings.json --day ${date} --outdir out/${packName}

# Expected output:
# - Welcome drafts for same-day arrivals
# - Late check-in queue for after-hours
# - APPROVAL.md with H2 gate checklist
# - manifest.json`
}
