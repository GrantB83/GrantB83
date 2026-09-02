import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

interface InquiryFixture {
  guestName: string
  email: string
  phone: string
  checkIn: string
  checkOut: string
  nights: number
  adults: number
  children: number
  property: string
  room: string
  specialRequests: string[]
  occasion: string
  amounts?: {
    ratePerNight: number
    currency: string
    season: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { format = 'markdown', tenantName = 'Demo Guesthouse', inquiryWithAmounts, inquiryWithoutAmounts } = body

    const markdown = generateMarkdownLeaveBehind(tenantName, inquiryWithAmounts, inquiryWithoutAmounts)

    if (format === 'zip') {
      const zip = new JSZip()
      
      // Add main markdown file
      zip.file('LEAVE-BEHIND.md', markdown)
      
      // Add walkthrough summary
      const walkthroughSummary = generateWalkthroughSummary()
      zip.file('WALKTHROUGH-SUMMARY.md', walkthroughSummary)
      
      // Add CT-pack reminder
      const ctPackReminder = generateCTPackReminder()
      zip.file('CT-PACK-REMINDER.md', ctPackReminder)
      
      // Add OTA worksheet reminder if inquiries exist
      if (inquiryWithAmounts || inquiryWithoutAmounts) {
        const otaWorksheet = generateOTAWorksheet(inquiryWithAmounts, inquiryWithoutAmounts)
        zip.file('OTA-WORKSHEET-SAMPLE.md', otaWorksheet)
      }
      
      // Add inquiry/quote samples
      if (inquiryWithAmounts) {
        const inquirySample = generateInquirySample(inquiryWithAmounts, true)
        zip.file('INQUIRY-SAMPLE-WITH-AMOUNTS.md', inquirySample)
      }
      
      if (inquiryWithoutAmounts) {
        const inquirySample = generateInquirySample(inquiryWithoutAmounts, false)
        zip.file('INQUIRY-SAMPLE-WITHOUT-AMOUNTS.md', inquirySample)
      }
      
      const zipBlob = await zip.generateAsync({ type: 'nodebuffer' })
      
      return new NextResponse(zipBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="guestflow-sales-leavebehind.zip"'
        }
      })
    }

    if (format === 'html') {
      const html = markdownToSimpleHTML(markdown)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': 'attachment; filename="guestflow-sales-leavebehind.html"'
        }
      })
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="guestflow-sales-leavebehind.md"'
      }
    })
  } catch (error) {
    console.error('Sales leave-behind export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate sales leave-behind export' },
      { status: 500 }
    )
  }
}

