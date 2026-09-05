import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { inquiryText, extractedData } = body

    if (!inquiryText && !extractedData) {
      return NextResponse.json(
        { error: 'inquiryText or extractedData is required' },
        { status: 400 }
      )
    }

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const packName = `browns-inquiry-intake-${timestamp}`

    // Generate pack contents
    const booking = extractedData?.booking || extractedData || {}
    const quote = extractedData?.quote || extractedData || {}
    const missingFields = extractedData?.missingFields || []

    const bookingJson = JSON.stringify(booking, null, 2)
    const quoteJson = JSON.stringify(quote, null, 2)
    
    const missingFieldsMd = generateMissingFieldsMd(missingFields)
    const approvalMd = generateApprovalMd(booking)
    const manifestJson = generateManifest(packName, timestamp, booking)
    const readmeMd = generateReadme(packName, timestamp)

    // Create CLI command
    const cliCommand = generateCliCommand(packName)

    // Return pack as JSON (UI will create downloadable zip)
    return NextResponse.json({
      packName,
      timestamp,
      cliCommand,
      files: {
        'booking.json': bookingJson,
        'quote.json': quoteJson,
        'missing-fields.md': missingFieldsMd,
        'APPROVAL.md': approvalMd,
        'manifest.json': manifestJson,
        'README.md': readmeMd,
      }
    })
  } catch (error) {
    console.error('Inquiry intake pack generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate inquiry intake pack' },
      { status: 500 }
    )
  }
}

function generateMissingFieldsMd(missingFields: string[]): string {
  const lines: string[] = []
  
  lines.push('# Missing Fields Checklist')
  lines.push('')
  lines.push('Complete these fields before proceeding to quote generation:')
  lines.push('')
  
  if (missingFields.length === 0) {
    lines.push('✅ No missing fields detected')
  } else {
    missingFields.forEach(field => {
      lines.push(`- [ ] ${field}`)
    })
  }
  
  lines.push('')
  lines.push('## Instructions')
  lines.push('')
  lines.push('1. Edit `booking.json` and `quote.json` to fill missing fields')
  lines.push('2. Use approved rate cards only - never invent rates')
  lines.push('3. Review APPROVAL.md before proceeding')
  lines.push('')
  
  return lines.join('\n')
}

function generateApprovalMd(booking: any): string {
  const lines: string[] = []
  
  lines.push('# APPROVAL CHECKLIST')
  lines.push('')
  lines.push('## Browns Inquiry Intake - Dullstroom Only')
  lines.push('')
  lines.push('### Hard Gates')
  lines.push('')
  lines.push('- [ ] **N7 Gate**: No invented rates or amounts')
  lines.push('- [ ] **Draft Only**: All outputs are DRAFT - never auto-send')
  lines.push('- [ ] **Browns Only**: Single-tenant Dullstroom scope')
  lines.push('')
  lines.push('### Extracted Data Verification')
  lines.push('')
  lines.push(`- Guest Name: ${booking.guestName || '[MISSING]'}`)
  lines.push(`- Check-in: ${booking.checkInDate || '[MISSING]'}`)
  lines.push(`- Check-out: ${booking.checkOutDate || '[MISSING]'}`)
  lines.push(`- Suite/Unit: ${booking.suiteOrUnit || '[MISSING]'}`)
  lines.push(`- Adults: ${booking.adults || '[MISSING]'}`)
  lines.push(`- Children: ${booking.children || 0}`)
  lines.push(`- Channel: ${booking.channel || 'unknown'}`)
  lines.push('')
  
  if (booking.quoteAmount || booking.depositAmount || booking.totalAmount) {
    lines.push('### ✅ Amounts Found')
    lines.push('')
    if (booking.quoteAmount) lines.push(`- Quote: ${booking.currency || 'ZAR'} ${booking.quoteAmount}`)
    if (booking.depositAmount) lines.push(`- Deposit: ${booking.currency || 'ZAR'} ${booking.depositAmount}`)
    if (booking.totalAmount) lines.push(`- Total: ${booking.currency || 'ZAR'} ${booking.totalAmount}`)
    lines.push('')
  } else {
    lines.push('### ⚠️ NO AMOUNTS PROVIDED')
    lines.push('')
    lines.push('[RATE CARD REQUIRED]')
    lines.push('')
    lines.push('Add amounts manually from approved rate card before quote generation.')
    lines.push('')
  }
  
  lines.push('### Next Steps')
  lines.push('')
  lines.push('1. Verify all extracted fields are accurate')
  lines.push('2. Fill missing fields using approved sources only')
  lines.push('3. If amounts missing, consult rate card (never invent)')
  lines.push('4. Feed `booking.json` to downstream tools:')
  lines.push('   - `browns-guest-comms-draft` for welcome messages')
  lines.push('   - `browns-quote-invoice-draft` for quotes')
  lines.push('   - `browns-daily-ops-brief` for operations')
  lines.push('')
  lines.push('### Safety Reminders')
  lines.push('')
  lines.push('- ✅ Offline only - no API calls')
  lines.push('- ✅ Never auto-send email or WhatsApp')
  lines.push('- ✅ Browns Dullstroom single-tenant only')
  lines.push('- ⚠️ Review before every downstream use')
  lines.push('')
  
  return lines.join('\n')
}

