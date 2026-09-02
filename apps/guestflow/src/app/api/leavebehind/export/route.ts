import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { format = 'markdown' } = body

    const markdown = generateMarkdownLeaveBehind()

    if (format === 'html') {
      const html = markdownToSimpleHTML(markdown)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': 'attachment; filename="guestflow-platform-overview.html"'
        }
      })
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="guestflow-platform-overview.md"'
      }
    })
  } catch (error) {
    console.error('Leave-behind export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate leave-behind export' },
      { status: 500 }
    )
  }
}

function generateMarkdownLeaveBehind(): string {
  return `# GuestFlow Platform Overview

**Multi-Property Guest Operations Platform**  
_Built by guesthouse owners, for guesthouse operators_

---

## What It Is

GuestFlow automates the operational heavy lifting for multi-property guesthouse portfolios. From inquiry to checkout, manage all your properties in one tenant-scoped platform.

**Current Status:** Demo/Waitlist phase. Built with proven workflows from The Browns portfolio (Dullstroom + regional properties).

---

## Core Features

- **Smart Inquiry Intake:** Auto-extract guest details, dates, and requirements from emails into structured JSON
- **Quote & Invoice Drafts:** Professional quotes from your rate cards—never invents pricing
- **Daily Operations Brief:** Morning coordination: arrivals, departures, housekeeping schedules
- **Guest Welcome Packs:** Personalized pre-arrival messages with property details
- **NightsBridge CSV Import:** Parse OTA bookings, detect gaps, flag late check-ins
- **Multi-Tenant Architecture:** Each operator gets isolated sandbox with portfolio properties

---

## How It Works

1. **Connect Your Email:** Forward inquiries or integrate booking inbox
2. **Set Your Rules:** Upload rate cards, property details, operational preferences
3. **Review & Approve:** All drafts require human approval—no auto-sends, ever

---

## Why Multi-Property Support Matters

Managing 3+ guesthouses means juggling multiple inboxes, rate sheets, and housekeeping calendars. GuestFlow consolidates operations while keeping each property's data isolated and secure.

**Tenant-scoped architecture** means your Dullstroom rates never mix with your Clarens availability—each property operates independently within your unified dashboard.

---

## Roadmap Highlights

- **Phase 1 (Current):** Core automation demos + waitlist
- **Phase 2:** Production authentication, live OTA API integrations
- **Phase 3:** Email/WhatsApp sending (approval-gated), payment links
- **Phase 4+:** Analytics dashboard, automated lead campaigns, team permissions

---

## Pricing

**COMING SOON** — Three-tier structure planned (Starter, Professional, Portfolio).

Beta access program will offer early adopter pricing. Join waitlist for priority notification when launch pricing is announced.

---

## Safety & Control

✓ All messaging drafts require human approval before sending  
✓ Never invents rates—missing rate cards flagged explicitly  
✓ No auto-charges or payment processing without explicit approval gates  
✓ Multi-tenant data isolation—your properties stay separate

---

## Next Steps

1. **Join Waitlist:** Reserve your spot for beta access
2. **Try Interactive Demo:** Explore inquiry intake, quotes, and daily briefs
3. **Share Feedback:** Help shape the platform with your operational needs

**Contact:** grant@thebrowns.co.za  
**Built by:** The Browns Guest Suites

---

_GuestFlow · Demo Platform · No live payments or automated messaging_  
_Powered by proven guesthouse automation from The Browns portfolio_
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
    <title>GuestFlow Platform Overview</title>
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