function generateMarkdownLeaveBehind(
  tenantName: string,
  inquiryWithAmounts: InquiryFixture | null,
  inquiryWithoutAmounts: InquiryFixture | null
): string {
  const withAmountsSection = inquiryWithAmounts ? `

## Sample Fixture: Inquiry→Quote (With Amounts)

**Inquiry Extract:**
- Guest: ${inquiryWithAmounts.guestName}
- Dates: ${inquiryWithAmounts.checkIn} to ${inquiryWithAmounts.checkOut} (${inquiryWithAmounts.nights} nights)
- Party: ${inquiryWithAmounts.adults} adults${inquiryWithAmounts.children > 0 ? `, ${inquiryWithAmounts.children} children` : ''}
- Property: ${inquiryWithAmounts.property}
- Room: ${inquiryWithAmounts.room}
${inquiryWithAmounts.specialRequests && inquiryWithAmounts.specialRequests.length > 0 ? `- Special Requests: ${inquiryWithAmounts.specialRequests.join(', ')}` : ''}

**Quote Draft (From Fixture Amounts Only):**
- Rate: ${inquiryWithAmounts.amounts?.currency} ${inquiryWithAmounts.amounts?.ratePerNight}/night (${inquiryWithAmounts.amounts?.season} season)
- Subtotal: ${inquiryWithAmounts.amounts?.currency} ${((inquiryWithAmounts.amounts?.ratePerNight || 0) * inquiryWithAmounts.nights).toLocaleString()}
- Tax (15%): ${inquiryWithAmounts.amounts?.currency} ${(((inquiryWithAmounts.amounts?.ratePerNight || 0) * inquiryWithAmounts.nights) * 0.15).toLocaleString()}
- **Total: ${inquiryWithAmounts.amounts?.currency} ${(((inquiryWithAmounts.amounts?.ratePerNight || 0) * inquiryWithAmounts.nights) * 1.15).toLocaleString()}**

_⚠️ DEMO AMOUNTS FROM FIXTURE ONLY — Never invents pricing. Missing rates show [RATE CARD REQUIRED]._

` : ''

  const withoutAmountsSection = inquiryWithoutAmounts ? `

## Sample Fixture: Inquiry→Availability Check (No Amounts)

**Inquiry Extract:**
- Guest: ${inquiryWithoutAmounts.guestName}
- Dates: ${inquiryWithoutAmounts.checkIn} to ${inquiryWithoutAmounts.checkOut} (${inquiryWithoutAmounts.nights} nights)
- Party: ${inquiryWithoutAmounts.adults} adults${inquiryWithoutAmounts.children > 0 ? `, ${inquiryWithoutAmounts.children} children` : ''}
- Property: ${inquiryWithoutAmounts.property}
- Room: ${inquiryWithoutAmounts.room}

**Quote Draft (Availability-Only):**
We have availability for your requested dates at ${inquiryWithoutAmounts.property}. 
Specific rates: **[RATE CARD REQUIRED]**

_⚠️ No rates in inquiry text → availability-only confirmation. Never invents pricing._

` : ''

  return `# GuestFlow Sales Leave-Behind Pack

**Multi-Property Guest Operations Platform Demo**  
_${tenantName} · DRAFT / Fixtures Only_

---

## What Is GuestFlow?

GuestFlow is a multi-tenant SaaS platform that automates guesthouse operations from inquiry to checkout. Built by actual guesthouse owners (The Browns portfolio), GuestFlow eliminates operational heavy lifting while keeping humans in control of guest communication and pricing decisions.

**Current Status:** Demo/Waitlist phase with proven workflows ready for beta testing.

---

## 11-Step Demo Walkthrough Path

1. **Landing Page** → Multi-property value prop with explicit Inquiry→Quote→Welcome→Operations flow
2. **Pricing Page** → Three-tier structure with DEMO PLACEHOLDER labels (not live offers)
3. **Waitlist Form** → Lead capture with property details, room count, current system
4. **CRM Pipeline** → Status tracking (New→Contacted→Qualified→Won/Lost), CSV export
5. **Rate Card Upload** → CSV/JSON seasonal rates with tenant-scoped SQLite storage
6. **Inquiry Intake** → Heuristic extraction from email/WhatsApp text into structured JSON
7. **Quote Draft** → Professional quotes from rate cards or [RATE CARD REQUIRED] placeholders
8. **NightsBridge Import** → CSV booking parser with gap detection and late check-in alerts
9. **Welcome Packs** → Personalized pre-arrival messages with property facts
10. **Daily Ops Brief** → Morning coordination with RED/AMBER/GREEN priority system
11. **CT-Pack Assembly** → Dated leave-behind combining ops brief, welcome drafts, late check-ins

---
${withAmountsSection}
---
${withoutAmountsSection}
---

## Hard Gates (What GuestFlow Never Does)

✗ **NO live payments** — No Stripe charges, no card processing, no payment links without H7 approval  
✗ **NO paid ads** — No Google Ads pixels, no Meta conversion tracking until launch  
✗ **NO public signup** — Waitlist only; demo auth stub is NOT production-ready  
✗ **NO WhatsApp/email auto-send** — All messaging is DRAFT-only with approval gates (H1/H2)  
✗ **NO invented rates** — Missing rate cards flagged as [RATE CARD REQUIRED], never fabricated  
✓ **DEMO labeling** — All pages clearly marked DEMO / WAITLIST / COMING SOON / EXAMPLE PRICING  
✓ **Local demo only** — SQLite database, no cloud deploys without explicit approval

---

## Pricing & Beta Access

**⚠️ DEMO PLACEHOLDER PRICING — NOT FINAL OFFERS ⚠️**

Three-tier structure planned (Starter, Professional, Portfolio) with beta pricing for early adopters.

**No pricing is live yet.** Final pricing will be announced at launch. Waitlist members receive priority notification and early access to beta pricing.

**DO NOT COMMIT TO ANY PRICING UNTIL GRANT APPROVES VIA CoS.**

---

## Next Steps for Your Property

1. **Join Waitlist:** Reserve your spot for beta access at [http://localhost:3100/waitlist](http://localhost:3100/waitlist)
2. **Try Interactive Demo:** Explore all 11 steps hands-on at [http://localhost:3100/demo](http://localhost:3100/demo)
3. **Review Walkthrough Script:** Detailed demo guide at [http://localhost:3100/demo/walkthrough](http://localhost:3100/demo/walkthrough)
4. **Contact for Questions:** Email grant@thebrowns.co.za with your operational pain points

**No paid signup yet.** Waitlist captures interest; beta invitations will roll out based on operational fit and feedback quality.

---

_GuestFlow · Sales Leave-Behind Pack (Phase 26) · DRAFT/Fixtures Only_  
_Built by The Browns Guest Suites portfolio · ${tenantName}_  
_All sample amounts from fixtures only—never invented. Hard gates respected throughout demo._
`
}

