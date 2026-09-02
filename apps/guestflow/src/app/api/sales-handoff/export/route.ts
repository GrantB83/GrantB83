import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

interface HandoffData {
  inviteCode?: string
  tenantName: string
  prospectName?: string
  demoDate?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      format = 'markdown', 
      inviteCode = '',
      tenantName = 'Demo Guesthouse',
      prospectName = '',
      demoDate = new Date().toLocaleDateString()
    } = body

    const markdown = generateHandoffMarkdown({ inviteCode, tenantName, prospectName, demoDate })

    if (format === 'zip') {
      const zip = new JSZip()
      
      // Add main handoff file
      zip.file('SALES-HANDOFF.md', markdown)
      
      // Add quick-links reference
      const quickLinks = generateQuickLinks(inviteCode, tenantName)
      zip.file('QUICK-LINKS.md', quickLinks)
      
      // Add hard gates reminder
      const hardGates = generateHardGatesReminder()
      zip.file('HARD-GATES.md', hardGates)
      
      const zipBlob = await zip.generateAsync({ type: 'nodebuffer' })
      
      return new NextResponse(zipBlob as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="guestflow-sales-handoff-${demoDate.replace(/\//g, '-')}.zip"`
        }
      })
    }

    if (format === 'html') {
      const html = markdownToSimpleHTML(markdown, tenantName, demoDate)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="guestflow-sales-handoff-${demoDate.replace(/\//g, '-')}.html"`
        }
      })
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="guestflow-sales-handoff-${demoDate.replace(/\//g, '-')}.md"`
      }
    })
  } catch (error) {
    console.error('Sales handoff export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate sales handoff export' },
      { status: 500 }
    )
  }
}

function generateHandoffMarkdown(data: HandoffData): string {
  const { inviteCode, tenantName, prospectName, demoDate } = data
  const greeting = prospectName ? `Dear ${prospectName},` : 'Hello,'

  return `# GuestFlow Post-Demo Sales Handoff Pack

**Demo Date:** ${demoDate}  
**Tenant:** ${tenantName}  
${inviteCode ? `**Your Invite Code:** \`${inviteCode}\`\n` : ''}

---

## Thank You for Your Time

${greeting}

Thank you for exploring GuestFlow with us during today's demo. We hope you saw how our platform can reduce operational heavy lifting while keeping you in control of guest communication and pricing decisions.

**This handoff pack gives you everything you need to explore further and share with your team.**

---

## Your Next Steps

### 1. Try the Demo Yourself

${inviteCode ? `
**Redeem Your Demo Access Code:**
- Visit: [http://localhost:3100/demo/redeem](http://localhost:3100/demo/redeem)
- Enter code: \`${inviteCode}\`
- Unlock full demo tenant access (DEMO ACCESS ONLY—not a paid account)

_Note: This code provides demo access to see how the platform works with sample data. It does NOT create a paid account, subscription, or charge anything._
` : `
**Generate a Demo Invite Code:**
- Visit: [http://localhost:3100/demo/invite-codes](http://localhost:3100/demo/invite-codes)
- Create your own demo access code
- Demo password: \`demo2026\`
`}

### 2. Join the Waitlist

