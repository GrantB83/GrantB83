import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bookings, targetDate, dailyBrief } = body

    if (!targetDate) {
      return NextResponse.json(
        { error: 'targetDate is required' },
        { status: 400 }
      )
    }

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const packName = `browns-ct-pack-pipeline-${timestamp}`

    // Generate pack contents
    const packMd = generatePackMd(bookings || [], targetDate, dailyBrief, timestamp)
    const approvalMd = generateApprovalMd(targetDate)
    const manifestJson = generateManifest(packName, timestamp, targetDate)
    const readmeMd = generateReadme(packName, timestamp, targetDate)

    // Optional: include booking data if provided
    const files: Record<string, string> = {
      'PACK.md': packMd,
      'APPROVAL.md': approvalMd,
      'manifest.json': manifestJson,
      'README.md': readmeMd,
    }

    if (bookings && bookings.length > 0) {
      files['bookings.json'] = JSON.stringify(bookings, null, 2)
    }

    // Generate CLI command
    const cliCommand = generateCliCommand(packName, targetDate)

    // Return pack as JSON
    return NextResponse.json({
      packName,
      timestamp,
      cliCommand,
      files
    })
  } catch (error) {
    console.error('CT pack pipeline generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate CT pack pipeline' },
      { status: 500 }
    )
  }
}

function generatePackMd(bookings: any[], targetDate: string, dailyBrief: any, timestamp: string): string {
  const lines: string[] = []
  
  lines.push('# Browns CT Pack Pipeline')
  lines.push('')
  lines.push(`**Generated:** ${timestamp}`)
  lines.push(`**Target Date:** ${targetDate}`)
  lines.push('**Purpose:** Communication pack orchestrator for Browns Dullstroom upcoming stays')
  lines.push('')
  lines.push('**SAFETY:** Never auto-sends. Never invents data. H11 approval required for staff comms.')
  lines.push('')
  lines.push('---')
  lines.push('')
  
  lines.push('## Pack Pipeline')
  lines.push('')
  lines.push('This pack orchestrates:')
  lines.push('1. **booking-change-check** → Detect last-minute changes')
  lines.push('2. **ct-pack-assemble** → Generate guest communication pack')
  lines.push('3. **ct-pack-post-checklist** → Post-send verification (optional)')
  lines.push('')
  
  lines.push('---')
  lines.push('')
  
  lines.push('## Bookings Summary')
  lines.push('')
  if (bookings.length > 0) {
    lines.push(`**Total bookings:** ${bookings.length}`)
    lines.push('')
    bookings.forEach((booking: any, idx: number) => {
      lines.push(`### ${idx + 1}. ${booking.guestName || '[GUEST NAME]'}`)
      lines.push(`- **Property:** ${booking.propertyName || booking.suiteOrUnit || '[PROPERTY]'}`)
      lines.push(`- **Check-in:** ${booking.checkInDate || '[TBD]'}`)
      lines.push(`- **Check-out:** ${booking.checkOutDate || '[TBD]'}`)
      lines.push(`- **Status:** ${booking.status || 'confirmed'}`)
      lines.push('')
    })
  } else {
    lines.push('⚠️ No bookings provided for this pack')
    lines.push('')
  }
  
  lines.push('---')
  lines.push('')
  
  if (dailyBrief) {
    lines.push('## Daily Brief (Included)')
    lines.push('')
    lines.push(`**Arrivals:** ${dailyBrief.arrivals?.length || 0}`)
    lines.push(`**Departures:** ${dailyBrief.departures?.length || 0}`)
    lines.push(`**In-House:** ${dailyBrief.inHouse?.length || 0}`)
    lines.push('')
    
    if (dailyBrief.redAlerts && dailyBrief.redAlerts.length > 0) {
      lines.push('**🔴 RED Alerts:**')
      dailyBrief.redAlerts.forEach((alert: string) => {
        lines.push(`- ${alert}`)
      })
      lines.push('')
    }
  }
  
  lines.push('---')
  lines.push('')
  
  lines.push('## Timed Checklist')
  lines.push('')
  lines.push('### 20:00 CT - Same-Day Morning Guest Drafts')
  lines.push('- Review and send welcome messages')
  lines.push('- **Action:** Liana vet / Grant approve before send')
  lines.push('')
  lines.push('### 09:00 CT (Next Morning) - After-Hours Check-Ins')
  lines.push('- Review late check-ins and booking changes')
  lines.push('- **Action:** Confirm arrival time and access')
  lines.push('')
  lines.push('### 21:00 CT - Staff Ops Brief')
  lines.push('- Send daily operations brief to team WhatsApp')
  lines.push('- **Action:** WhatsApp Admin posts (H11 approval required)')
  lines.push('')
  
  lines.push('---')
  lines.push('')
  
  lines.push('## Next Steps')
  lines.push('')
  lines.push('1. Review this pack index')
  lines.push('2. Read APPROVAL.md for gate requirements')
  lines.push('3. Run booking-change-check to detect changes')
  lines.push('4. Assemble final CT pack with ct-pack-assemble')
  lines.push('5. Get H11 approval before staff WhatsApp send')
  lines.push('')
  lines.push('## CLI Command (SA Ops)')
  lines.push('')
  lines.push('```bash')
  lines.push('cd tools/browns-ct-pack-pipeline-pack')
  lines.push('npm run build')
  lines.push(`npm run pipeline -- --date ${targetDate} --pack pack/ --outdir out/`)
  lines.push('```')
  lines.push('')
  
  return lines.join('\n')
}

