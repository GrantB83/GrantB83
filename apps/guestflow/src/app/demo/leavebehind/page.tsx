'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, FileText, Printer, ArrowLeft } from 'lucide-react'

export default function LeaveBehindPage() {
  const [showMarkdown, setShowMarkdown] = useState(false)

  const leaveBehindContent = generateLeaveBehind()
  const markdownContent = generateMarkdown()

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'guestflow-platform-overview.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="no-print mb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
            📄 PHASE 5 · Sales Leave-Behind
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GuestFlow Platform Overview
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Printable one-pager for post-demo follow-up. 
            Export as markdown for email or print for in-person meetings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-8 flex-wrap">
          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            <Download className="w-5 h-5" />
            Download Markdown
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
          >
            <Printer className="w-5 h-5" />
            Print PDF
          </button>
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            <FileText className="w-5 h-5" />
            {showMarkdown ? 'Show Preview' : 'Show Markdown'}
          </button>
        </div>
      </div>

      {/* Content Display */}
      {showMarkdown ? (
        <div className="bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm overflow-x-auto no-print">
          <pre className="whitespace-pre-wrap">{markdownContent}</pre>
        </div>
      ) : (
        <div className="print-content">
          {leaveBehindContent}
        </div>
      )}

      {/* Back Link */}
      <div className="mt-12 text-center no-print">
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Hub
        </Link>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-content {
            max-width: 100%;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}

function generateLeaveBehind() {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg print-content">
      {/* Header */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          GuestFlow
        </h1>
        <p className="text-lg text-gray-600">
          Multi-Property Guest Operations Platform
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Built by guesthouse owners, for guesthouse operators
        </p>
      </div>

      {/* What It Is */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">What It Is</h2>
        <p className="text-gray-700 mb-3">
          GuestFlow automates the operational heavy lifting for multi-property guesthouse portfolios. 
          From inquiry to checkout, manage all your properties in one tenant-scoped platform.
        </p>
        <p className="text-gray-700">
          <strong>Current Status:</strong> Demo/Waitlist phase. Built with proven workflows from 
          The Browns portfolio (Dullstroom + regional properties).
        </p>
      </section>

      {/* Core Features */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Core Features</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <FeatureItem
            title="Smart Inquiry Intake"
            description="Auto-extract guest details, dates, and requirements from emails into structured JSON"
          />
          <FeatureItem
            title="Quote & Invoice Drafts"
            description="Professional quotes from your rate cards—never invents pricing"
          />
          <FeatureItem
            title="Daily Operations Brief"
            description="Morning coordination: arrivals, departures, housekeeping schedules"
          />
          <FeatureItem
            title="Guest Welcome Packs"
            description="Personalized pre-arrival messages with property details"
          />
          <FeatureItem
            title="NightsBridge CSV Import"
            description="Parse OTA bookings, detect gaps, flag late check-ins"
          />
          <FeatureItem
            title="Multi-Tenant Architecture"
            description="Each operator gets isolated sandbox with portfolio properties"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">How It Works</h2>
        <ol className="space-y-2 text-gray-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <span><strong>Connect Your Email:</strong> Forward inquiries or integrate booking inbox</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <span><strong>Set Your Rules:</strong> Upload rate cards, property details, operational preferences</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <span><strong>Review & Approve:</strong> All drafts require human approval—no auto-sends, ever</span>
          </li>
        </ol>
      </section>

      {/* Why Multi-Tenant */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Why Multi-Property Support Matters</h2>
        <p className="text-gray-700 mb-2">
          Managing 3+ guesthouses means juggling multiple inboxes, rate sheets, and housekeeping calendars. 
          GuestFlow consolidates operations while keeping each property's data isolated and secure.
        </p>
        <p className="text-gray-700">
          <strong>Tenant-scoped architecture</strong> means your Dullstroom rates never mix with your 
          Clarens availability—each property operates independently within your unified dashboard.
        </p>
      </section>

      {/* Roadmap */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Roadmap Highlights</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Phase 1 (Current):</strong> Core automation demos + waitlist
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Phase 2:</strong> Production authentication, live OTA API integrations
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Phase 3:</strong> Email/WhatsApp sending (approval-gated), payment links
          </p>
          <p className="text-sm text-gray-700">
            <strong>Phase 4+:</strong> Analytics dashboard, automated lead campaigns, team permissions
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Pricing</h2>
        <p className="text-gray-700 mb-2">
          <strong>COMING SOON</strong> — Three-tier structure planned (Starter, Professional, Portfolio).
        </p>
        <p className="text-gray-700">
          Beta access program will offer early adopter pricing. 
          Join waitlist for priority notification when launch pricing is announced.
        </p>
      </section>

      {/* Safety Constraints */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Safety & Control</h2>
        <ul className="space-y-1.5 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>All messaging drafts require human approval before sending</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Never invents rates—missing rate cards flagged explicitly</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>No auto-charges or payment processing without explicit approval gates</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Multi-tenant data isolation—your properties stay separate</span>
          </li>
        </ul>
      </section>

      {/* Next Steps */}
      <section className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Next Steps</h2>
        <ol className="space-y-2 text-gray-700 mb-4">
          <li><strong>1. Join Waitlist:</strong> Reserve your spot for beta access</li>
          <li><strong>2. Try Interactive Demo:</strong> Explore inquiry intake, quotes, and daily briefs</li>
          <li><strong>3. Share Feedback:</strong> Help shape the platform with your operational needs</li>
        </ol>
        <p className="text-sm text-gray-600">
          <strong>Contact:</strong> grant@thebrowns.co.za · Built by The Browns Guest Suites
        </p>
      </section>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <p><strong>GuestFlow</strong> · Demo Platform · No live payments or automated messaging</p>
        <p className="mt-1">Powered by proven guesthouse automation from The Browns portfolio</p>
      </div>
    </div>
  )
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-primary-600 font-bold flex-shrink-0">→</span>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
    </div>
  )
}

function generateMarkdown(): string {
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
