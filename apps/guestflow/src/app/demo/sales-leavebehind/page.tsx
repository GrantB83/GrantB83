'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, FileText, Printer, ArrowLeft, FileArchive } from 'lucide-react'
import { useTenant } from '@/components/TenantContext'

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

export default function SalesLeaveBehindPage() {
  const [showMarkdown, setShowMarkdown] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { activeTenant } = useTenant()
  const [inquiryWithAmounts, setInquiryWithAmounts] = useState<InquiryFixture | null>(null)
  const [inquiryWithoutAmounts, setInquiryWithoutAmounts] = useState<InquiryFixture | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFixtures() {
      try {
        const [withAmountsRes, withoutAmountsRes] = await Promise.all([
          fetch('/fixtures/inquiry-with-amounts.txt'),
          fetch('/fixtures/inquiry-without-amounts.txt')
        ])
        
        const withAmountsJson = await withAmountsRes.json()
        const withoutAmountsJson = await withoutAmountsRes.json()
        
        setInquiryWithAmounts(withAmountsJson)
        setInquiryWithoutAmounts(withoutAmountsJson)
      } catch (error) {
        console.error('Failed to load fixtures:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadFixtures()
  }, [])

  const tenantName = activeTenant?.name || 'Demo Guesthouse'
  const leaveBehindContent = generateLeaveBehind(tenantName, inquiryWithAmounts, inquiryWithoutAmounts)
  const markdownContent = generateMarkdown(tenantName, inquiryWithAmounts, inquiryWithoutAmounts)

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'guestflow-sales-leavebehind.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = async (format: 'markdown' | 'html') => {
    setExporting(true)
    try {
      const response = await fetch('/api/sales-leavebehind/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          format,
          tenantName,
          inquiryWithAmounts,
          inquiryWithoutAmounts
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guestflow-sales-leavebehind.${format === 'markdown' ? 'md' : 'html'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export leave-behind. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/sales-leavebehind/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          format: 'html',
          tenantName,
          inquiryWithAmounts,
          inquiryWithoutAmounts
        })
      })

      if (!response.ok) {
        throw new Error('Print preparation failed')
      }

      const htmlContent = await response.text()
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    } catch (error) {
      console.error('Print error:', error)
      alert('Failed to prepare leave-behind for printing. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadZip = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/sales-leavebehind/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          format: 'zip',
          tenantName,
          inquiryWithAmounts,
          inquiryWithoutAmounts
        })
      })

      if (!response.ok) {
        throw new Error('ZIP export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'guestflow-sales-leavebehind.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('ZIP export error:', error)
      alert('Failed to export ZIP. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="no-print mb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
            🎯 PHASE 26 · Sales Leave-Behind Pack (DRAFT/Fixtures Only)
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GuestFlow Sales Leave-Behind Pack
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Complete sales leave-behind for prospects after Phase 25 walkthrough demo. 
            Includes product overview, 11-step demo path, hard gates, sample fixtures, and next steps.
            {loading && <span className="block mt-2 text-sm text-blue-600">Loading sample fixtures...</span>}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-8 flex-wrap">
          <button
            onClick={() => handleExport('markdown')}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Download Markdown
          </button>
          <button
            onClick={() => handleExport('html')}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Download HTML
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileArchive className="w-5 h-5" />
            Download ZIP
          </button>
          <button
            onClick={handlePrint}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-5 h-5" />
            Print to PDF
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

function generateLeaveBehind(
  tenantName: string,
  inquiryWithAmounts: InquiryFixture | null,
  inquiryWithoutAmounts: InquiryFixture | null
) {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg print-content">
      {/* Header */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          GuestFlow Sales Leave-Behind Pack
        </h1>
        <p className="text-lg text-gray-600">
          Multi-Property Guest Operations Platform Demo
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {tenantName} · DRAFT / Fixtures Only
        </p>
      </div>

      {/* Product One-Pager */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">What Is GuestFlow?</h2>
        <p className="text-gray-700 mb-3">
          GuestFlow is a multi-tenant SaaS platform that automates guesthouse operations from inquiry to checkout. 
          Built by actual guesthouse owners (The Browns portfolio), GuestFlow eliminates operational heavy lifting while 
          keeping humans in control of guest communication and pricing decisions.
        </p>
        <p className="text-gray-700">
          <strong>Current Status:</strong> Demo/Waitlist phase with proven workflows ready for beta testing.
        </p>
      </section>

      {/* 11-Step Demo Path Summary */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">11-Step Demo Walkthrough Path</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">1.</span>
              <span><strong>Landing Page</strong> → Multi-property value prop with explicit Inquiry→Quote→Welcome→Operations flow</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">2.</span>
              <span><strong>Pricing Page</strong> → Three-tier structure with DEMO PLACEHOLDER labels (not live offers)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">3.</span>
              <span><strong>Waitlist Form</strong> → Lead capture with property details, room count, current system</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">4.</span>
              <span><strong>CRM Pipeline</strong> → Status tracking (New→Contacted→Qualified→Won/Lost), CSV export</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">5.</span>
              <span><strong>Rate Card Upload</strong> → CSV/JSON seasonal rates with tenant-scoped SQLite storage</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">6.</span>
              <span><strong>Inquiry Intake</strong> → Heuristic extraction from email/WhatsApp text into structured JSON</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">7.</span>
              <span><strong>Quote Draft</strong> → Professional quotes from rate cards or [RATE CARD REQUIRED] placeholders</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">8.</span>
              <span><strong>NightsBridge Import</strong> → CSV booking parser with gap detection and late check-in alerts</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">9.</span>
              <span><strong>Welcome Packs</strong> → Personalized pre-arrival messages with property facts</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">10.</span>
              <span><strong>Daily Ops Brief</strong> → Morning coordination with RED/AMBER/GREEN priority system</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary-600">11.</span>
              <span><strong>CT-Pack Assembly</strong> → Dated leave-behind combining ops brief, welcome drafts, late check-ins</span>
            </li>
          </ol>
        </div>
      </section>

      {/* Sample Fixture: Inquiry→Quote Flow */}
      {inquiryWithAmounts && (
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Sample Fixture: Inquiry→Quote (With Amounts)</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Inquiry Extract:</h3>
            <ul className="text-sm text-gray-700 space-y-1 mb-3">
              <li>• Guest: {inquiryWithAmounts.guestName}</li>
              <li>• Dates: {inquiryWithAmounts.checkIn} to {inquiryWithAmounts.checkOut} ({inquiryWithAmounts.nights} nights)</li>
              <li>• Party: {inquiryWithAmounts.adults} adults{inquiryWithAmounts.children > 0 && `, ${inquiryWithAmounts.children} children`}</li>
              <li>• Property: {inquiryWithAmounts.property}</li>
              <li>• Room: {inquiryWithAmounts.room}</li>
              {inquiryWithAmounts.specialRequests && inquiryWithAmounts.specialRequests.length > 0 && (
                <li>• Special Requests: {inquiryWithAmounts.specialRequests.join(', ')}</li>
              )}
            </ul>
            <h3 className="font-semibold text-gray-900 mb-2">Quote Draft (From Fixture Amounts Only):</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Rate: {inquiryWithAmounts.amounts.currency} {inquiryWithAmounts.amounts.ratePerNight}/night ({inquiryWithAmounts.amounts.season} season)</li>
              <li>• Subtotal: {inquiryWithAmounts.amounts.currency} {(inquiryWithAmounts.amounts.ratePerNight * inquiryWithAmounts.nights).toLocaleString()}</li>
              <li>• Tax (15%): {inquiryWithAmounts.amounts.currency} {((inquiryWithAmounts.amounts.ratePerNight * inquiryWithAmounts.nights) * 0.15).toLocaleString()}</li>
              <li>• <strong>Total: {inquiryWithAmounts.amounts.currency} {((inquiryWithAmounts.amounts.ratePerNight * inquiryWithAmounts.nights) * 1.15).toLocaleString()}</strong></li>
            </ul>
            <p className="text-xs text-gray-600 mt-2 italic">
              ⚠️ DEMO AMOUNTS FROM FIXTURE ONLY — Never invents pricing. Missing rates show [RATE CARD REQUIRED].
            </p>
          </div>
        </section>
      )}

      {inquiryWithoutAmounts && (
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Sample Fixture: Inquiry→Availability Check (No Amounts)</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Inquiry Extract:</h3>
            <ul className="text-sm text-gray-700 space-y-1 mb-3">
              <li>• Guest: {inquiryWithoutAmounts.guestName}</li>
              <li>• Dates: {inquiryWithoutAmounts.checkIn} to {inquiryWithoutAmounts.checkOut} ({inquiryWithoutAmounts.nights} nights)</li>
              <li>• Party: {inquiryWithoutAmounts.adults} adults{inquiryWithoutAmounts.children > 0 && `, ${inquiryWithoutAmounts.children} children`}</li>
              <li>• Property: {inquiryWithoutAmounts.property}</li>
              <li>• Room: {inquiryWithoutAmounts.room}</li>
            </ul>
            <h3 className="font-semibold text-gray-900 mb-2">Quote Draft (Availability-Only):</h3>
            <p className="text-sm text-gray-700 mb-2">
              We have availability for your requested dates at {inquiryWithoutAmounts.property}. 
              Specific rates: <strong className="text-amber-700">[RATE CARD REQUIRED]</strong>
            </p>
            <p className="text-xs text-gray-600 mt-2 italic">
              ⚠️ No rates in inquiry text → availability-only confirmation. Never invents pricing.
            </p>
          </div>
        </section>
      )}

      {/* Hard Gates */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Hard Gates (What GuestFlow Never Does)</h2>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span><strong>NO live payments</strong> — No Stripe charges, no card processing, no payment links without H7 approval</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span><strong>NO paid ads</strong> — No Google Ads pixels, no Meta conversion tracking until launch</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span><strong>NO public signup</strong> — Waitlist only; demo auth stub is NOT production-ready</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span><strong>NO WhatsApp/email auto-send</strong> — All messaging is DRAFT-only with approval gates (H1/H2)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600 font-bold">✗</span>
              <span><strong>NO invented rates</strong> — Missing rate cards flagged as [RATE CARD REQUIRED], never fabricated</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>DEMO labeling</strong> — All pages clearly marked DEMO / WAITLIST / COMING SOON / EXAMPLE PRICING</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Local demo only</strong> — SQLite database, no cloud deploys without explicit approval</span>
            </li>
          </ul>
        </div>
      </section>

      {/* DEMO Pricing Note */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Pricing & Beta Access</h2>
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
          <p className="text-amber-900 font-bold mb-2">⚠️ DEMO PLACEHOLDER PRICING — NOT FINAL OFFERS ⚠️</p>
          <p className="text-gray-700 mb-2 text-sm">
            Three-tier structure planned (Starter, Professional, Portfolio) with beta pricing for early adopters.
          </p>
          <p className="text-gray-700 text-sm mb-2">
            <strong>No pricing is live yet.</strong> Final pricing will be announced at launch. 
            Waitlist members receive priority notification and early access to beta pricing.
          </p>
          <p className="text-red-700 font-bold text-sm">
            DO NOT COMMIT TO ANY PRICING UNTIL GRANT APPROVES VIA CoS.
          </p>
        </div>
      </section>

      {/* Next Steps for Prospect */}
      <section className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Next Steps for Your Property</h2>
        <ol className="space-y-2 text-gray-700 mb-4">
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">1.</span>
            <span><strong>Join Waitlist:</strong> Reserve your spot for beta access at <a href="/waitlist" className="text-primary-600 hover:underline">/waitlist</a></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">2.</span>
            <span><strong>Try Interactive Demo:</strong> Explore all 11 steps hands-on at <a href="/demo" className="text-primary-600 hover:underline">/demo</a></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">3.</span>
            <span><strong>Review Walkthrough Script:</strong> Detailed demo guide at <a href="/demo/walkthrough" className="text-primary-600 hover:underline">/demo/walkthrough</a></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">4.</span>
            <span><strong>Contact for Questions:</strong> Email grant@thebrowns.co.za with your operational pain points</span>
          </li>
        </ol>
        <p className="text-sm text-gray-600">
          <strong>No paid signup yet.</strong> Waitlist captures interest; beta invitations will roll out based on operational fit and feedback quality.
        </p>
      </section>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <p><strong>GuestFlow</strong> · Sales Leave-Behind Pack (Phase 26) · DRAFT/Fixtures Only</p>
        <p className="mt-1">Built by The Browns Guest Suites portfolio · {tenantName}</p>
        <p className="mt-1 text-xs">All sample amounts from fixtures only—never invented. Hard gates respected throughout demo.</p>
      </div>
    </div>
  )
}

function generateMarkdown(
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