function generateApprovalMd(targetDate: string): string {
  const lines: string[] = []
  
  lines.push('# Browns CT Pack Pipeline - APPROVAL CHECKLIST')
  lines.push('')
  lines.push(`**Target Date:** ${targetDate}`)
  lines.push('')
  lines.push('## Hard Gates')
  lines.push('')
  lines.push('### H11 - Staff Run-Sheet Send')
  lines.push('☐ **Required approval:** `APPROVE RUN SHEET <date>`')
  lines.push('')
  lines.push('### H2 - Guest Sequence Send')
  lines.push('☐ **Required approval:** `APPROVE SEQUENCE <name> hospitality-partners`')
  lines.push('')
  lines.push('### Never Invent')
  lines.push('☐ **No invented guest data**')
  lines.push('☐ **No invented phone numbers**')
  lines.push('☐ **No invented ETAs**')
  lines.push('☐ **No auto-send** - Human review required')
  lines.push('')
  
  lines.push('## Pipeline Stages')
  lines.push('')
  lines.push('### Stage 1: Booking Change Check')
  lines.push('☐ Compare before/after booking snapshots')
  lines.push('☐ Detect additions, cancellations, modifications')
  lines.push('☐ Flag changes requiring guest follow-up')
  lines.push('')
  lines.push('### Stage 2: CT Pack Assembly')
  lines.push('☐ Generate communication pack for upcoming stays')
  lines.push('☐ Include welcome drafts for same-day arrivals')
  lines.push('☐ Include late check-in queue')
  lines.push('☐ Include daily ops brief')
  lines.push('')
  lines.push('### Stage 3: Post-Send Checklist (Optional)')
  lines.push('☐ Verify all welcome messages sent')
  lines.push('☐ Confirm after-hours access provided')
  lines.push('☐ Mark checklist items complete')
  lines.push('')
  
  lines.push('## Safety Reminders')
  lines.push('')
  lines.push('- ✅ Offline orchestration only')
  lines.push('- ✅ Never auto-send')
  lines.push('- ✅ CoS owns WhatsApp')
  lines.push('- ⚠️ H11 gate required for staff comms')
  lines.push('- ⚠️ H2 gate required for guest sequences')
  lines.push('- ⚠️ Never invent missing data')
  lines.push('')
  lines.push('## Approval')
  lines.push('')
  lines.push('☐ All hard gates checked')
  lines.push('☐ Pipeline stages reviewed')
  lines.push('☐ Missing fields acknowledged (not invented)')
  lines.push('☐ Approval phrases obtained')
  lines.push('☐ Ready for CoS to send (Grant/Liana approval)')
  lines.push('')
  
  return lines.join('\n')
}

function generateManifest(packName: string, timestamp: string, targetDate: string): string {
  return JSON.stringify({
    tool: 'browns-ct-pack-pipeline-pack',
    version: '1.0.0',
    packName,
    generatedAt: timestamp,
    targetDate,
    stages: [
      'booking-change-check',
      'ct-pack-assemble',
      'ct-pack-post-checklist (optional)'
    ],
    files: [
      'PACK.md',
      'APPROVAL.md',
      'manifest.json',
      'README.md'
    ]
  }, null, 2)
}

function generateReadme(packName: string, timestamp: string, targetDate: string): string {
  const lines: string[] = []
  
  lines.push(`# ${packName}`)
  lines.push('')
  lines.push(`Generated: ${timestamp}`)
  lines.push(`Target Date: ${targetDate}`)
  lines.push('Tool: browns-ct-pack-pipeline-pack')
  lines.push('')
  lines.push('## Purpose')
  lines.push('')
  lines.push('CT Pack pipeline orchestrator for Browns Dullstroom. Coordinates booking-change-check → ct-pack-assemble → post-checklist.')
  lines.push('')
  lines.push('## Contents')
  lines.push('')
  lines.push('- `PACK.md` - Pipeline index and timed checklist')
  lines.push('- `APPROVAL.md` - H11/H2 gate checklists (READ THIS FIRST)')
  lines.push('- `manifest.json` - Pack metadata')
  lines.push('')
  lines.push('## CLI Usage (SA Ops)')
  lines.push('')
  lines.push('Run the pipeline orchestrator:')
  lines.push('')
  lines.push('```bash')
  lines.push('cd tools/browns-ct-pack-pipeline-pack')
  lines.push('npm run build')
  lines.push(`npm run pipeline -- --date ${targetDate} --pack pack/ --outdir out/`)
  lines.push('```')
  lines.push('')
  lines.push('## Pipeline Stages')
  lines.push('')
  lines.push('1. **booking-change-check** - Detect last-minute changes')
  lines.push('2. **ct-pack-assemble** - Generate guest communication pack')
  lines.push('3. **ct-pack-post-checklist** - Post-send verification (optional)')
  lines.push('')
  lines.push('## Safety')
  lines.push('')
  lines.push('- Offline orchestration only')
  lines.push('- Never auto-send')
  lines.push('- H11/H2 approval required')
  lines.push('- CoS owns WhatsApp send')
  lines.push('')
  
  return lines.join('\n')
}

function generateCliCommand(packName: string, targetDate: string): string {
  return `# Run browns-ct-pack-pipeline-pack CLI
cd tools/browns-ct-pack-pipeline-pack
npm run build
npm run pipeline -- --date ${targetDate} --pack pack/ --outdir out/${packName}

# Pipeline stages:
# 1. booking-change-check → Detect changes
# 2. ct-pack-assemble → Generate comms pack
# 3. ct-pack-post-checklist → Verify sends (optional)

# Expected output:
# - PACK.md with timed checklist
# - APPROVAL.md with H11/H2 gates
# - manifest.json`
}
