import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { inquiryData, runIntake = false } = body

    if (!inquiryData) {
      return NextResponse.json(
        { error: 'inquiryData is required' },
        { status: 400 }
      )
    }

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const packName = `browns-inquiry-quote-pipeline-${timestamp}`

    // Generate pack contents
    const packMd = generatePackMd(inquiryData, timestamp)
    const approvalMd = generateApprovalMd(inquiryData)
    const intakeBookingJson = JSON.stringify(inquiryData, null, 2)
    const manifestJson = generateManifest(packName, timestamp, inquiryData, runIntake)
    const readmeMd = generateReadme(packName, timestamp)

    // Generate CLI command
    const cliCommand = generateCliCommand(packName, runIntake)

    // Return pack as JSON
    return NextResponse.json({
      packName,
      timestamp,
      cliCommand,
      files: {
        'PACK.md': packMd,
        'APPROVAL.md': approvalMd,
        'intake-booking.json': intakeBookingJson,
        'manifest.json': manifestJson,
        'README.md': readmeMd,
      }
    })
  } catch (error) {
    console.error('Inquiry quote pipeline pack generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate inquiry quote pipeline pack' },
      { status: 500 }
    )
  }
}

function generatePackMd(inquiryData: any, timestamp: string): string {
  const lines: string[] = []
  
  lines.push('# Browns Inquiry Quote Pipeline Pack')
  lines.push('')
  lines.push(`**Generated:** ${timestamp}`)
  lines.push('**Purpose:** Dullstroom / The Browns orchestrated pack for single inquiry → quote draft')
  lines.push('')
  lines.push('**SAFETY:** Never invents rates. Never auto-sends mail/WhatsApp. H7 approval required.')
  lines.push('')
  lines.push('---')
  lines.push('')
  
  lines.push('## Pack Contents')
  lines.push('')
  lines.push('### ✅ Inquiry Intake')
  lines.push('- `intake-booking.json` — Structured booking data')
  lines.push('')
  
  lines.push('## Inquiry Summary')
  lines.push('')
  lines.push(`- **Guest:** ${inquiryData.guestName || '[MISSING]'}`)
  lines.push(`- **Dates:** ${inquiryData.checkInDate || '[TBD]'} to ${inquiryData.checkOutDate || '[TBD]'}`)
  lines.push(`- **Suite:** ${inquiryData.suiteOrUnit || '[TBD]'}`)
  lines.push(`- **Guests:** ${inquiryData.adults || '?'} adults${inquiryData.children ? `, ${inquiryData.children} children` : ''}`)
  lines.push(`- **Channel:** ${inquiryData.channel || 'unknown'}`)
  lines.push('')
  
  const hasAmounts = !!(inquiryData.quoteAmount || inquiryData.depositAmount || inquiryData.totalAmount)
  
  if (hasAmounts) {
    lines.push('### ✅ Amounts Provided')
    lines.push('')
    if (inquiryData.quoteAmount) lines.push(`- Quote: ${inquiryData.currency || 'ZAR'} ${inquiryData.quoteAmount}`)
    if (inquiryData.depositAmount) lines.push(`- Deposit: ${inquiryData.currency || 'ZAR'} ${inquiryData.depositAmount}`)
    if (inquiryData.totalAmount) lines.push(`- Total: ${inquiryData.currency || 'ZAR'} ${inquiryData.totalAmount}`)
    lines.push('')
  } else {
    lines.push('### ⚠️ NO AMOUNTS PROVIDED')
    lines.push('')
    lines.push('Drafts will be availability-only. Add amounts manually from rate card if needed.')
    lines.push('')
    lines.push('[RATE CARD REQUIRED] if amounts are missing.')
    lines.push('')
  }
  
  lines.push('## Next Steps')
  lines.push('')
  lines.push('1. Review this pack index')
  lines.push('2. If amounts missing, fill from approved rate card (never invent)')
  lines.push('3. Read APPROVAL.md')
  lines.push('4. Get H7 approval before any guest send: `APPROVE SEND <thread-or-wa-id>`')
  lines.push('5. Never auto-send — Grant/Liana review required')
  lines.push('')
  lines.push('## CLI Command (SA Ops)')
  lines.push('')
  lines.push('```bash')
  lines.push('cd tools/browns-inquiry-quote-pipeline-pack')
  lines.push('npm run build')
  lines.push('npm run pack -- --inquiry intake-booking.json --outdir out/')
  lines.push('```')
  lines.push('')
  
  return lines.join('\n')
}