function generateWalkthroughSummary(): string {
  return `# GuestFlow Demo Walkthrough Summary

## Purpose
Complete sales presentation guide for showcasing all 11 phases of GuestFlow demo.

## Demo Flow (20-25 minutes)

### Phase 1-3: Discovery & Lead Capture
- Landing page value prop
- Pricing structure (DEMO PLACEHOLDER labels)
- Waitlist lead capture

### Phase 4-5: Sales Pipeline & Setup
- CRM status tracking (New→Contacted→Qualified→Won/Lost)
- Rate card upload (CSV/JSON, tenant-scoped)

### Phase 6-8: Core Automation
- Inquiry intake (heuristic extraction)
- Quote draft generation (from rate cards or [RATE CARD REQUIRED])
- NightsBridge CSV import (gap detection, late check-ins)

### Phase 9-11: Operations Automation
- Welcome pack generation
- Daily ops brief (RED/AMBER/GREEN)
- CT-pack assembly (dated leave-behind)

## Key Talking Points
- Multi-property operations from day one
- Human approval gates on all guest communication
- Never invents rates or pricing
- Local demo only (SQLite, no cloud secrets)
- DEMO labeling on all pages

## Objection Handling
- **Why waitlist?** Building with real operator feedback for product-market fit
- **OTA integrations?** NightsBridge CSV works today; live APIs on post-launch roadmap
- **Payments?** Draft payment links in Phase 7+; all financial ops require H7 approval
- **Multi-property?** Tenant-scoped from day one; each property isolated in unified dashboard

---

_See /demo/walkthrough for complete step-by-step script_
`
}

function generateCTPackReminder(): string {
  return `# CT-Pack Communication Reminder

## What Is a CT-Pack?
Dated leave-behind pack combining:
- Daily operations brief
- Welcome message stubs
- Late check-in queue
- Booking change check (if applicable)

## Purpose
Single artifact Grant/Liana can review before morning guest communications.

## Demo Flow
1. View bookings board → identify arriving/in-house/departing
2. Generate daily ops brief with RED/AMBER/GREEN priorities
3. Generate welcome stubs for same-day/upcoming arrivals
4. Check late check-in queue for after-hours arrivals
5. Assemble all into one dated pack (markdown/HTML export)

## Hard Gates
- All communications are DRAFT ONLY
- Requires H1/H2 approval before sending to guests
- Never invents guest phone or ETAs
- Missing fields flagged as [PLACEHOLDER]

---

_See /demo/ct-pack for complete assembly demo_
`
}