Reserve your spot for beta access:
- **Waitlist Form:** [http://localhost:3100/waitlist](http://localhost:3100/waitlist)
- No payment required
- Priority notification when beta launches

### 3. Explore Key Features

**Core Automation Pages:**
- **Inquiry Intake:** [http://localhost:3100/demo/inquiry-intake](http://localhost:3100/demo/inquiry-intake)
- **Quote Draft:** [http://localhost:3100/demo/quote-draft](http://localhost:3100/demo/quote-draft)
- **Bookings Board:** [http://localhost:3100/demo/bookings-board](http://localhost:3100/demo/bookings-board)
- **Daily Ops Brief:** [http://localhost:3100/demo/daily-brief](http://localhost:3100/demo/daily-brief)
- **Welcome Packs:** [http://localhost:3100/demo/welcome-drafts](http://localhost:3100/demo/welcome-drafts)
- **Late Check-In Queue:** [http://localhost:3100/demo/late-checkin-queue](http://localhost:3100/demo/late-checkin-queue)

**Sales & CRM:**
- **CRM Pipeline:** [http://localhost:3100/crm](http://localhost:3100/crm) (password: demo2026)
${inviteCode ? `- **Invite Usage Report:** [http://localhost:3100/demo/invite-usage](http://localhost:3100/demo/invite-usage)\n` : ''}

**Complete Platform Overview:**
- **Sales Leave-Behind Pack:** [http://localhost:3100/demo/sales-leavebehind](http://localhost:3100/demo/sales-leavebehind)
- **Guided Walkthrough:** [http://localhost:3100/demo/sales-walkthrough](http://localhost:3100/demo/sales-walkthrough)
- **Demo Hub:** [http://localhost:3100/demo](http://localhost:3100/demo)

### 4. Contact Us

Have questions or want to discuss your specific operational needs?

- **Email:** grant@thebrowns.co.za
- **Subject Line:** GuestFlow Demo Follow-Up${prospectName ? ` — ${prospectName}` : ''}

---

## What You Saw Today

### 13-Step Demo Flow

1. **Seed Demo Tenant** — One-click setup with properties, rate cards, and sample data
2. **Tenant Switcher** — Multi-tenant architecture with isolated data
3. **Generate Invite Code** — Create demo access codes for prospects
4. **Redeem Invite Code** — Unlock tenant demo access (DEMO ACCESS ONLY)
5. **Inquiry Intake** — Extract structured booking data from email/WhatsApp text
6. **Quote Draft** — Professional quotes from rate cards or [RATE CARD REQUIRED] placeholders
7. **NightsBridge Import** — CSV booking parser with gap detection
8. **Bookings Board** — Visual timeline with dynamic ops brief generation
9. **Welcome Packs** — Personalized pre-arrival messages
10. **Late Check-In Queue** — Surface late arrivals and unknown ETAs
11. **CT-Pack Assembly** — Dated leave-behind combining ops brief, welcome drafts, late check-ins
12. **Booking Change Check** — Diff snapshots to catch changes before sending
13. **OTA Rate Worksheet** — Export rate cards for OTA channels (DEMO placeholders only)

---

## Important: DEMO ACCESS ONLY

⚠️ **This is a demo environment with placeholder data — NOT a paid account or production setup.**

### What This Demo IS:
- ✅ Local SQLite database with sample data
- ✅ All features working with DRAFT/fixture data
- ✅ Safe environment to explore workflows
- ✅ Complete walkthrough of platform capabilities

### What This Demo IS NOT:
- ❌ NOT a paid account or subscription
- ❌ NOT a signup or payment of any kind
- ❌ NOT connected to live payment processing
- ❌ NOT connected to live WhatsApp/email sending
- ❌ NOT connected to live OTA APIs

---

## Hard Gates (Safety Reminders)

**GuestFlow demo respects these constraints:**

- ❌ **NO live payments** — No Stripe, no card processing
- ❌ **NO paid ads** — No tracking pixels
- ❌ **NO public paid signup** — Waitlist only
- ❌ **NO WhatsApp/email auto-send** — All messaging is DRAFT-only with approval gates
- ❌ **NO invented data** — Rate cards uploaded only, never fabricated; missing rates flagged clearly
- ✅ **Demo labeling** — All pages clearly marked DEMO / WAITLIST / COMING SOON
- ✅ **Local demo only** — SQLite database, no cloud deployments without approval
- ✅ **Demo auth stub** — Simple password (demo2026) for local testing, NOT production auth

---

## Pricing & Beta Access

### Current Status: Demo/Waitlist

**No pricing is live yet.** We're building with real operator feedback to ensure product-market fit.

**Planned Structure:**
- Three-tier model (Starter, Professional, Portfolio)
- Beta pricing for early adopters
- Final pricing announced at launch

**⚠️ IMPORTANT:** Do not commit to any pricing until official launch announcement. All pricing shown in demo is PLACEHOLDER ONLY.

### How to Get Early Access

1. **Join Waitlist:** [http://localhost:3100/waitlist](http://localhost:3100/waitlist)
2. **Share Operational Challenges:** Tell us your biggest pain points in the waitlist notes
3. **Priority Invitation:** Beta invitations roll out based on operational fit and feedback quality

---

## Questions or Feedback?

We'd love to hear your thoughts:

- What operational challenges would GuestFlow solve for you?
- Which features would you use most?
- What's missing from the demo?
- Any concerns about implementation or migration?

**Email us:** grant@thebrowns.co.za

${prospectName ? `\n**Thank you, ${prospectName}!** ` : '**Thank you!** '}We appreciate your time and look forward to hearing from you.

---

_GuestFlow Sales Handoff Pack (Phase 32) · ${demoDate} · DEMO/Fixtures Only_  
_Built by The Browns Guest Suites portfolio · ${tenantName}_  
_All sample data from fixtures only — never invented. Hard gates respected throughout demo._
`
}

function generateQuickLinks(inviteCode: string, tenantName: string): string {
  return `# GuestFlow Quick Links

## Demo Access

${inviteCode ? `
**Your Invite Code:** \`${inviteCode}\`

**Redeem Demo Access:**
- URL: [http://localhost:3100/demo/redeem](http://localhost:3100/demo/redeem)
- Enter code: \`${inviteCode}\`
- Demo tenant: ${tenantName}
` : `
**Generate Invite Code:**
- URL: [http://localhost:3100/demo/invite-codes](http://localhost:3100/demo/invite-codes)
- Demo password: \`demo2026\`
`}

## Core Features

**Inquiry → Quote → Welcome → Operations:**
- Inquiry Intake: [http://localhost:3100/demo/inquiry-intake](http://localhost:3100/demo/inquiry-intake)
- Quote Draft: [http://localhost:3100/demo/quote-draft](http://localhost:3100/demo/quote-draft)
- Welcome Packs: [http://localhost:3100/demo/welcome-drafts](http://localhost:3100/demo/welcome-drafts)
- Daily Ops Brief: [http://localhost:3100/demo/daily-brief](http://localhost:3100/demo/daily-brief)

**Bookings & Operations:**
- Bookings Board: [http://localhost:3100/demo/bookings-board](http://localhost:3100/demo/bookings-board)
- NightsBridge Import: [http://localhost:3100/demo/nightsbridge-import](http://localhost:3100/demo/nightsbridge-import)
- Late Check-In Queue: [http://localhost:3100/demo/late-checkin-queue](http://localhost:3100/demo/late-checkin-queue)
- CT-Pack Assembly: [http://localhost:3100/demo/ct-pack](http://localhost:3100/demo/ct-pack)

**Sales & CRM:**
- CRM Pipeline: [http://localhost:3100/crm](http://localhost:3100/crm) (password: demo2026)
- Waitlist Form: [http://localhost:3100/waitlist](http://localhost:3100/waitlist)
${inviteCode ? `- Invite Usage Report: [http://localhost:3100/demo/invite-usage](http://localhost:3100/demo/invite-usage)\n` : ''}

**Platform Overview:**
- Demo Hub: [http://localhost:3100/demo](http://localhost:3100/demo)
- Sales Leave-Behind: [http://localhost:3100/demo/sales-leavebehind](http://localhost:3100/demo/sales-leavebehind)
- Guided Walkthrough: [http://localhost:3100/demo/sales-walkthrough](http://localhost:3100/demo/sales-walkthrough)

## Waitlist & Contact

- **Join Waitlist:** [http://localhost:3100/waitlist](http://localhost:3100/waitlist)
- **Email:** grant@thebrowns.co.za
- **Subject:** GuestFlow Demo Follow-Up

---

_All links are localhost demo URLs — replace with production domain when live_
`
}

function generateHardGatesReminder(): string {
  return `# Hard Gates Reminder

## What GuestFlow Demo NEVER Does

These safety constraints are respected throughout the demo:

### Financial & Payment
- ❌ **NO live payments** — No Stripe charges, no card processing
- ❌ **NO paid ads** — No Google Ads pixels, no Meta conversion tracking
- ❌ **NO public paid signup** — Waitlist only; demo auth is NOT production-ready

### Communication
- ❌ **NO WhatsApp/email auto-send** — All messaging is DRAFT-only
- ❌ **NO approval gate bypass** — H1/H2 approval required before any send
- ❌ **NO invented contact info** — Uses [PLACEHOLDER] when missing

### Data & Rates
- ❌ **NO invented rates** — Missing rate cards flagged as [RATE CARD REQUIRED]
- ❌ **NO invented guest data** — Never fabricates phone numbers, ETAs, or Wi-Fi codes
- ❌ **NO live OTA API** — CSV import only; live integrations on post-launch roadmap

### Infrastructure
- ✅ **DEMO labeling** — All pages clearly marked DEMO / WAITLIST / COMING SOON
- ✅ **Local demo only** — SQLite database, no cloud deploys without explicit approval
- ✅ **Demo auth stub** — Password \`demo2026\` for local testing, NOT production auth

## Demo Access Clarity

**Invite codes provide DEMO ACCESS ONLY:**
- NOT a paid account
- NOT a signup
- NOT a subscription
- Does NOT create any payment obligation

**Purpose:** Allow prospects to explore platform capabilities with sample data in a safe, local environment.

---

_Hard gates maintained since Phase 1 and respected through Phase 32_
`
}

function markdownToSimpleHTML(markdown: string, tenantName: string, demoDate: string): string {
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
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
    <title>GuestFlow Post-Demo Sales Handoff Pack</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
            background-color: #f9fafb;
        }
        h1 { 
            color: #2563eb; 
            margin-bottom: 0.5em;
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 0.5em;
        }
        h2 { 
            color: #1e40af; 
            margin-top: 2em; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 0.3em; 
        }
        h3 { 
            color: #1e3a8a;
            margin-top: 1.5em;
        }
        p {
            margin: 1em 0;
        }
        ul, ol { 
            margin: 1em 0;
            padding-left: 2em;
        }
        li { 
            margin: 0.5em 0;
        }
        code {
            background-color: #f3f4f6;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            color: #d97706;
        }
        a {
            color: #2563eb;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
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
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 1em;
            margin: 1.5em 0;
        }
        .success {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 1em;
            margin: 1.5em 0;
        }
        @media print {
            body { 
                margin: 0; 
                padding: 20px;
                background-color: white;
            }
            h2 {
                page-break-after: avoid;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <p>${html}</p>
    <div style="margin-top: 3em; padding-top: 2em; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.875em;">
        <p><strong>GuestFlow Post-Demo Sales Handoff Pack (Phase 32)</strong></p>
        <p>${demoDate} · ${tenantName} · DEMO/Fixtures Only</p>
        <p>Built by The Browns Guest Suites portfolio</p>
    </div>
</body>
</html>`
}
