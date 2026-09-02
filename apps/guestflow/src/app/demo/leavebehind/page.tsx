'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, FileText, Printer, ArrowLeft } from 'lucide-react'

interface WaitlistData {
  waitlistCount: number
  leadsByStatus: Array<{ status: string; count: number }>
  recentLeads: Array<{ name: string; property_name: string; room_count: string; created_at: string }>
}

export default function LeaveBehindPage() {
  const [showMarkdown, setShowMarkdown] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [waitlistData, setWaitlistData] = useState<WaitlistData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWaitlistData() {
      try {
        const response = await fetch('/api/waitlist')
        if (response.ok) {
          const leads = await response.json()
          
          // Calculate status breakdown
          const statusMap: Record<string, number> = {}
          leads.forEach((lead: { status?: string }) => {
            const status = lead.status || 'new'
            statusMap[status] = (statusMap[status] || 0) + 1
          })
          
          const leadsByStatus = Object.entries(statusMap).map(([status, count]) => ({
            status,
            count: count as number
          }))

          setWaitlistData({
            waitlistCount: leads.length,
            leadsByStatus,
            recentLeads: leads.slice(0, 5).map((l: { 
              name: string
              property_name: string
              room_count: string
              created_at: string 
            }) => ({
              name: l.name,
              property_name: l.property_name,
              room_count: l.room_count,
              created_at: l.created_at
            }))
          })
        }
      } catch (error) {
        console.error('Failed to fetch waitlist data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWaitlistData()
  }, [])

  const leaveBehindContent = generateLeaveBehind(waitlistData)
  const markdownContent = generateMarkdown(waitlistData)

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

  const handleExport = async (format: 'markdown' | 'html') => {
    setExporting(true)
    try {
      const response = await fetch('/api/leavebehind/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guestflow-platform-overview.${format === 'markdown' ? 'md' : 'html'}`
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
      const response = await fetch('/api/leavebehind/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'html' })
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="no-print mb-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium mb-4">
            📄 PHASE 13 → 15 · Sales Leave-Behind with Real Data
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GuestFlow Platform Overview
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Printable one-pager for post-demo follow-up. 
            Export as markdown or HTML, or print directly to PDF.
            {loading && <span className="block mt-2 text-sm text-blue-600">Loading waitlist data...</span>}
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

function generateLeaveBehind(data: WaitlistData | null) {
  if (!data) {
    return (
      <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg print-content">
        <p className="text-center text-gray-500">Loading waitlist data...</p>
      </div>
    )
  }

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

      {/* Phase 15: Waitlist & CRM Summary */}
      <section className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Waitlist & CRM Summary (Real Data)</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-sm text-gray-700 font-semibold mb-2">Total Leads: <span className="text-2xl text-primary-600">{data.waitlistCount}</span></p>
            <p className="text-sm text-gray-700 font-semibold mb-1">Status Breakdown:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              {data.leadsByStatus.map(s => (
                <li key={s.status}>• {s.status}: {s.count}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-semibold mb-2">Recent Inquiries (Last 5):</p>
            <ul className="text-xs text-gray-600 space-y-1.5">
              {data.recentLeads.length > 0 ? (
                data.recentLeads.map((lead, i) => (
                  <li key={i}>
                    {lead.name} ({lead.property_name}, {lead.room_count} rooms) — {new Date(lead.created_at).toLocaleDateString()}
                  </li>
                ))
              ) : (
                <li>No leads yet</li>
              )}
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          <strong>Demo Walkthrough:</strong> <a href="/demo/walkthrough" className="text-primary-600 hover:underline">/demo/walkthrough</a>
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
            <strong>Phase 1–15 (Current):</strong> Core automation demos + waitlist + sales leave-behind + Docker hosting
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Phase 16+:</strong> Production authentication, live OTA API integrations
          </p>
          <p className="text-sm text-gray-700">
            <strong>Future:</strong> Email/WhatsApp sending (approval-gated), payment links, analytics dashboard
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Pricing</h2>
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
          <p className="text-amber-900 font-bold mb-2">⚠️ DEMO PLACEHOLDER — NOT FINAL PRICING ⚠️</p>
          <p className="text-gray-700 mb-2 text-sm">
            Three-tier structure planned (Starter, Professional, Portfolio).
          </p>
          <p className="text-gray-700 text-sm">
            <strong>No pricing is live yet.</strong> Beta access program will offer early adopter pricing. 
            Join waitlist for priority notification when launch pricing is announced.
          </p>
          <p className="text-red-700 font-bold text-sm mt-2">
            DO NOT COMMIT TO ANY PRICING UNTIL GRANT APPROVES VIA CoS.
          </p>
        </div>
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
            <span>Local/demo hosting available via Docker (no cloud secrets required)</span>
          </li>
        </ul>
      </section>

      {/* Next Steps */}
      <section className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Next Steps</h2>
        <ol className="space-y-2 text-gray-700 mb-4">
          <li><strong>1. Join Waitlist:</strong> Reserve your spot for beta access at <a href="/waitlist" className="text-primary-600 hover:underline">/waitlist</a></li>
          <li><strong>2. Try Interactive Demo:</strong> Explore inquiry intake, quotes, and daily briefs at <a href="/demo" className="text-primary-600 hover:underline">/demo</a></li>
          <li><strong>3. View Walkthrough Script:</strong> Step-by-step demo guide at <a href="/demo/walkthrough" className="text-primary-600 hover:underline">/demo/walkthrough</a></li>
          <li><strong>4. Share Feedback:</strong> Help shape the platform with your operational needs</li>
        </ol>
        <p className="text-sm text-gray-600">
          <strong>Contact:</strong> grant@thebrowns.co.za · Built by The Browns Guest Suites
        </p>
      </section>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <p><strong>GuestFlow</strong> · Demo Platform · No live payments or automated messaging</p>
        <p className="mt-1">Powered by proven guesthouse automation from The Browns portfolio</p>
        <p className="mt-1 text-xs">Phase 15: Local demo hosting ready (Docker) · CoS approval required for public launch</p>
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

function generateMarkdown(data: WaitlistData | null): string {
  if (!data) {
    return '# GuestFlow Platform Overview\n\nLoading waitlist data...'
  }

  const statusBreakdown = data.leadsByStatus
    .map(s => `  - ${s.status}: ${s.count}`)
    .join('\n')

  const recentLeadsText = data.recentLeads.length > 0
    ? data.recentLeads
        .map(l => `  - ${l.name} (${l.property_name}, ${l.room_count} rooms) — ${new Date(l.created_at).toLocaleDateString()}`)
        .join('\n')
    : '  - No leads yet'

  return `# GuestFlow Platform Overview

**Multi-Property Guest Operations Platform**  
_Built by guesthouse owners, for guesthouse operators_

---

## What It Is

GuestFlow automates the operational heavy lifting for multi-property guesthouse portfolios. From inquiry to checkout, manage all your properties in one tenant-scoped platform.

**Current Status:** Demo/Waitlist phase. Built with proven workflows from The Browns portfolio (Dullstroom + regional properties).

---

## Waitlist & CRM Summary (Real Data)

**Total Waitlist Leads:** ${data.waitlistCount}

**Status Breakdown:**
${statusBreakdown}

**Recent Inquiries (Last 5):**
${recentLeadsText}

**Demo Walkthrough:** [http://localhost:3100/demo/walkthrough](http://localhost:3100/demo/walkthrough)

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

- **Phase 1–15 (Current):** Core automation demos + waitlist + sales leave-behind + Docker hosting
- **Phase 16+:** Production authentication, live OTA API integrations
- **Future:** Email/WhatsApp sending (approval-gated), payment links, analytics dashboard

---

## Pricing

**⚠️ DEMO PLACEHOLDER — NOT FINAL PRICING ⚠️**

Three-tier structure planned (Starter, Professional, Portfolio). 

**No pricing is live yet.** Beta access program will offer early adopter pricing. 
Join waitlist for priority notification when launch pricing is announced.

**DO NOT COMMIT TO ANY PRICING UNTIL GRANT APPROVES VIA CoS.**

---

## Safety & Control

✓ All messaging drafts require human approval before sending  
✓ Never invents rates—missing rate cards flagged explicitly  
✓ No auto-charges or payment processing without explicit approval gates  
✓ Multi-tenant data isolation—your properties stay separate  
✓ Local/demo hosting available via Docker (no cloud secrets required)

---

## Next Steps

1. **Join Waitlist:** Reserve your spot for beta access at [http://localhost:3100/waitlist](http://localhost:3100/waitlist)
2. **Try Interactive Demo:** Explore inquiry intake, quotes, and daily briefs at [http://localhost:3100/demo](http://localhost:3100/demo)
3. **View Walkthrough Script:** Step-by-step demo guide at [http://localhost:3100/demo/walkthrough](http://localhost:3100/demo/walkthrough)
4. **Share Feedback:** Help shape the platform with your operational needs

**Contact:** grant@thebrowns.co.za  
**Built by:** The Browns Guest Suites

---

_GuestFlow · Demo Platform · No live payments or automated messaging_  
_Powered by proven guesthouse automation from The Browns portfolio_  
_Phase 15: Local demo hosting ready (Docker) · CoS approval required for public launch_
`
}