function generateOTAWorksheet(
  inquiryWithAmounts: InquiryFixture | null,
  inquiryWithoutAmounts: InquiryFixture | null
): string {
  return `# OTA Worksheet Sample (Demo Fixtures Only)

## Purpose
Track inquiry→quote→booking pipeline for OTA and direct bookings.

## Sample Inquiries

${inquiryWithAmounts ? `### Inquiry 1: ${inquiryWithAmounts.guestName}
- **Dates:** ${inquiryWithAmounts.checkIn} to ${inquiryWithAmounts.checkOut} (${inquiryWithAmounts.nights} nights)
- **Party:** ${inquiryWithAmounts.adults} adults${inquiryWithAmounts.children > 0 ? `, ${inquiryWithAmounts.children} children` : ''}
- **Property:** ${inquiryWithAmounts.property}
- **Room:** ${inquiryWithAmounts.room}
- **Quoted Rate:** ${inquiryWithAmounts.amounts?.currency} ${inquiryWithAmounts.amounts?.ratePerNight}/night (${inquiryWithAmounts.amounts?.season} season)
- **Status:** Quote sent (DRAFT)

` : ''}

${inquiryWithoutAmounts ? `### Inquiry 2: ${inquiryWithoutAmounts.guestName}
- **Dates:** ${inquiryWithoutAmounts.checkIn} to ${inquiryWithoutAmounts.checkOut} (${inquiryWithoutAmounts.nights} nights)
- **Party:** ${inquiryWithoutAmounts.adults} adults${inquiryWithoutAmounts.children > 0 ? `, ${inquiryWithoutAmounts.children} children` : ''}
- **Property:** ${inquiryWithoutAmounts.property}
- **Room:** ${inquiryWithoutAmounts.room}
- **Quoted Rate:** [RATE CARD REQUIRED]
- **Status:** Availability check sent (DRAFT)

` : ''}

## Next Steps
1. Upload rate cards via /demo/rate-card-upload
2. Generate quotes via /demo/quote-draft
3. Track conversions in CRM (/crm)

---

_⚠️ All samples from DEMO fixtures only. Never invents rates._
`
}

function generateInquirySample(inquiry: InquiryFixture, hasAmounts: boolean): string {
  return `# Inquiry Sample: ${inquiry.guestName}

## Guest Details
- **Name:** ${inquiry.guestName}
- **Email:** ${inquiry.email}
- **Phone:** ${inquiry.phone}

## Booking Details
- **Check-In:** ${inquiry.checkIn}
- **Check-Out:** ${inquiry.checkOut}
- **Nights:** ${inquiry.nights}
- **Party:** ${inquiry.adults} adults${inquiry.children > 0 ? `, ${inquiry.children} children` : ''}
${inquiry.pets ? '- **Pets:** Yes' : ''}

## Property & Room
- **Property:** ${inquiry.property}
- **Room:** ${inquiry.room}

## Special Requests
${inquiry.specialRequests && inquiry.specialRequests.length > 0 
  ? inquiry.specialRequests.map(req => `- ${req}`).join('\n')
  : '- None'}

${inquiry.occasion ? `## Occasion\n${inquiry.occasion}` : ''}

${hasAmounts && inquiry.amounts ? `
## Quoted Rates (From Fixture Only)
- **Rate:** ${inquiry.amounts.currency} ${inquiry.amounts.ratePerNight}/night
- **Season:** ${inquiry.amounts.season}
- **Subtotal:** ${inquiry.amounts.currency} ${(inquiry.amounts.ratePerNight * inquiry.nights).toLocaleString()}
- **Tax (15%):** ${inquiry.amounts.currency} ${((inquiry.amounts.ratePerNight * inquiry.nights) * 0.15).toLocaleString()}
- **Total:** ${inquiry.amounts.currency} ${((inquiry.amounts.ratePerNight * inquiry.nights) * 1.15).toLocaleString()}

_⚠️ DEMO AMOUNTS FROM FIXTURE ONLY_
` : `
## Quoted Rates
**[RATE CARD REQUIRED]** — No amounts in inquiry text; availability-only confirmation.

_⚠️ Never invents pricing. Upload rate card via /demo/rate-card-upload._
`}

---

_Sample from GuestFlow demo fixtures (Phase 26)_
`
}

function markdownToSimpleHTML(markdown: string): string {
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  // Wrap list items in ul/ol
  html = html.replace(/(<li>.*?<\/li>)(?!<li>)/gs, '<ul>$1</ul>')

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GuestFlow Sales Leave-Behind Pack</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }
        h1 { 
            color: #2563eb; 
            margin-bottom: 0.5em;
            text-align: center;
        }
        h2 { 
            color: #1e40af; 
            margin-top: 2em; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 0.3em; 
        }
        h3 { color: #1e3a8a; }
        ul, ol { 
            margin: 1em 0;
            padding-left: 2em;
        }
        li { margin: 0.5em 0; }
        blockquote { 
            background-color: #dbeafe; 
            border-left: 4px solid #2563eb; 
            padding: 1em; 
            margin: 1em 0;
        }
        hr { 
            border: none; 
            border-top: 1px solid #e5e7eb; 
            margin: 2em 0; 
        }
        @media print {
            body { 
                margin: 0; 
                padding: 20px;
            }
            h2 {
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
    <p>${html}</p>
</body>
</html>`
}