function generateApprovalMd(inquiryData: any): string {
  const lines: string[] = []
  
  lines.push('# Browns Inquiry Quote Pipeline - APPROVAL CHECKLIST')
  lines.push('')
  lines.push('## Hard Gates')
  lines.push('')
  lines.push('### H7 - Quote Send')
  lines.push('☐ **Required approval:** `APPROVE SEND <thread-or-wa-id>`')
  lines.push('')
  lines.push('### lane:hospitality-partners Rules')
  lines.push(`☐ **Dates confirmed:** ${inquiryData.checkInDate && inquiryData.checkOutDate ? '✅' : '⚠️ Missing'}`)
  lines.push(`☐ **Suite confirmed:** ${inquiryData.suiteOrUnit ? '✅' : '⚠️ Missing'}`)
  lines.push(`☐ **Guests confirmed:** ${inquiryData.adults ? '✅' : '⚠️ Missing'}`)
  lines.push('')
  lines.push('### N7 - Never Invent')
  lines.push('☐ **No invented rates:** Amounts only from inquiry or approved rate card')
  
  const hasAmounts = !!(inquiryData.quoteAmount || inquiryData.depositAmount || inquiryData.totalAmount)
  lines.push(`☐ **Amounts source:** ${hasAmounts ? '✅ From inquiry' : '⚠️ [RATE CARD REQUIRED]'}`)
  lines.push('☐ **No auto-send:** Human review required')
  lines.push('')
  
  lines.push('## Data Verification')
  lines.push('')
  lines.push(`- Guest Name: ${inquiryData.guestName || '[MISSING]'}`)
  lines.push(`- Check-in: ${inquiryData.checkInDate || '[MISSING]'}`)
  lines.push(`- Check-out: ${inquiryData.checkOutDate || '[MISSING]'}`)
  lines.push(`- Suite: ${inquiryData.suiteOrUnit || '[MISSING]'}`)
  lines.push(`- Guests: ${inquiryData.adults || '?'} adults${inquiryData.children ? `, ${inquiryData.children} children` : ''}`)
  lines.push('')
  
  if (!hasAmounts) {
    lines.push('**⚠️ NO AMOUNTS PROVIDED**')
    lines.push('')
    lines.push('[RATE CARD REQUIRED] — Add amounts manually from approved rate card before sending.')
    lines.push('')
  }
  
  lines.push('## Safety Reminders')
  lines.push('')
  lines.push('- ✅ Offline only')
  lines.push('- ✅ Never auto-send')
  lines.push('- ✅ Dullstroom / The Browns only')
  lines.push('- ⚠️ H7 gate required before any send')
  lines.push('- ⚠️ Never invent rates or amounts')
  lines.push('')
  lines.push('## Approval')
  lines.push('')
  lines.push('☐ All hard gates checked')
  lines.push('☐ Dates + suite + guests confirmed')
  lines.push('☐ Amounts verified (or [RATE CARD REQUIRED] acknowledged)')
  lines.push('☐ No invented rates/amounts')
  lines.push('☐ H7 approval obtained')
  lines.push('☐ Ready to proceed with quote send (Grant/Liana approval)')
  lines.push('')
  
  return lines.join('\n')
}

function generateManifest(packName: string, timestamp: string, inquiryData: any, runIntake: boolean): string {
  return JSON.stringify({
    tool: 'browns-inquiry-quote-pipeline-pack',
    version: '1.0.0',
    packName,
    generatedAt: timestamp,
    intakeRan: runIntake,
    quoteRan: false, // UI doesn't run quote tool, just exports pack
    guestName: inquiryData.guestName || null,
    checkInDate: inquiryData.checkInDate || null,
    checkOutDate: inquiryData.checkOutDate || null,
    hasAmounts: !!(inquiryData.quoteAmount || inquiryData.depositAmount || inquiryData.totalAmount),
    files: [
      'PACK.md',
      'APPROVAL.md',
      'intake-booking.json',
      'manifest.json',
      'README.md'
    ]
  }, null, 2)
}

function generateReadme(packName: string, timestamp: string): string {
  const lines: string[] = []
  
  lines.push(`# ${packName}`)
  lines.push('')
  lines.push(`Generated: ${timestamp}`)
  lines.push('Tool: browns-inquiry-quote-pipeline-pack')
  lines.push('')
  lines.push('## Purpose')
  lines.push('')
  lines.push('Orchestrated pipeline pack for Browns inquiry → quote draft. Combines inquiry intake and quote generation.')
  lines.push('')
  lines.push('## Contents')
  lines.push('')
  lines.push('- `PACK.md` - Pack index and summary')
  lines.push('- `APPROVAL.md` - H7 gate checklist (READ THIS FIRST)')
  lines.push('- `intake-booking.json` - Structured inquiry data')
  lines.push('- `manifest.json` - Pack metadata')
  lines.push('')
  lines.push('## CLI Usage (SA Ops)')
  lines.push('')
  lines.push('Run the full pipeline via CLI:')
  lines.push('')
  lines.push('```bash')
  lines.push('cd tools/browns-inquiry-quote-pipeline-pack')
  lines.push('npm run build')
  lines.push('npm run pack -- --inquiry intake-booking.json --outdir out/')
  lines.push('```')
  lines.push('')
  lines.push('## Safety')
  lines.push('')
  lines.push('- Offline only')
  lines.push('- Never auto-send')
  lines.push('- Never invent rates')
  lines.push('- H7 approval required')
  lines.push('- Browns Dullstroom only')
  lines.push('')
  
  return lines.join('\n')
}

function generateCliCommand(packName: string, runIntake: boolean): string {
  if (runIntake) {
    return `# Run full pipeline from inquiry text
cd tools/browns-inquiry-quote-pipeline-pack
npm run build
npm run pack -- --run-intake --text inquiry.txt --outdir out/${packName}

# Or run from existing inquiry JSON
npm run pack -- --inquiry intake-booking.json --outdir out/${packName}`
  }
  
  return `# Run pipeline from existing inquiry JSON
cd tools/browns-inquiry-quote-pipeline-pack
npm run build
npm run pack -- --inquiry intake-booking.json --outdir out/${packName}

# Expected output:
# - PACK.md
# - APPROVAL.md
# - intake-booking.json
# - draft-quote-*.txt (if quote runs)
# - manifest.json`
}
