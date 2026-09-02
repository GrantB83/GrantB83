import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenantName,
      targetDate,
      dailyBrief,
      welcomeDrafts,
      lateCheckinQueue,
      format: exportFormat
    } = body

    if (!tenantName || !targetDate) {
      return NextResponse.json(
        { error: 'tenantName and targetDate are required' },
        { status: 400 }
      )
    }

    const packContent = generatePackMarkdown({
      tenantName,
      targetDate,
      dailyBrief,
      welcomeDrafts,
      lateCheckinQueue
    })

    const approvalContent = generateApprovalMarkdown(targetDate)

    if (exportFormat === 'html') {
      const html = convertToHTML(packContent, approvalContent, targetDate)
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="guestflow-ct-pack-${targetDate}.html"`,
        },
      })
    }

    // Return markdown as default
    const fullMarkdown = `${packContent}\n\n---\n\n${approvalContent}`
    return new NextResponse(fullMarkdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="guestflow-ct-pack-${targetDate}.md"`,
      },
    })
  } catch (error) {
    console.error('CT Pack assembly error:', error)
    return NextResponse.json(
      { error: 'Failed to assemble CT pack' },
      { status: 500 }
    )
  }
}

function generatePackMarkdown(data: {
  tenantName: string
  targetDate: string
  dailyBrief?: any
  welcomeDrafts?: any[]
  lateCheckinQueue?: any[]
}): string {
  const { tenantName, targetDate, dailyBrief, welcomeDrafts, lateCheckinQueue } = data

  const lines: string[] = []

  // Header
  lines.push(`# GuestFlow CT Pack`)
  lines.push(``)
  lines.push(`**Tenant:** ${tenantName}`)
  lines.push(`**Date:** ${targetDate}`)
  lines.push(`**Generated:** ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Purpose
  lines.push(`## Purpose`)
  lines.push(``)
  lines.push(`Sales demo CT-pack assembly mirroring \`tools/browns-ct-pack-assemble\`. Combines daily-ops brief, welcome stubs, and late-checkin queue into one leave-behind pack for the active demo tenant.`)
  lines.push(``)
  lines.push(`**DEMO/FIXTURES ONLY** — Never WhatsApp/email send.`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Timed Checklist (demo copy only)
  lines.push(`## Timed Checklist (Demo Copy Only)`)
  lines.push(``)
  lines.push(`### 20:00 CT - Same-Day Morning Guest Drafts`)
  lines.push(``)
  lines.push(`Review and send welcome messages for today's arrivals.`)
  lines.push(``)
  lines.push(`**Files:**`)
  if (welcomeDrafts && welcomeDrafts.length > 0) {
    lines.push(`- Welcome drafts: ${welcomeDrafts.length} guest(s)`)
  } else {
    lines.push(`- No welcome drafts in this pack`)
  }
  lines.push(``)
  lines.push(`**Action:** Liana vet / Grant approve before send`)
  lines.push(``)

  lines.push(`### 09:00 CT (Next Morning) - After-Hours Check-Ins`)
  lines.push(``)
  lines.push(`Review late check-ins and booking changes from overnight.`)
  lines.push(``)
  lines.push(`**Files:**`)
  if (lateCheckinQueue && lateCheckinQueue.length > 0) {
    lines.push(`- Late check-in queue: ${lateCheckinQueue.length} guest(s)`)
  } else {
    lines.push(`- No late check-ins in this pack`)
  }
  lines.push(``)
  lines.push(`**Action:** Confirm arrival time and after-hours access`)
  lines.push(``)

  lines.push(`### 21:00 CT - Staff Ops Brief`)
  lines.push(``)
  lines.push(`Send daily operations brief to team WhatsApp.`)
  lines.push(``)
  lines.push(`**Files:**`)
  if (dailyBrief) {
    lines.push(`- Daily brief included`)
  } else {
    lines.push(`- No daily brief in this pack`)
  }
  lines.push(``)
  lines.push(`**Action:** WhatsApp Admin posts (H11 approval required)`)
  lines.push(``)

  lines.push(`---`)
  lines.push(``)

  // Pack Contents Table
  lines.push(`## Pack Contents`)
  lines.push(``)
  lines.push(`| Section | Count | Status |`)
  lines.push(`|---------|-------|--------|`)
  lines.push(`| Daily Brief | ${dailyBrief ? '1' : '0'} | ${dailyBrief ? '✅' : '⚠️ Missing'} |`)
  lines.push(`| Welcome Drafts | ${welcomeDrafts?.length || 0} | ${welcomeDrafts && welcomeDrafts.length > 0 ? '✅' : '⚠️ Missing'} |`)
  lines.push(`| Late Check-In Queue | ${lateCheckinQueue?.length || 0} | ${lateCheckinQueue && lateCheckinQueue.length > 0 ? '✅' : '⚠️ Missing'} |`)
  lines.push(``)

  lines.push(`---`)
  lines.push(``)

  // Daily Brief Section
  if (dailyBrief) {
    lines.push(`## Daily Operations Brief`)
    lines.push(``)
    if (dailyBrief.arrivals) {
      lines.push(`**Arrivals:** ${dailyBrief.arrivals.length}`)
      dailyBrief.arrivals.forEach((booking: any) => {
        lines.push(`- ${booking.guestName} — ${booking.propertyName} (Room ${booking.roomNumber || 'TBD'})`)
      })
      lines.push(``)
    }
    if (dailyBrief.departures) {
      lines.push(`**Departures:** ${dailyBrief.departures.length}`)
      dailyBrief.departures.forEach((booking: any) => {
        lines.push(`- ${booking.guestName} — ${booking.propertyName} (Room ${booking.roomNumber || 'TBD'})`)
      })
      lines.push(``)
    }
    if (dailyBrief.inHouse) {
      lines.push(`**In-House:** ${dailyBrief.inHouse.length}`)
      lines.push(``)
    }
    if (dailyBrief.redAlerts && dailyBrief.redAlerts.length > 0) {
      lines.push(`**🔴 RED Alerts:**`)
      dailyBrief.redAlerts.forEach((alert: string) => {
        lines.push(`- ${alert}`)
      })
      lines.push(``)
    }
  }

  lines.push(`---`)
  lines.push(``)

  // Welcome Drafts Section
  if (welcomeDrafts && welcomeDrafts.length > 0) {
    lines.push(`## Welcome Message Drafts`)
    lines.push(``)
    welcomeDrafts.forEach((draft, index) => {
      lines.push(`### ${index + 1}. ${draft.guestName}`)
      lines.push(``)
      lines.push(`**Check-in:** ${draft.checkIn}`)
      lines.push(`**Property:** ${draft.property}`)
      if (draft.roomNumber) {
        lines.push(`**Room:** ${draft.roomNumber}`)
      }
      lines.push(``)
      if (draft.missingFields && draft.missingFields.length > 0) {
        lines.push(`⚠️ **Missing:** ${draft.missingFields.join(', ')}`)
        lines.push(``)
      }
      lines.push('```')
      lines.push(draft.message)
      lines.push('```')
      lines.push(``)
    })
  }

  lines.push(`---`)
  lines.push(``)

  // Late Check-In Queue Section
  if (lateCheckinQueue && lateCheckinQueue.length > 0) {
    lines.push(`## Late Check-In Queue`)
    lines.push(``)
    lateCheckinQueue.forEach((guest) => {
      lines.push(`### ${guest.guestName}`)
      lines.push(``)
      lines.push(`**Expected:** ${guest.expectedArrival || '[UNKNOWN TIME]'}`)
      lines.push(`**Property:** ${guest.property}`)
      lines.push(`**Room:** ${guest.roomNumber || 'TBD'}`)
      lines.push(``)
      lines.push(`**Action:** Confirm arrival time and after-hours access`)
      lines.push(``)
    })
  }

  lines.push(`---`)
  lines.push(``)

  // Sources Summary
  lines.push(`## Sources`)
  lines.push(``)
  lines.push(`- Daily Brief: ${dailyBrief ? 'Provided' : 'Not provided'}`)
  lines.push(`- Welcome Drafts: ${welcomeDrafts && welcomeDrafts.length > 0 ? `${welcomeDrafts.length} draft(s)` : 'Not provided'}`)
  lines.push(`- Late Check-In Queue: ${lateCheckinQueue && lateCheckinQueue.length > 0 ? `${lateCheckinQueue.length} guest(s)` : 'Not provided'}`)
  lines.push(``)

  lines.push(`---`)
  lines.push(``)

  // Safety Reminder
  lines.push(`## Safety Reminder`)
  lines.push(``)
  lines.push(`✅ **DEMO ONLY** — All outputs are drafts for sales demonstration`)
  lines.push(`✅ **Never auto-send** — Review APPROVAL.md before every send`)
  lines.push(`✅ **CoS owns WhatsApp** — Never bypass approval gates`)
  lines.push(`✅ **Never invent data** — Placeholders stay flagged`)
  lines.push(``)

  return lines.join('\n')
}

function generateApprovalMarkdown(targetDate: string): string {
  const lines: string[] = []

  lines.push(`# APPROVAL.md`)
  lines.push(``)
  lines.push(`## CT Pack Approval Gates (Phase 20 Demo)`)
  lines.push(``)
  lines.push(`**Date:** ${targetDate}`)
  lines.push(`**Status:** DRAFT ONLY / DEMO`)
  lines.push(``)

  lines.push(`---`)
  lines.push(``)

  lines.push(`## Hard Gates`)
  lines.push(``)
  lines.push(`### Gate 1: DRAFT ONLY`)
  lines.push(``)
  lines.push(`This is a **sales demo** feature. All pack contents are DRAFT ONLY and must never be auto-sent via WhatsApp or email.`)
  lines.push(``)
  lines.push(`✅ **Status:** Demo fixtures only`)
  lines.push(``)

  lines.push(`### Gate 2: CoS Ownership`)
  lines.push(``)
  lines.push(`CoS (Chief of Staff) owns the real WhatsApp sending for The Browns operations. This demo pack assembly mirrors \`tools/browns-ct-pack-assemble\` for sales demonstration purposes only.`)
  lines.push(``)
  lines.push(`✅ **Status:** Sales demo feature`)
  lines.push(``)

  lines.push(`### Gate 3: Never Auto-Send`)
  lines.push(``)
  lines.push(`Every message draft in this pack requires human approval before sending. The pack assembler never connects to WhatsApp Business API or email services.`)
  lines.push(``)
  lines.push(`✅ **Status:** No auto-send capability`)
  lines.push(``)

  lines.push(`### Gate 4: Never Invent Data`)
  lines.push(``)
  lines.push(`The pack assembler never invents:`)
  lines.push(`- Guest phone numbers (uses \`[GUEST_PHONE]\` placeholder)`)
  lines.push(`- Room rates (uses \`[RATE CARD REQUIRED]\` placeholder)`)
  lines.push(`- Arrival times (uses \`[UNKNOWN TIME]\` placeholder)`)
  lines.push(`- Guest names (skips bookings without names)`)
  lines.push(``)
  lines.push(`✅ **Status:** Placeholders preserved`)
  lines.push(``)

  lines.push(`### Gate 5: Demo Tenant Only`)
  lines.push(``)
  lines.push(`This pack is generated from the active demo tenant's fixtures. It does not touch production data or live bookings.`)
  lines.push(``)
  lines.push(`✅ **Status:** Demo tenant scoped`)
  lines.push(``)

  lines.push(`---`)
  lines.push(``)

  lines.push(`## Timed Send Checklist (Demo Copy)`)
  lines.push(``)
  lines.push(`- [ ] **20:00 CT** — Review welcome drafts (Liana vet / Grant approve)`)
  lines.push(`- [ ] **09:00 CT (next morning)** — Review after-hours check-ins`)
  lines.push(`- [ ] **21:00 CT** — Review staff ops brief (H11 approval required)`)
  lines.push(``)

  lines.push(`---`)
  lines.push(``)

  lines.push(`## Approval Phrase Template`)
  lines.push(``)
  lines.push(`\`\`\``)
  lines.push(`APPROVE SEND CT PACK ${targetDate}`)
  lines.push(`\`\`\``)
  lines.push(``)
  lines.push(`**Note:** This approval phrase is for demo purposes only. In production, CoS would use this phrase before WhatsApp sends.`)
  lines.push(``)

  return lines.join('\n')
}

function convertToHTML(packContent: string, approvalContent: string, targetDate: string): string {
  // Simple markdown-to-HTML conversion for print
  const fullContent = `${packContent}\n\n---\n\n${approvalContent}`
  
  let html = fullContent
    // Headers
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Line breaks
    .replace(/\n/g, '<br>\n')
    // Wrap lists
    .replace(/(<li>.*<\/li><br>\n)+/g, '<ul>$&</ul>')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GuestFlow CT Pack - ${targetDate}</title>
  <style>
    @media print {
      body { margin: 0.5in; }
      @page { size: auto; margin: 0.5in; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #1e3a8a; margin-top: 20px; }
    pre { background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre code { background: none; padding: 0; }
    ul { padding-left: 20px; }
    li { margin: 5px 0; }
    hr { border: none; border-top: 1px solid #d1d5db; margin: 30px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    td, th { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim()
}