function generateManifest(packName: string, timestamp: string, booking: any): string {
  return JSON.stringify({
    tool: 'browns-inquiry-intake',
    version: '1.0.0',
    packName,
    generatedAt: timestamp,
    guestName: booking.guestName || null,
    checkInDate: booking.checkInDate || null,
    checkOutDate: booking.checkOutDate || null,
    hasAmounts: !!(booking.quoteAmount || booking.depositAmount || booking.totalAmount),
    files: [
      'booking.json',
      'quote.json',
      'missing-fields.md',
      'APPROVAL.md',
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
  lines.push('Tool: browns-inquiry-intake')
  lines.push('')
  lines.push('## Purpose')
  lines.push('')
  lines.push('Offline inquiry intake pack for Browns Dullstroom. Extracts structured booking/quote data from freeform inquiry text.')
  lines.push('')
  lines.push('## Contents')
  lines.push('')
  lines.push('- `booking.json` - Structured booking data')
  lines.push('- `quote.json` - Structured quote data')
  lines.push('- `missing-fields.md` - Checklist of fields to complete')
  lines.push('- `APPROVAL.md` - Review checklist (READ THIS FIRST)')
  lines.push('- `manifest.json` - Pack metadata')
  lines.push('')
  lines.push('## Usage')
  lines.push('')
  lines.push('1. **Review**: Read `APPROVAL.md` first')
  lines.push('2. **Complete**: Fill missing fields from `missing-fields.md`')
  lines.push('3. **Downstream**: Feed `booking.json` to sibling tools')
  lines.push('')
  lines.push('## CLI Command (SA Ops)')
  lines.push('')
  lines.push('If running via CLI instead of UI:')
  lines.push('')
  lines.push('```bash')
  lines.push('cd tools/browns-inquiry-intake')
  lines.push('npm run build')
  lines.push('npm run intake -- --text inquiry.txt --outdir out/')
  lines.push('```')
  lines.push('')
  lines.push('## Safety')
  lines.push('')
  lines.push('- Offline only - no API calls')
  lines.push('- Never auto-send')
  lines.push('- Never invent rates/amounts')
  lines.push('- Browns Dullstroom only')
  lines.push('')
  
  return lines.join('\n')
}

function generateCliCommand(packName: string): string {
  return `# Run browns-inquiry-intake CLI
cd tools/browns-inquiry-intake
npm run build
npm run intake -- --text inquiry.txt --outdir out/${packName}

# Expected output:
# - booking.json
# - quote.json  
# - missing-fields.md
# - APPROVAL.md
# - manifest.json`
}
